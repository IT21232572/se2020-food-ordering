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
  const [statusFilter, setStatusFilter] = useState<string>('All');

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
    } catch (error: any) {
      console.log("=== FETCH ORDERS ERROR ===", error?.response?.data || error.message);
      Alert.alert('Error', error?.response?.data?.message || 'Could not load orders.');
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
      fetchOrders(); 
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

  // Filter the orders before passing them to the FlatList
  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'All') return true;
    const currentStatus = order.status || 'Pending';
    return currentStatus === statusFilter;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Global Orders' }} />
      
      {/* Filter Bar */}
      <View style={styles.filterWrapper}>
        {['All', 'Pending', 'Completed'].map(status => (
          <TouchableOpacity 
            key={status} 
            style={[styles.filterBtn, statusFilter === status && styles.filterBtnActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No {statusFilter.toLowerCase()} orders found.</Text>}
        renderItem={({ item }) => {
          const isCompleted = item.status === 'Completed';
          const foodName = item.menuItemId?.name || 'Deleted Item';
          const price = item.menuItemId?.price || 0;
          const customerName = item.userId?.name || 'Unknown User';

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                {/* Wrap the Customer Name and Order ID together */}
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>Customer: {customerName}</Text>
                  <Text style={styles.orderId}>Order ID: {item._id}</Text>
                </View>
                
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
  filterWrapper: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, elevation: 2, justifyContent: 'space-around' },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#e0e0e0' },
  filterBtnActive: { backgroundColor: '#007bff' },
  filterText: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  customerInfo: { flex: 1, marginRight: 10 },
  orderId: { fontSize: 12, color: '#888', marginTop: 2 },
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