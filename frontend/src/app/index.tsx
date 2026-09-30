import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import apiClient from '../api/client';
import { jwtDecode } from 'jwt-decode';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');

  const handleLogin = async () => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const token = response.data.token;
      
      // Save JWT token
      await AsyncStorage.setItem('token', token);
      
      // Decode the token to check the role
      const decodedToken: any = jwtDecode(token);
      console.log("Decoded Token Data:", decodedToken);
      
      // Route based on the role
      if (decodedToken.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/menu');
      }
      
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error?.response?.data?.message || 'Check your credentials or backend connection.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food Ordering App</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />

      <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkContainer}>
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 16, borderRadius: 8 },
  linkContainer: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#007bff', fontWeight: 'bold', fontSize: 16 }
});