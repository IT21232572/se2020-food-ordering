import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../api/client';

export default function HistoryScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const decodedToken: any = jwtDecode(token);
      const currentUserId = decodedToken.userId || decodedToken.id || decodedToken._id;

      // Make sure this endpoint matches your Node.js backend route for getting a user's orders.
      // It might be '/orders' or `/orders/user/${currentUserId}` depending on how you built the API.
      const response = await apiClient.get(`/orders/user/${currentUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOrders(response.data);
    } catch (error: any) {
      console.log('Order Fetch Error:', error?.response?.data || error.message);
      Alert.alert('Error', 'Could not load your order history.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.orderId}>Order ID: {item._id}</Text>
      <Text style={styles.status}>Status: {item.status || 'Pending'}</Text>
      <Text style={styles.date}>Date: {new Date(item.createdAt).toLocaleString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item: any) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No past orders found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, marginBottom: 12, borderRadius: 8, elevation: 2 },
  orderId: { fontSize: 14, color: '#555', marginBottom: 4 },
  status: { fontSize: 16, fontWeight: 'bold', color: '#28a745', marginBottom: 4 },
  date: { fontSize: 14, color: '#888' },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' }
});