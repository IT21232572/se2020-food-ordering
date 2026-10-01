import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

interface Order {
  _id: string;
  status: string;
  totalPrice: number; // Added new totalPrice field
  createdAt: string;
  userId: { name: string; email: string } | null;
  items: Array<{      // Updated to handle the array of items
    menuItemId: { name: string; price: number } | null;
    quantity: number;
  }>;
}

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const [modalVisible, setModalVisible] = useState(false);
  const [orderToComplete, setOrderToComplete] = useState<string | null>(null);
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
      // FIXED: Changed from '/orders/all' to '/orders' to match the updated backend route
      const response = await apiClient.get('/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error: any) {
      console.log("=== FETCH ORDERS ERROR ===", error?.response?.data || error.message);
      showToast('Error', error?.response?.data?.message || 'Could not load orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initiateCompleteOrder = (orderId: string) => {
    setOrderToComplete(orderId);
    setModalVisible(true);
  };

  const confirmCompleteOrder = async () => {
    if (!orderToComplete) return;
    setModalVisible(false);

    try {
      const token = await AsyncStorage.getItem('token');
      await apiClient.put(
        `/orders/${orderToComplete}/status`,
        { status: 'Completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showToast('Success', 'Order marked as Completed', 'success');
      fetchOrders(); 
    } catch (error: any) {
      showToast('Update Failed', error?.response?.data?.message || 'Check your connection.', 'error');
    } finally {
      setOrderToComplete(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A3022" />
      </View>
    );
  }

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
          headerTintColor: '#FFF',
          headerShown: true,
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
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No {statusFilter.toLowerCase()} orders found.</Text>}
        renderItem={({ item }) => {
          const isCompleted = item.status === 'Completed';
          const customerName = item.userId?.name || 'Unknown User';

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>Customer: {customerName}</Text>
                  <Text style={styles.orderId}>Order ID: {item._id}</Text>
                </View>
                
                <Text style={[styles.statusBadge, isCompleted ? styles.statusCompleted : styles.statusPending]}>
                  {item.status || 'Pending'}
                </Text>
              </View>
              
              {/* FIXED: Loop through the array of items for the cart */}
              <View style={styles.itemsContainer}>
                {item.items && item.items.map((orderItem, index) => {
                  const foodName = orderItem.menuItemId?.name || 'Deleted Item';
                  return (
                    <Text key={index} style={styles.foodText}>
                      • {orderItem.quantity}x {foodName}
                    </Text>
                  );
                })}
              </View>

              <Text style={styles.priceText}>Total: Rs {item.totalPrice}</Text>
              <Text style={styles.dateText}>Ordered: {new Date(item.createdAt).toLocaleString()}</Text>
              
              {!isCompleted && (
                <TouchableOpacity 
                  style={[styles.btn, styles.btnComplete]} 
                  onPress={() => initiateCompleteOrder(item._id)}
                >
                  <Text style={[styles.btnText, styles.btnTextComplete]}>
                    Mark as Completed
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.alertOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmHeader}>
              <View style={styles.iconCircle}><Text style={styles.iconText}>✔️</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmTitle}>Complete order</Text>
                <Text style={styles.confirmSubtitle}>Are you sure you want to mark this as completed?</Text>
              </View>
            </View>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOkBtn} onPress={confirmCompleteOrder}>
                <Text style={styles.confirmOkText}>Yes, complete</Text>
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
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#4A3022' },
  card: { backgroundColor: '#F5EFE6', padding: 16, borderRadius: 8, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
  customerInfo: { flex: 1, marginRight: 10 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#4A3022' },
  orderId: { fontSize: 12, color: '#7A5C4A', marginTop: 2 },
  
  statusBadge: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, fontWeight: 'bold', overflow: 'hidden', fontSize: 13, textAlign: 'center' },
  statusPending: { backgroundColor: '#C8945A', color: '#4A3022' },
  statusCompleted: { backgroundColor: '#4A3022', color: '#FFF' },
  
  itemsContainer: { backgroundColor: '#E8D8C8', padding: 10, borderRadius: 6, marginBottom: 12 },
  foodText: { fontSize: 15, color: '#4A3022', marginBottom: 4 },
  priceText: { fontSize: 16, fontWeight: 'bold', color: '#4A3022', marginBottom: 4 },
  dateText: { fontSize: 12, color: '#7A5C4A', marginBottom: 12 },
  
  btn: { padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  btnComplete: { backgroundColor: '#4A3022' },
  btnText: { fontWeight: 'bold', fontSize: 14 },
  btnTextComplete: { color: '#FFF' },

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