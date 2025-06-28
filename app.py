from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from sqlalchemy.sql import text
from sqlalchemy.dialects.postgresql import TSVECTOR
from openai import OpenAI

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:Welcome@01@localhost:5432/ayurveda_app'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
SECRET_KEY = 'your-secret-key'  # Replace with a secure key in production
OPENAI_API_KEY = 'your-openai-api-key'  # Replace with your Open AI API key

# Initialize Open AI client
openai_client = OpenAI(api_key=OPENAI_API_KEY)

db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.BigInteger, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    health_profile = db.relationship('HealthProfile', backref='user', uselist=False)
    queries = db.relationship('QueryHistory', backref='user')
    favorites = db.relationship('Favorite', backref='user')

class HealthProfile(db.Model):
    __tablename__ = 'health_profiles'
    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    allergies = db.Column(db.Text)
    chronic_conditions = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class RemedyCategory(db.Model):
    __tablename__ = 'remedy_categories'
    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    remedies = db.relationship('Remedy', backref='category')

class Book(db.Model):
    __tablename__ = 'books'
    id = db.Column(db.BigInteger, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100))
    publication_year = db.Column(db.Integer)
    content = db.Column(db.Text)
    content_vector = db.Column(TSVECTOR, server_default=text("to_tsvector('english', content)"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    remedies = db.relationship('Remedy', backref='book')

class Remedy(db.Model):
    __tablename__ = 'remedies'
    id = db.Column(db.BigInteger, primary_key=True)
    category_id = db.Column(db.BigInteger, db.ForeignKey('remedy_categories.id'), nullable=False)
    book_id = db.Column(db.BigInteger, db.ForeignKey('books.id'))
    ailment = db.Column(db.String(100), nullable=False)
    remedy = db.Column(db.Text, nullable=False)
    dosage_instructions = db.Column(db.Text)
    contraindications = db.Column(db.Text)
    remedy_vector = db.Column(TSVECTOR, server_default=text("to_tsvector('english', ailment || ' ' || remedy)"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class QueryHistory(db.Model):
    __tablename__ = 'query_history'
    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    remedy_id = db.Column(db.BigInteger, db.ForeignKey('remedies.id'))
    book_id = db.Column(db.BigInteger, db.ForeignKey('books.id'))
    query_text = db.Column(db.Text, nullable=False)
    query_timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Favorite(db.Model):
    __tablename__ = 'favorites'
    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    remedy_id = db.Column(db.BigInteger, db.ForeignKey('remedies.id'), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

# Summarize text using Open AI
def summarize_text(text):
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes Ayurvedic remedy information concisely in 1-2 sentences, using simple and clear language."},
                {"role": "user", "content": f"Summarize the following Ayurvedic remedy or text in 1-2 sentences: {text}"}
            ],
            max_tokens=50,
            temperature=0.5
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Open AI summarization error: {e}")
        return text  # Fallback to original text if summarization fails

# Convert text to speech using Open AI
def text_to_speech(text):
    try:
        response = openai_client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text
        )
        audio_file = 'static/response.mp3'
        response.stream_to_file(audio_file)
        return audio_file
    except Exception as e:
        print(f"Open AI text-to-speech error: {e}")
        return None  # Return None if audio generation fails

# Register a new user
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    
    if not username or not password or not email:
        return jsonify({'error': 'Missing required fields'}), 400
    
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    try:
        user = User(username=username, email=email, password=hashed_password)
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except:
        db.session.rollback()
        return jsonify({'error': 'Username or email already exists'}), 400

# Login user and return JWT
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    if user and bcrypt.checkpw(password.encode('utf-8'), user.password):
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        return jsonify({'token': token}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

# Middleware to verify JWT
def verify_token():
    token = request.headers.get('Authorization')
    if not token:
        return None
    try:
        token = token.split("Bearer ")[1] if token.startswith("Bearer ") else token
        data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return data['user_id']
    except:
        return None

# Query remedy with full-text search and Open AI summarization
@app.route('/api/query', methods=['POST'])
def query_remedy():
    user_id = verify_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    user_input = data.get('query', '').lower()
    
    # Full-text search on remedies
    remedy = db.session.execute(
        text("""
            SELECT id, category_id, book_id, ailment, remedy, dosage_instructions, contraindications
            FROM remedies
            WHERE remedy_vector @@ to_tsquery('english', :query)
            ORDER BY ts_rank(remedy_vector, to_tsquery('english', :query)) DESC
            LIMIT 1
        """),
        {'query': user_input}
    ).fetchone()
    
    if remedy:
        category = RemedyCategory.query.get(remedy.category_id)
        book = Book.query.get(remedy.book_id) if remedy.book_id else None
        # Summarize remedy
        full_text = f"{remedy.remedy} Dosage: {remedy.dosage_instructions or 'Not specified'}. Contraindications: {remedy.contraindications or 'None'}."
        summary = summarize_text(full_text)
        # Generate audio for summary
        audio_file = text_to_speech(summary) if summary else None
        # Log query in history
        query = QueryHistory(
            user_id=user_id,
            remedy_id=remedy.id,
            book_id=remedy.book_id,
            query_text=user_input
        )
        db.session.add(query)
        db.session.commit()
        return jsonify({
            'remedy_id': remedy.id,
            'summary': summary,
            'remedy': remedy.remedy,
            'category': category.name,
            'dosage': remedy.dosage_instructions,
            'contraindications': remedy.contraindications,
            'book_title': book.title if book else None,
            'audio': f'http://localhost:5000/{audio_file}' if audio_file else None
        }), 200
    
    # Fallback to book content search
    book = db.session.execute(
        text("""
            SELECT id, title, content
            FROM books
            WHERE content_vector @@ to_tsquery('english', :query)
            ORDER BY ts_rank(content_vector, to_tsquery('english', :query)) DESC
            LIMIT 1
        """),
        {'query': user_input}
    ).fetchone()
    
    if book:
        # Summarize book content
        summary = summarize_text(book.content[:500])  # Limit to 500 chars for brevity
        # Generate audio for summary
        audio_file = text_to_speech(summary) if summary else None
        # Log query in history
        query = QueryHistory(user_id=user_id, book_id=book.id, query_text=user_input)
        db.session.add(query)
        db.session.commit()
        return jsonify({
            'summary': summary,
            'remedy': book.content[:500],
            'book_title': book.title,
            'audio': f'http://localhost:5000/{audio_file}' if audio_file else None
        }), 200
    
    return jsonify({'error': 'No remedy or book content found'}), 404

# Get user query history
@app.route('/api/query_history', methods=['GET'])
def get_query_history():
    user_id = verify_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    queries = QueryHistory.query.filter_by(user_id=user_id).order_by(QueryHistory.query_timestamp.desc()).all()
    result = [{
        'id': q.id,
        'query_text': q.query_text,
        'query_timestamp': q.query_timestamp.isoformat(),
        'remedy': q.remedy.remedy if q.remedy else None,
        'book_title': q.book.title if q.book else None
    } for q in queries]
    return jsonify(result), 200

# Add remedy to favorites
@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    user_id = verify_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    remedy_id = data.get('remedy_id')
    favorite = Favorite(user_id=user_id, remedy_id=remedy_id)
    try:
        db.session.add(favorite)
        db.session.commit()
        return jsonify({'message': 'Added to favorites'}), 201
    except:
        db.session.rollback()
        return jsonify({'error': 'Failed to add to favorites'}), 400

# Get user favorites
@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    user_id = verify_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    favorites = Favorite.query.filter_by(user_id=user_id).all()
    result = [{
        'remedy_id': f.remedy_id,
        'remedy': f.remedy.remedy,
        'ailment': f.remedy.ailment,
        'book_title': f.remedy.book.title if f.remedy.book else None
    } for f in favorites]
    return jsonify(result), 200

if __name__ == '__main__':
    if not os.path.exists('static'):
        os.makedirs('static')
    app.run(debug=True)