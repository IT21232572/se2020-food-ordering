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
  
  // Check if the order is completed
  const isCompleted = item.status === 'Completed';

  return (
    <View style={styles.card}>
      <Text style={styles.orderId}>Order ID: {item._id}</Text>
      <Text style={styles.details}>Item: {itemName}</Text>
      
      {/* Edit Mode Quantity Selector - only show if editing AND not completed */}
      {isEditing && !isCompleted ? (
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

      <Text style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusPending]}>
        {item.status || 'Pending'}
      </Text>
      <Text style={styles.date}>Date: {new Date(item.createdAt).toLocaleString()}</Text>

      {/* Conditionally hide buttons if the order is completed */}
      {!isCompleted ? (
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
                <Text style={styles.editBtnText}>Edit Order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item._id)}>
                <Text style={styles.deleteBtnText}>Cancel Order</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <Text style={styles.lockedText}>This order is completed and cannot be modified.</Text>
      )}
    </View>
  );
};

export default function HistoryScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');

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

  // Filter the orders based on the selected status
  const filteredOrders = orders.filter((order: any) => {
    if (statusFilter === 'All') return true;
    const currentStatus = order.status || 'Pending';
    return currentStatus === statusFilter;
  });

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'My orders',
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
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }) => <OrderCard item={item} onUpdate={handleUpdate} onDelete={handleDelete} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No {statusFilter.toLowerCase()} orders found.</Text>}
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
  card: { backgroundColor: '#F5EFE6', padding: 16, marginBottom: 12, borderRadius: 8, elevation: 2 },
  
  // Text Colors
  orderId: { fontSize: 13, color: '#7A5C4A', marginBottom: 8 },
  details: { fontSize: 16, color: '#4A3022', marginBottom: 4 },
  status: { fontSize: 16, fontWeight: 'bold', color: '#4A3022', marginBottom: 4 },
  date: { fontSize: 14, color: '#7A5C4A', marginBottom: 12 },
  
  // Quantity Selector
  editRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  qtyBtn: { backgroundColor: '#dccfc1', width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginHorizontal: 10 },
  qtyText: { fontSize: 16, fontWeight: 'bold', color: '#4A3022' },
  qtyLabel: { fontSize: 16, fontWeight: 'bold', color: '#4A3022' },
  
  // List Button Colors
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  updateBtn: { backgroundColor: '#4A3022', paddingVertical: 8, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  deleteBtn: { backgroundColor: '#C8945A', paddingVertical: 8, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  saveBtn: { backgroundColor: '#4A3022', paddingVertical: 8, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  cancelEditBtn: { backgroundColor: '#C8945A', paddingVertical: 8, borderRadius: 6, flex: 0.48, alignItems: 'center' },
  
  // Button Texts
  btnText: { color: '#fff', fontWeight: 'bold' }, // Fallback
  editBtnText: { color: '#FFF', fontWeight: 'bold' },
  deleteBtnText: { color: '#4A3022', fontWeight: 'bold' },
  
  // Empty State & Locked Text
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#4A3022' },
  lockedText: { color: '#deaf79', fontSize: 14, fontStyle: 'italic', marginTop: 8 },
  // Status Badges matching the mockup
  statusBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, fontWeight: 'bold', overflow: 'hidden', marginTop: 4, marginBottom: 8, fontSize: 14 },
  statusPending: { backgroundColor: '#C8945A', color: '#4A3022' },
  statusCompleted: { backgroundColor: '#4A3022', color: '#FFF' },
});