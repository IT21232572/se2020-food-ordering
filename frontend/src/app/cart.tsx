import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useCart } from '../context/CartContext';
import apiClient from '../api/client';

export default function CartScreen() {
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const totalAmount = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handlePlaceOrder = async () => {
    setModalVisible(false);
    try {
      const token = await AsyncStorage.getItem('token');
      const decoded: any = jwtDecode(token!);

      // Format payload for the new backend schema
      const orderPayload = {
        userId: decoded.userId || decoded.id || decoded._id,
        items: cart.map(c => ({
          menuItemId: c.item._id,
          quantity: c.quantity
        }))
      };

      await apiClient.post('/orders', orderPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      clearCart();
      router.push('/history');
    } catch (error) {
      console.error('Order failed', error);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'My Cart', headerStyle: { backgroundColor: '#4A3022' }, headerTintColor: '#FFF' }} />
      
      <FlatList
        data={cart}
        keyExtractor={(c) => c.item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Cart is empty</Text>}
        renderItem={({ item: c }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.item.name}</Text>
              <Text style={styles.price}>Rs {c.item.price} (Qty: {c.quantity})</Text>
            </View>
            <TouchableOpacity onPress={() => updateQuantity(c.item._id, c.quantity - 1)} style={styles.btn}><Text>-</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => updateQuantity(c.item._id, c.quantity + 1)} style={styles.btn}><Text>+</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => removeFromCart(c.item._id)} style={styles.btnRemove}><Text>✕</Text></TouchableOpacity>
          </View>
        )}
      />

      {cart.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.totalText}>Total ({totalItems} items): Rs {totalAmount}</Text>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => setModalVisible(true)}>
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Place Order</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Popup */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm Order</Text>
            <Text>Items: {totalItems}</Text>
            <Text>Total: Rs {totalAmount}</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handlePlaceOrder} style={styles.confirmBtn}><Text style={{color: '#FFF'}}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8D8C8' },
  list: { padding: 16 },
  card: { backgroundColor: '#F5EFE6', padding: 16, marginBottom: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  name: { fontWeight: 'bold', fontSize: 16, color: '#4A3022' },
  price: { color: '#7A5C4A' },
  btn: { padding: 10, backgroundColor: '#C8945A', marginHorizontal: 5, borderRadius: 4 },
  btnRemove: { padding: 10, marginLeft: 10 },
  empty: { textAlign: 'center', marginTop: 50 },
  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#ccc' },
  totalText: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#4A3022' },
  checkoutBtn: { backgroundColor: '#4A3022', padding: 15, alignItems: 'center', borderRadius: 8 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBox: { backgroundColor: '#F5EFE6', padding: 20, borderRadius: 10, width: 300 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#4A3022' },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { padding: 10, borderWidth: 1, borderColor: '#4A3022', borderRadius: 5, flex: 1, marginRight: 5, alignItems: 'center' },
  confirmBtn: { padding: 10, backgroundColor: '#4A3022', borderRadius: 5, flex: 1, marginLeft: 5, alignItems: 'center' }
});