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
      <Stack.Screen 
        options={{ 
          title: 'My Cart', 
          headerStyle: { backgroundColor: '#4A3022' }, 
          headerTintColor: '#FFF',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15, padding: 5 }}>
              <Text style={{ color: '#FFF', fontSize: 22, fontWeight: 'bold' }}>←</Text>
            </TouchableOpacity>
          )
        }} 
      />
      
      <FlatList
        data={cart}
        keyExtractor={(c) => c.item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Cart is empty</Text>}
        // renderItem={({ item: c }) => {
        //   const itemTotalPrice = c.item.price * c.quantity;
        //   return (
        //     <View style={styles.card}>
        //       <View style={{ flex: 1 }}>
        //         <Text style={styles.name}>{c.item.name}</Text>
        //         <Text style={styles.price}>Rs {c.item.price} (Qty: {c.quantity})</Text>
        //         <Text style={styles.itemTotal}>Item Total: Rs {itemTotalPrice}</Text>
        //       </View>

              

        //       <TouchableOpacity onPress={() => updateQuantity(c.item._id, c.quantity - 1)} style={styles.btn}>
        //         <Text style={styles.btnText}>-</Text>
        //       </TouchableOpacity>
        //       {/* Quantity indicator placed right before the minus button */}
        //       <Text style={styles.qtyLabel}>   x{c.quantity}   </Text>
        //       <TouchableOpacity onPress={() => updateQuantity(c.item._id, c.quantity + 1)} style={styles.btn}>
        //         <Text style={styles.btnText}>+</Text>
        //       </TouchableOpacity>
        //       <TouchableOpacity onPress={() => removeFromCart(c.item._id)} style={styles.btnRemove}>
        //         <Text style={styles.removeText}>✕</Text>
        //       </TouchableOpacity>
        //     </View>
        //   );
        // }}

        renderItem={({ item: c }) => {
          const itemTotalPrice = c.item.price * c.quantity;
          // Check if the user has reached the maximum stock limit
          const isMaxStock = c.quantity >= c.item.stockQuantity;

          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{c.item.name}</Text>
                <Text style={styles.price}>Rs {c.item.price} (Stock: {c.item.stockQuantity})</Text>
                <Text style={styles.itemTotal}>Item Total: Rs {itemTotalPrice}</Text>
              </View>

              <TouchableOpacity onPress={() => updateQuantity(c.item._id, c.quantity - 1)} style={styles.btn}>
                <Text style={styles.btnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyLabel}>   x{c.quantity}   </Text>
              {/* Disabled + button if max stock is reached */}
              <TouchableOpacity 
                onPress={() => !isMaxStock && updateQuantity(c.item._id, c.quantity + 1)} 
                style={[styles.btn, isMaxStock && { backgroundColor: '#AFA49B' }]}
                disabled={isMaxStock}
              >
                <Text style={[styles.btnText, isMaxStock && { color: '#7A5C4A' }]}>+</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => removeFromCart(c.item._id)} style={styles.btnRemove}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {cart.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.totalText}>Total ({totalItems} items): Rs {totalAmount}</Text>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => setModalVisible(true)}>
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Place Order</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Popup */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm Order</Text>
            <Text style={styles.modalText}>Items: {totalItems}</Text>
            <Text style={styles.modalText}>Total: Rs {totalAmount}</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={{ color: '#7A5C4A', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePlaceOrder} style={styles.confirmBtn}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Confirm</Text>
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
  list: { padding: 16 },
  card: { backgroundColor: '#F5EFE6', padding: 16, marginBottom: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  name: { fontWeight: 'bold', fontSize: 16, color: '#4A3022', marginBottom: 2 },
  price: { color: '#7A5C4A', fontSize: 13, marginBottom: 2 },
  itemTotal: { color: '#4A3022', fontSize: 13, fontWeight: '600' },
  
  qtyLabel: { fontSize: 16, fontWeight: 'bold', color: '#4A3022', marginHorizontal: 8 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#C8945A', marginHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: 'bold', color: '#4A3022' },
  btnRemove: { padding: 8, marginLeft: 8 },
  removeText: { fontSize: 16, fontWeight: 'bold', color: '#7A5C4A' },

  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#4A3022' },
  footer: { padding: 20, backgroundColor: '#F5EFE6', borderTopWidth: 1, borderColor: '#dccfc1', elevation: 5 },
  totalText: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#4A3022' },
  checkoutBtn: { backgroundColor: '#4A3022', padding: 15, alignItems: 'center', borderRadius: 8 },
  
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBox: { backgroundColor: '#F5EFE6', padding: 22, borderRadius: 12, width: 320, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#4A3022' },
  modalText: { fontSize: 15, color: '#7A5C4A', marginBottom: 6 },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { padding: 12, borderWidth: 1, borderColor: '#C8945A', borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' },
  confirmBtn: { padding: 12, backgroundColor: '#4A3022', borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center' }
});