import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Tts from 'react-native-tts';
import { Audio } from 'expo-av';
import axios from 'axios';
import tw from 'twrnc';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Ayurveda Assistant - Login' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
        <Stack.Screen name="Main" component={MainScreen} options={{ title: 'Ayurveda Assistant' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Query History' }} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const login = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/login', { username, password });
      await AsyncStorage.setItem('token', response.data.token);
      navigation.replace('Main');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <View style={tw`flex-1 justify-center p-6 bg-gray-100`}>
      <Text style={tw`text-2xl font-bold mb-6 text-center text-green-700`}>Login</Text>
      <TextInput
        style={tw`border border-gray-300 p-3 mb-4 rounded-lg bg-white`}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={tw`border border-gray-300 p-3 mb-4 rounded-lg bg-white`}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={tw`text-red-500 mb-4`}>{error}</Text> : null}
      <TouchableOpacity style={tw`bg-green-500 p-3 rounded-lg mb-4`} onPress={login}>
        <Text style={tw`text-white text-center font-semibold`}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={tw`text-blue-500 text-center`}>Need an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const register = async () => {
    try {
      await axios.post('http://localhost:5000/api/register', { username, email, password });
      navigation.replace('Login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <View style={tw`flex-1 justify-center p-6 bg-gray-100`}>
      <Text style={tw`text-2xl font-bold mb-6 text-center text-green-700`}>Register</Text>
      <TextInput
        style={tw`border border-gray-300 p-3 mb-4 rounded-lg bg-white`}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={tw`border border-gray-300 p-3 mb-4 rounded-lg bg-white`}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={tw`border border-gray-300 p-3 mb-4 rounded-lg bg-white`}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={tw`text-red-500 mb-4`}>{error}</Text> : null}
      <TouchableOpacity style={tw`bg-green-500 p-3 rounded-lg mb-4`} onPress={register}>
        <Text style={tw`text-white text-center font-semibold`}>Register</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={tw`text-blue-500 text-center`}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const MainScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const startListening = async () => {
    setIsListening(true);
    // Placeholder: Speech-to-text requires a third-party service (e.g., Google Cloud Speech-to-Text)
    alert('Speech-to-text not implemented. Please type the ailment.');
    setIsListening(false);
  };

  const fetchRemedy = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/query',
        { query },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(response.data);
      if (response.data.audio) {
        Tts.speak(response.data.summary);
        const { sound } = await Audio.Sound.createAsync({ uri: response.data.audio });
        await sound.playAsync();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch remedy');
    } finally {
      setIsLoading(false);
    }
  };

  const addToFavorites = async () => {
    if (!result?.remedy_id) return;
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/favorites',
        { remedy_id: result.remedy_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Added to favorites');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add to favorites');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Login');
  };

  return (
    <View style={tw`flex-1 p-6 bg-gray-100`}>
      <Text style={tw`text-2xl font-bold mb-4 text-center text-green-700`}>Ayurveda Assistant</Text  <TouchableOpacity
        style={tw`bg-blue-500 p-3 rounded-lg mb-4 ${isListening ? 'opacity-50' : ''}`}
        onPress={startListening}
        disabled={isListening}
      >
        <Text style={tw`text-white text-center font-semibold`}>{isListening ? 'Listening...' : 'Speak Ailment'}</Text>
      </TouchableOpacity>
      <TextInput
        style={tw`border border-gray-300 p-3 mb-4 rounded-lg bg-white`}
        placeholder="Or type ailment (e.g., headache)"
        value={query}
        onChangeText={setQuery}
      />
      <TouchableOpacity style={tw`bg-green-500 p-3 rounded-lg mb-4`} onPress={fetchRemedy} disabled={isLoading}>
        <Text style={tw`text-white text-center font-semibold`}>{isLoading ? 'Loading...' : 'Get Remedy'}</Text>
      </TouchableOpacity>
      {error ? <Text style={tw`text-red-500 mb-4`}>{error}</Text> : null}
      {result && (
        <View style={tw`bg-white p-4 rounded-lg mb-4 shadow`}>
          <Text style={tw`text-lg font-semibold text-green-700`}>Summary:</Text>
          <Text style={tw`mb-2`}>{result.summary}</Text>
          {result.remedy && (
            <>
              <Text style={tw`text-lg font-semibold text-green-700`}>Full Remedy:</Text>
              <Text style={tw`mb-2`}>{result.remedy}</Text>
            </>
          )}
          {result.category && <Text style={tw`mb-2`}><Text style={tw`font-semibold`}>Category:</Text> {result.category}</Text>}
          {result.dosage && <Text style={tw`mb-2`}><Text style={tw`font-semibold`}>Dosage:</Text> {result.dosage}</Text>}
          {result.contraindications && (
            <Text style={tw`mb-2`}><Text style={tw`font-semibold`}>Contraindications:</Text> {result.contraindications}</Text>
          )}
          {result.book_title && (
            <Text style={tw`mb-2`}><Text style={tw`font-semibold`}>Source:</Text> {result.book_title}</Text>
          )}
          {result.remedy_id && (
            <TouchableOpacity style={tw`bg-yellow-500 p-2 rounded-lg mt-2`} onPress={addToFavorites}>
              <Text style={tw`text-white text-center font-semibold`}>Add to Favorites</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={tw`flex-row justify-between`}>
        <TouchableOpacity style={tw`bg-blue-500 p-3 rounded-lg`} onPress={() => navigation.navigate('History')}>
          <Text style={tw`text-white text-center font-semibold`}>View History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={tw`bg-blue-500 p-3 rounded-lg`} onPress={() => navigation.navigate('Favorites')}>
          <Text style={tw`text-white text-center font-semibold`}>View Favorites</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={tw`bg-red-500 p-3 rounded-lg mt-4`} onPress={logout}>
        <Text style={tw`text-white text-center font-semibold`}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const HistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/query_history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(response.data);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to fetch history');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const renderItem = ({ item }) => (
    <View style={tw`bg-white p-4 rounded-lg mb-2 shadow`}>
      <Text style={tw`font-semibold`}>Query: {item.query_text}</Text>
      <Text style={tw`text-gray-600`}>Time: {new Date(item.query_timestamp).toLocaleString()}</Text>
      {item.remedy && <Text style={tw`mt-1`}>Remedy: {item.remedy}</Text>}
      {item.book_title && <Text style={tw`mt-1`}>Source: {item.book_title}</Text>}
    </View>
  );

  return (
    <View style={tw`flex-1 p-6 bg-gray-100`}>
      <Text style={tw`text-2xl font-bold mb-4 text-center text-green-700`}>Query History</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#15803d" />
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={tw`text-center text-gray-500`}>No history found</Text>}
        />
      )}
    </View>
  );
};

const FavoritesScreen = () => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFavorites = async () => {
      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(response.data);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to fetch favorites');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  const renderItem = ({ item }) => (
    <View style={tw`bg-white p-4 rounded-lg mb-2 shadow`}>
      <Text style={tw`font-semibold`}>Ailment: {item.ailment}</Text>
      <Text style={tw`mt-1`}>Remedy: {item.remedy}</Text>
      {item.book_title && <Text style={tw`mt-1`}>Source: {item.book_title}</Text>}
    </View>
  );

  return (
    <View style={tw`flex-1 p-6 bg-gray-100`}>
      <Text style={tw`text-2xl font-bold mb-4 text-center text-green-700`}>Favorites</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#15803d" />
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.remedy_id.toString()}
          ListEmptyComponent={<Text style={tw`text-center text-gray-500`}>No favorites found</Text>}
        />
      )}
    </View>
  );
};

export default App;