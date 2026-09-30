import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { Stack } from 'expo-router';
import apiClient from '../api/client';

// Dedicated component for each order so they can manage their own "Edit" state
const OrderCard = ({ item, onUpdate, onDelete }: { item: any, onUpdate: any, onDelete: any }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editQty, setEditQty] = useState(item.quantity);

  // Safely extract the populated name, falling back to ID if it fails
  const itemName = item.menuItemId?.name || item.menuItemId;

  return (
    <View style={styles.card}>
      <Text style={styles.orderId}>Order ID: {item._id}</Text>
      <Text style={styles.details}>Item: {itemName}</Text>
      
      {/* Edit Mode Quantity Selector */}
      {isEditing ? (
        <View style={styles.editRow}>
          <Text style={styles.details}>Quantity: </Text>
          <TouchableOpacity onPress={() => editQty > 1 && setEditQty(editQty - 1)} style={styles.qtyBtn}>
            <Text style={styles.qtyText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyLabel}>{editQty}</Text>
          <TouchableOpacity onPress={() => setEditQty(editQty + 1)} style={styles.qtyBtn}>
            <Text style={styles.qtyText}>+</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.details}>Quantity: {item.quantity}</Text>
      )}

      <Text style={styles.status}>Status: {item.status || 'Pending'}</Text>
      <Text style={styles.date}>Date: {new Date(item.createdAt).toLocaleString()}</Text>

      <View style={styles.buttonRow}>
        {isEditing ? (
          <>
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={() => { 
                onUpdate(item._id, editQty); 
                setIsEditing(false); 
              }}
            >
              <Text style={styles.btnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setIsEditing(false)}>
              <Text style={styles.btnText}>Discard</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.updateBtn} onPress={() => setIsEditing(true)}>
              <Text style={styles.btnText}>Edit Order</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item._id)}>
              <Text style={styles.btnText}>Cancel Order</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

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
      Alert.alert('Error', 'Could not load your order history.');
    } finally {
      setLoading(false);
    }
  };

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
            fetchOrders(); 
          } catch (error) {
            Alert.alert('Error', 'Could not cancel the order.');
          }
        }
      }
    ]);
  };

  const handleUpdate = async (orderId: string, newQuantity: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await apiClient.put(`/orders/${orderId}`, {
        quantity: newQuantity 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders(); 
    } catch (error) {
      Alert.alert('Error', 'Could not update the order.');
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
      <Stack.Screen options={{ title: 'My Orders' }} />
      <FlatList
        data={orders}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }) => <OrderCard item={item} onUpdate={handleUpdate} onDelete={handleDelete} />}
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
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  qtyBtn: { backgroundColor: '#ddd', width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginHorizontal: 10 },
  qtyText: { fontSize: 16, fontWeight: 'bold' },
  qtyLabel: { fontSize: 16, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  updateBtn: { backgroundColor: '#007bff', paddingVertical: 8, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  deleteBtn: { backgroundColor: '#dc3545', paddingVertical: 8, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  saveBtn: { backgroundColor: '#28a745', paddingVertical: 8, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  cancelEditBtn: { backgroundColor: '#6c757d', paddingVertical: 8, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' }
});