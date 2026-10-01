import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../api/client';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  stockQuantity: number;
  availabilityStatus: string;
  imageUrl: string;
}

// 1. Separate component so each card tracks its own quantity
const MenuItemCard = ({ item, onOrder }: { item: MenuItem; onOrder: (item: MenuItem, qty: number) => void }) => {
  const [quantity, setQuantity] = useState(1);

  const increase = () => { if (quantity < item.stockQuantity) setQuantity(quantity + 1); };
  const decrease = () => { if (quantity > 1) setQuantity(quantity - 1); };

  const handleOrderPress = () => {
    // Just pass the request up to the main screen to open the custom modal
    onOrder(item, quantity);
  };

  return (
    <View style={styles.card}>
      <Image 
        source={{ uri: item.imageUrl ? `https://se2020-food-ordering-backend.onrender.com${item.imageUrl}` : 'https://via.placeholder.com/200' }} 
        style={styles.image} 
        resizeMode="cover" 
      />

      <View style={styles.cardContent}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.details}>{item.category}</Text>
        <Text style={styles.price}>Rs {item.price}</Text>
        <Text style={[styles.stock, item.stockQuantity === 0 && styles.outOfStock]}>
          Stock: {item.stockQuantity} ({item.availabilityStatus})
        </Text>

        {item.stockQuantity > 0 && (
          <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.qtyBtn} onPress={decrease}>
              <Text style={styles.qtyText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyLabel}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={increase}>
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.orderBtn, item.stockQuantity === 0 ? styles.orderBtnDisabled : styles.orderBtnActive]}
            disabled={item.stockQuantity === 0}
            onPress={handleOrderPress}
          >
            <Text style={[styles.orderBtnText, item.stockQuantity === 0 ? styles.orderBtnTextDisabled : styles.orderBtnTextActive]}>
              Order ({quantity})
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All'); 

  // Modal & Alert States
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{ item: MenuItem; qty: number } | null>(null);
  const [toast, setToast] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);

  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  };

  useFocusEffect(
    useCallback(() => {
      fetchMenu();
    }, [])
  );

  const fetchMenu = async () => {
    try {
      const response = await apiClient.get('/menu');
      setMenuItems(response.data);
    } catch (error) {
      showToast('Error', 'Could not load the menu from the server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (title: string, message: string, type: 'success' | 'error') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 3500); // Auto-hide after 3.5s
  };

  // Opens the confirmation modal instead of standard Alert
  const initiateOrder = (menuItem: MenuItem, selectedQuantity: number) => {
    setPendingOrder({ item: menuItem, qty: selectedQuantity });
    setModalVisible(true);
  };

  // Processes the API call after confirming in the custom modal
  const processOrder = async () => {
    if (!pendingOrder) return;
    setModalVisible(false);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        showToast('Auth Error', 'You must be logged in to order.', 'error');
        return;
      }

      const decodedToken: any = jwtDecode(token);
      const currentUserId = decodedToken.userId || decodedToken.id || decodedToken._id;

      await apiClient.post(
        '/orders',
        {
          userId: currentUserId,
          menuItemId: pendingOrder.item._id,
          quantity: pendingOrder.qty,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast('Order placed', `${pendingOrder.qty}x ${pendingOrder.item.name} is on its way.`, 'success');
      fetchMenu();
    } catch (error: any) {
      showToast("Couldn't place order", error?.response?.data?.message || 'Check your connection and retry.', 'error');
    } finally {
      setPendingOrder(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A3022" />
      </View>
    );
  }

  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];
  const filteredMenu = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Menu',
          headerStyle: { backgroundColor: '#4A3022' },
          headerTintColor: '#FFF',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => router.push('/history')} style={{ marginRight: 20 }}>
                <Text style={{ fontWeight: 'bold', color: '#C8945A' }}>My orders</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
                <Text style={{ fontWeight: 'bold', color: '#C8945A' }}>Logout</Text>
              </TouchableOpacity>
            </View>
          )
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
          {categories.map((category, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.categoryBtn, selectedCategory === category && styles.categoryBtnActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredMenu}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <MenuItemCard item={item} onOrder={initiateOrder} />}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.list}
      />

      {/* Custom Themed Confirmation Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.alertOverlay}>
          <View style={styles.confirmBox}>
            
            <View style={styles.confirmHeader}>
              <View style={styles.iconCircle}><Text style={styles.iconText}>📄</Text></View>
              <View>
                <Text style={styles.confirmTitle}>Confirm order</Text>
                <Text style={styles.confirmSubtitle}>Review before placing</Text>
              </View>
            </View>

            {pendingOrder && (
              <View style={styles.receiptBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptItemText}>{pendingOrder.item.name}</Text>
                  <Text style={styles.receiptQtyText}>{pendingOrder.qty}x</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptTotalLabel}>Total</Text>
                  <Text style={styles.receiptTotalValue}>Rs {pendingOrder.item.price * pendingOrder.qty}</Text>
                </View>
              </View>
            )}

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmOkBtn} 
                onPress={processOrder}
              >
                <Text style={styles.confirmOkText}>Place order</Text>
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

  filterWrapper: { backgroundColor: '#E8D8C8', paddingVertical: 10, elevation: 0 },
  categoryContainer: { paddingHorizontal: 16, alignItems: 'center' },
  categoryBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#AFA49B', marginRight: 10 },
  categoryBtnActive: { backgroundColor: '#C8945A' },
  categoryText: { fontSize: 14, fontWeight: 'bold', color: '#4A3022' },
  categoryTextActive: { color: '#4A3022' },

  list: { padding: 8 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 4 },
  card: { backgroundColor: '#F5EFE6', borderRadius: 12, elevation: 2, flex: 1, margin: 8, overflow: 'hidden', maxWidth: '46%' },
  image: { width: '100%', height: 130, backgroundColor: '#dccfc1' },
  cardContent: { padding: 12, alignItems: 'center' },

  name: { fontSize: 15, fontWeight: 'bold', marginBottom: 4, textAlign: 'center', minHeight: 40, textAlignVertical: 'center', color: '#4A3022' },
  details: { fontSize: 12, color: '#7A5C4A', marginBottom: 4, textAlign: 'center' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#4A3022', marginBottom: 6 },
  stock: { fontSize: 11, color: '#7A5C4A', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  outOfStock: { color: '#7A5C4A' },

  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'center' },
  qtyBtn: { backgroundColor: '#C8945A', width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  qtyText: { fontSize: 18, fontWeight: 'bold', color: '#4A3022', marginTop: -2 },
  qtyLabel: { fontSize: 15, fontWeight: 'bold', color: '#4A3022', marginHorizontal: 12 },

  buttonContainer: { width: '100%' },
  orderBtn: { paddingVertical: 10, borderRadius: 8, alignItems: 'center', width: '100%' },
  orderBtnActive: { backgroundColor: '#4A3022' },
  orderBtnDisabled: { backgroundColor: '#AFA49B' },
  orderBtnText: { fontWeight: 'bold', fontSize: 14 },
  orderBtnTextActive: { color: '#FFF' },
  orderBtnTextDisabled: { color: '#4A3022' },

  // --- Confirmation Modal Styles ---
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: { width: '100%', maxWidth: 340, backgroundColor: '#F5EFE6', borderRadius: 16, padding: 20, elevation: 5 },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C8945A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  iconText: { fontSize: 18, color: '#4A3022' },
  confirmTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A3022' },
  confirmSubtitle: { fontSize: 14, color: '#7A5C4A', marginTop: 2 },
  
  receiptBox: { backgroundColor: '#E8D8C8', borderRadius: 12, padding: 16, marginBottom: 20 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  receiptItemText: { fontSize: 16, color: '#4A3022' },
  receiptQtyText: { fontSize: 16, color: '#4A3022', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#dccfc1', marginVertical: 12 },
  receiptTotalLabel: { fontSize: 16, color: '#4A3022' },
  receiptTotalValue: { fontSize: 16, color: '#4A3022', fontWeight: 'bold' },

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