-- Creating the database
CREATE DATABASE ayurveda_app;

-- Connect to the database
\c ayurveda_app

-- Enable pgvector extension for full-text search
CREATE EXTENSION IF NOT EXISTS vector;

-- Creating users table
CREATE TABLE users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating health_profiles table
CREATE TABLE health_profiles (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    age INTEGER,
    gender VARCHAR(20),
    allergies TEXT,
    chronic_conditions TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating remedy_categories table
CREATE TABLE remedy_categories (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Creating books table
CREATE TABLE books (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100),
    publication_year INTEGER,
    content TEXT,
    content_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating remedies table
CREATE TABLE remedies (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    category_id BIGINT NOT NULL REFERENCES remedy_categories(id) ON DELETE RESTRICT,
    book_id BIGINT REFERENCES books(id) ON DELETE SET NULL,
    ailment VARCHAR(100) NOT NULL,
    remedy TEXT NOT NULL,
    dosage_instructions TEXT,
    contraindications TEXT,
    remedy_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', ailment || ' ' || remedy)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating query_history table
CREATE TABLE query_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remedy_id BIGINT REFERENCES remedies(id) ON DELETE SET NULL,
    book_id BIGINT REFERENCES books(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    query_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creating favorites table
CREATE TABLE favorites (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remedy_id BIGINT NOT NULL REFERENCES remedies(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO remedy_categories (name, description) VALUES
('Herbal', 'Herbal-based remedies using plants and natural ingredients'),
('Dietary', 'Diet-related remedies for health issues'),
('Lifestyle', 'Lifestyle changes to improve health');

INSERT INTO books (title, author, publication_year, content) VALUES
('Charaka Samhita', 'Agnivesha', 200, 'Ancient Ayurvedic text detailing remedies for various ailments, including ginger tea for headaches and turmeric for colds.'),
('Sushruta Samhita', 'Sushruta', 300, 'Comprehensive guide on surgery and herbal treatments, including fennel seeds for digestion.'),
('Ashtanga Hridayam', 'Vagbhata', 600, 'Text on Ayurvedic principles, recommending lifestyle changes for overall health.');

INSERT INTO remedies (category_id, book_id, ailment, remedy, dosage_instructions, contraindications) VALUES
(1, 1, 'headache', 'Drink ginger tea or apply a paste of sandalwood on the forehead.', 'Once or twice daily', 'Avoid ginger if allergic'),
(2, 1, 'cold', 'Take honey with warm water and a pinch of turmeric.', 'Once daily', 'Not for diabetic patients'),
(3, 2, 'indigestion', 'Chew fennel seeds or drink cumin water after meals.', 'After each meal', 'None');

-- Create indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_remedies_ailment ON remedies(ailment);
CREATE INDEX idx_remedies_vector ON remedies USING GIN(remedy_vector);
CREATE INDEX idx_books_vector ON books USING GIN(content_vector);
CREATE INDEX idx_query_history_user_id ON query_history(user_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);