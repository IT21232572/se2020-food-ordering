import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { Stack } from 'expo-router';
import apiClient from '../api/client';

// Dedicated component for each grouped order
const OrderCard = ({ item, onDelete }: { item: any, onDelete: any }) => {
  const isCompleted = item.status === 'Completed';

  return (
    <View style={styles.card}>
      <Text style={styles.orderId}>Order ID: {item._id}</Text>
      <Text style={styles.date}>Date: {new Date(item.createdAt).toLocaleString()}</Text>
      
      {/* Loop through the items array for this specific order */}
      <View style={styles.itemsContainer}>
        {item.items && item.items.map((orderItem: any, index: number) => {
          const itemName = orderItem.menuItemId?.name || 'Unknown Item';
          return (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName}>• {itemName}</Text>
              <Text style={styles.itemQty}>x{orderItem.quantity}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.totalPrice}>Total: Rs {item.totalPrice}</Text>

      <Text style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusPending]}>
        {item.status || 'Pending'}
      </Text>

      {!isCompleted ? (
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item._id)}>
          <Text style={styles.deleteBtnText}>Cancel Entire Order</Text>
        </TouchableOpacity>
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

  // Modal & Toast States
  const [modalVisible, setModalVisible] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const showToast = (title: string, message: string, type: 'success' | 'error') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 3500);
  };

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
      showToast('Error', 'Could not load your order history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initiateDelete = (orderId: string) => {
    setOrderToDelete(orderId);
    setModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    setModalVisible(false);
    
    try {
      const token = await AsyncStorage.getItem('token');
      await apiClient.delete(`/orders/${orderToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Order cancelled', 'Your order has been successfully cancelled.', 'success');
      fetchOrders(); 
    } catch (error) {
      showToast('Error', 'Could not cancel the order.', 'error');
    } finally {
      setOrderToDelete(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A3022" />
      </View>
    );
  }

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
      
      {toast && (
        <View style={[styles.toastContainer, toast.type === 'success' ? styles.alertSuccessBox : styles.alertErrorBox]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toastTitle, toast.type === 'success' ? styles.alertSuccessTitle : styles.alertErrorTitle]}>{toast.title}</Text>
            <Text style={[styles.toastMessage, toast.type === 'success' ? styles.alertSuccessText : styles.alertErrorText]}>{toast.message}</Text>
          </View>
          {toast.type === 'error' && (
            <TouchableOpacity onPress={() => setToast(null)}>
              <Text style={styles.alertErrorActionText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
        renderItem={({ item }) => <OrderCard item={item} onDelete={initiateDelete} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No {statusFilter.toLowerCase()} orders found.</Text>}
      />

      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.alertOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmHeader}>
              <View style={styles.iconCircle}><Text style={styles.iconText}>⚠️</Text></View>
              <View>
                <Text style={styles.confirmTitle}>Cancel order</Text>
                <Text style={styles.confirmSubtitle}>Are you sure you want to cancel?</Text>
              </View>
            </View>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.confirmCancelText}>No, keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOkBtn} onPress={confirmDelete}>
                <Text style={styles.confirmOkText}>Yes, cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8D8C8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  filterWrapper: { flexDirection: 'row', backgroundColor: '#E8D8C8', padding: 12, elevation: 0, justifyContent: 'space-around', marginBottom: 8 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#AFA49B' },
  filterBtnActive: { backgroundColor: '#C8945A' },
  filterText: { fontSize: 14, fontWeight: 'bold', color: '#4A3022' },
  filterTextActive: { color: '#4A3022' },
  
  list: { padding: 16 },
  card: { backgroundColor: '#F5EFE6', padding: 16, marginBottom: 12, borderRadius: 8, elevation: 2 },
  
  orderId: { fontSize: 13, color: '#7A5C4A', marginBottom: 2 },
  date: { fontSize: 13, color: '#7A5C4A', marginBottom: 12 },
  
  itemsContainer: { backgroundColor: '#E8D8C8', padding: 10, borderRadius: 6, marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 15, color: '#4A3022', flex: 1 },
  itemQty: { fontSize: 15, color: '#4A3022', fontWeight: 'bold' },
  
  totalPrice: { fontSize: 16, fontWeight: 'bold', color: '#4A3022', marginBottom: 10, textAlign: 'right' },
  
  deleteBtn: { backgroundColor: '#C8945A', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  deleteBtnText: { color: '#4A3022', fontWeight: 'bold', fontSize: 15 },
  
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#4A3022' },
  lockedText: { color: '#deaf79', fontSize: 14, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
  
  statusBadge: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, fontWeight: 'bold', overflow: 'hidden', fontSize: 14 },
  statusPending: { backgroundColor: '#C8945A', color: '#4A3022' },
  statusCompleted: { backgroundColor: '#4A3022', color: '#FFF' },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: { width: '100%', maxWidth: 340, backgroundColor: '#F5EFE6', borderRadius: 16, padding: 20, elevation: 5 },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C8945A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconText: { fontSize: 18, color: '#4A3022' },
  confirmTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3022' },
  confirmSubtitle: { fontSize: 14, color: '#7A5C4A', marginTop: 2 },
  confirmBtnRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  confirmCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#dccfc1', alignItems: 'center' },
  confirmCancelText: { color: '#7A5C4A', fontWeight: 'bold', fontSize: 15 },
  confirmOkBtn: { flex: 1, backgroundColor: '#4A3022', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  confirmOkText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  toastContainer: { position: 'absolute', top: 20, left: 16, right: 16, padding: 16, borderRadius: 8, zIndex: 1000, flexDirection: 'row', alignItems: 'center', elevation: 6 },
  toastTitle: { fontWeight: 'bold', fontSize: 15 },
  toastMessage: { fontSize: 13, marginTop: 2 },
  alertSuccessBox: { backgroundColor: '#F5EFE6' },
  alertSuccessTitle: { color: '#4A3022' },
  alertSuccessText: { color: '#7A5C4A' },
  alertErrorBox: { backgroundColor: '#4A3022' },
  alertErrorTitle: { color: '#F5EFE6' },
  alertErrorText: { color: '#dccfc1' },
  alertErrorActionText: { color: '#C8945A', fontWeight: 'bold', fontSize: 14, marginLeft: 16 }
});