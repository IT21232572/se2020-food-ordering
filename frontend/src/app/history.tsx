import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { Stack } from 'expo-router';
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

      const response = await apiClient.get(`/orders/user/${currentUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOrders(response.data);
    } catch (error) {
      console.log('Order Fetch Error:', error);
      Alert.alert('Error', 'Could not load your order history.');
    } finally {
      setLoading(false);
    }
  };

  // DELETE FUNCTION: Cancels the order
  const handleDelete = (orderId: string) => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await apiClient.delete(`/orders/${orderId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('Success', 'Order cancelled successfully.');
            fetchOrders(); // Refresh the list after deleting
          } catch (error) {
            Alert.alert('Error', 'Could not cancel the order.');
          }
        }
      }
    ]);
  };

  // UPDATE FUNCTION: Example updates the quantity by +1
  const handleUpdate = async (orderId: string, currentQty: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      // Adjust this payload based on what your backend updateOrder controller expects
      await apiClient.put(`/orders/${orderId}`, {
        quantity: currentQty + 1 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Order updated successfully.');
      fetchOrders(); // Refresh the list after updating
    } catch (error) {
      Alert.alert('Error', 'Could not update the order.');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.orderId}>Order ID: {item._id}</Text>
      {/* If your backend populates the food data, this will show the name. Otherwise, it shows the ID */}
      <Text style={styles.details}>Item: {item.menuItemId?.name || item.menuItemId}</Text>
      <Text style={styles.details}>Quantity: {item.quantity}</Text>
      <Text style={styles.status}>Status: {item.status || 'Pending'}</Text>
      <Text style={styles.date}>Date: {new Date(item.createdAt).toLocaleString()}</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.updateBtn} onPress={() => handleUpdate(item._id, item.quantity || 1)}>
          <Text style={styles.btnText}>Add +1 Qty</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
          <Text style={styles.btnText}>Cancel Order</Text>
        </TouchableOpacity>
      </View>
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
      {/* This fixes the title at the top of the screen */}
      <Stack.Screen options={{ title: 'My Orders' }} />
      
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
  orderId: { fontSize: 13, color: '#888', marginBottom: 8 },
  details: { fontSize: 16, color: '#333', marginBottom: 4 },
  status: { fontSize: 16, fontWeight: 'bold', color: '#28a745', marginBottom: 4 },
  date: { fontSize: 14, color: '#666', marginBottom: 12 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  updateBtn: { backgroundColor: '#007bff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  deleteBtn: { backgroundColor: '#dc3545', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' }
});