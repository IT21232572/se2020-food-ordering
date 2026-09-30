import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Owner Dashboard',
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
              <Text style={{ fontWeight: 'bold', color: '#dc3545' }}>Logout</Text>
            </TouchableOpacity>
          )
        }} 
      />
      <Text style={styles.title}>Welcome to the Admin Panel</Text>
      <Text style={styles.subtitle}>Manage Menu & View All Orders here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f4' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666' }
});