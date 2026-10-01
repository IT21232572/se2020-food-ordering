import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
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

  // Opens the custom confirmation modal
  const initiateDelete = (orderId: string) => {
    setOrderToDelete(orderId);
    setModalVisible(true);
  };

  // Processes the API call after confirming in the custom modal
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

  const handleUpdate = async (orderId: string, newQuantity: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await apiClient.put(`/orders/${orderId}`, {
        quantity: newQuantity 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Order updated', 'Your order quantity has been updated.', 'success');
      fetchOrders(); 
    } catch (error) {
      showToast('Error', 'Could not update the order.', 'error');
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
      
      {/* Floating Custom Toast Alerts */}
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
        renderItem={({ item }) => <OrderCard item={item} onUpdate={handleUpdate} onDelete={initiateDelete} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No {statusFilter.toLowerCase()} orders found.</Text>}
      />

      {/* Custom Themed Confirmation Modal for Cancelling Orders */}
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
              <TouchableOpacity 
                style={styles.confirmCancelBtn} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>No, keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmOkBtn} 
                onPress={confirmDelete}
              >
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

  // --- Confirmation Modal Styles ---
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

  // --- Toast Alert Styles ---
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