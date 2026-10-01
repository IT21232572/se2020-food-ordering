import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../api/client';
import { useCart } from '../context/CartContext';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  stockQuantity: number;
  availabilityStatus: string;
  imageUrl: string;
}

const MenuItemCard = ({ item, onAddToCart }: { item: MenuItem; onAddToCart: (item: MenuItem, qty: number) => void }) => {
  const [quantity, setQuantity] = useState(1);

  const increase = () => { if (quantity < item.stockQuantity) setQuantity(quantity + 1); };
  const decrease = () => { if (quantity > 1) setQuantity(quantity - 1); };

  const handleAddPress = () => {
    onAddToCart(item, quantity);
    setQuantity(1); // Reset quantity after adding to cart
  };

  return (
    <View style={styles.card}>
      <Image 
        source={{ 
          uri: item.imageUrl 
            ? (item.imageUrl.startsWith('http') 
                ? item.imageUrl 
                : `https://se2020-food-ordering-backend.onrender.com${item.imageUrl.startsWith('/') ? '' : '/'}${item.imageUrl}`)
            : 'https://via.placeholder.com/200' 
        }} 
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
            onPress={handleAddPress}
          >
            <Text style={[styles.orderBtnText, item.stockQuantity === 0 ? styles.orderBtnTextDisabled : styles.orderBtnTextActive]}>
              Add to Cart ({quantity})
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
  const [toast, setToast] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);

  const router = useRouter();
  const { addToCart } = useCart(); // Access the global cart state

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
    setTimeout(() => setToast(null), 3500); 
  };

  const handleAddToCart = (menuItem: MenuItem, selectedQuantity: number) => {
    addToCart(menuItem, selectedQuantity);
    showToast('Added to Cart', `${selectedQuantity}x ${menuItem.name} added.`, 'success');
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
              <TouchableOpacity onPress={() => router.push('/cart')} style={{ marginLeft: 10, marginRight: 15 }}>
              <Text style={{ fontWeight: 'bold', color: '#C8945A', fontSize: 16 }}>🛒 Cart</Text>
            </TouchableOpacity>
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

      {toast && (
        <View style={[styles.toastContainer, toast.type === 'success' ? styles.alertSuccessBox : styles.alertErrorBox]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toastTitle, toast.type === 'success' ? styles.alertSuccessTitle : styles.alertErrorTitle]}>{toast.title}</Text>
            <Text style={[styles.toastMessage, toast.type === 'success' ? styles.alertSuccessText : styles.alertErrorText]}>{toast.message}</Text>
          </View>
        </View>
      )}

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
        renderItem={({ item }) => <MenuItemCard item={item} onAddToCart={handleAddToCart} />}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.list}
      />
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
  toastContainer: { position: 'absolute', top: 20, left: 16, right: 16, padding: 16, borderRadius: 8, zIndex: 1000, flexDirection: 'row', alignItems: 'center', elevation: 6 },
  toastTitle: { fontWeight: 'bold', fontSize: 15 },
  toastMessage: { fontSize: 13, marginTop: 2 },
  alertSuccessBox: { backgroundColor: '#F5EFE6' },
  alertSuccessTitle: { color: '#4A3022' },
  alertSuccessText: { color: '#7A5C4A' },
  alertErrorBox: { backgroundColor: '#4A3022' },
  alertErrorTitle: { color: '#F5EFE6' },
  alertErrorText: { color: '#dccfc1' }
});