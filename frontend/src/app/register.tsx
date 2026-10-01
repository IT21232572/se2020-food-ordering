import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import apiClient from '../api/client';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      await apiClient.post('/auth/register', { name, email, password });
      Alert.alert('Success', 'Account created successfully! Please log in.');
      router.back();
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error?.response?.data?.message || 'Could not create account.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Create Account',
          headerStyle: { backgroundColor: '#4A3022' },
          headerTintColor: '#FFF',
          headerShown: true,
        }} 
      />

      {/* Logo added above the title */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
      </View>

      <Text style={styles.title}>Sign Up</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
        <Text style={styles.registerBtnText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#E8D8C8' },
  logoContainer: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 90, height: 90, borderRadius: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#4A3022' },
  input: { borderWidth: 1, borderColor: '#dccfc1', padding: 12, marginBottom: 16, borderRadius: 8, backgroundColor: '#F5EFE6', color: '#4A3022' },
  registerBtn: { backgroundColor: '#4A3022', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  registerBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});