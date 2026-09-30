import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

interface Order {
  _id: string;
  status: string;
  quantity: number;
  createdAt: string;
  userId: { name: string; email: string } | null;
  menuItemId: { name: string; price: number } | null;
}

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await apiClient.get('/orders/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      Alert.alert('Error', 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    
    try {
      const token = await AsyncStorage.getItem('token');
      await apiClient.put(
        `/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert('Success', `Order marked as ${newStatus}`);
      fetchOrders(); // Refresh the list
    } catch (error: any) {
      Alert.alert('Update Failed', error?.response?.data?.message || 'Check your connection.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Global Orders' }} />
      
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isCompleted = item.status === 'Completed';
          const foodName = item.menuItemId?.name || 'Deleted Item';
          const price = item.menuItemId?.price || 0;
          const customerName = item.userId?.name || 'Unknown User';

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.customerName}>Customer: {customerName}</Text>
                <Text style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusPending]}>
                  {item.status || 'Pending'}
                </Text>
              </View>
              
              <Text style={styles.foodText}>{item.quantity}x {foodName}</Text>
              <Text style={styles.priceText}>Total: Rs {price * item.quantity}</Text>
              <Text style={styles.dateText}>Ordered: {new Date(item.createdAt).toLocaleString()}</Text>
              
              <TouchableOpacity 
                style={[styles.btn, isCompleted ? styles.btnUndo : styles.btnComplete]} 
                onPress={() => handleUpdateStatus(item._id, item.status || 'Pending')}
              >
                <Text style={styles.btnText}>
                  {isCompleted ? 'Undo (Mark Pending)' : 'Mark as Completed'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, fontWeight: 'bold', overflow: 'hidden' },
  statusPending: { backgroundColor: '#ffeeba', color: '#856404' },
  statusCompleted: { backgroundColor: '#d4edda', color: '#155724' },
  foodText: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  priceText: { fontSize: 15, color: '#555', marginBottom: 4 },
  dateText: { fontSize: 12, color: '#888', marginBottom: 12 },
  btn: { padding: 12, borderRadius: 6, alignItems: 'center' },
  btnComplete: { backgroundColor: '#28a745' },
  btnUndo: { backgroundColor: '#6c757d' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});