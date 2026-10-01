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
      <Stack.Screen 
        options={{ 
          title: 'Global Orders',
          headerStyle: { backgroundColor: '#4A3022' },
          headerTintColor: '#FFF'
        }} 
      />
      
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
                {/* Add the dynamic text styles here */}
                <Text style={[styles.btnText, isCompleted ? styles.btnTextUndo : styles.btnTextComplete]}>
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
  // Backgrounds matching the mockup
  container: { flex: 1, backgroundColor: '#E8D8C8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Filter Bar
  filterWrapper: { flexDirection: 'row', backgroundColor: '#E8D8C8', padding: 12, elevation: 0, justifyContent: 'space-around', marginBottom: 8 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#AFA49B' },
  filterBtnActive: { backgroundColor: '#C8945A' },
  filterText: { fontSize: 14, fontWeight: 'bold', color: '#4A3022' },
  filterTextActive: { color: '#4A3022' },
  
  // List & Cards
  list: { padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#4A3022' },
  card: { backgroundColor: '#F5EFE6', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
  customerInfo: { flex: 1, marginRight: 10 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#4A3022' },
  orderId: { fontSize: 12, color: '#7A5C4A', marginTop: 2 },
  
  // Status Badges (Pill Shape)
  statusBadge: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, fontWeight: 'bold', overflow: 'hidden', fontSize: 13, textAlign: 'center' },
  statusPending: { backgroundColor: '#C8945A', color: '#4A3022' },
  statusCompleted: { backgroundColor: '#4A3022', color: '#FFF' },
  
  // Text Colors
  foodText: { fontSize: 18, fontWeight: 'bold', color: '#4A3022', marginBottom: 4 },
  priceText: { fontSize: 15, color: '#7A5C4A', marginBottom: 4 },
  dateText: { fontSize: 12, color: '#7A5C4A', marginBottom: 12 },
  
  // Action Buttons
  btn: { padding: 12, borderRadius: 6, alignItems: 'center' },
  btnComplete: { backgroundColor: '#4A3022' }, // Dark brown for primary action
  btnUndo: { backgroundColor: '#C8945A' }, // Muted gold for undo
  btnText: { fontWeight: 'bold', fontSize: 14 },
  btnTextComplete: { color: '#FFF' },
  btnTextUndo: { color: '#4A3022' }
});