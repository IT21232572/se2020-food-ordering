import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import apiClient from '../api/client';
import { jwtDecode } from 'jwt-decode';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const token = response.data.token;
      
      await AsyncStorage.setItem('token', token);
      
      const decodedToken: any = jwtDecode(token);
      
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
      {/* Logo added above the title */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
      </View>

      <Text style={styles.title}>Food Ordering App</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
        <Text style={styles.loginBtnText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/register')} style={styles.linkContainer}>
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#E8D8C8' },
  logoContainer: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 100, height: 100, borderRadius: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#4A3022' },
  input: { borderWidth: 1, borderColor: '#dccfc1', padding: 12, marginBottom: 16, borderRadius: 8, backgroundColor: '#F5EFE6', color: '#4A3022' },
  loginBtn: { backgroundColor: '#4A3022', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  loginBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  linkContainer: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#C8945A', fontWeight: 'bold', fontSize: 15 }
});