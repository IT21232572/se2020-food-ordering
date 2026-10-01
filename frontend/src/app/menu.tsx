import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Image, ScrollView, Button } from 'react-native';
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
    const totalPrice = item.price * quantity;
    Alert.alert(
      'Confirm Order',
      `Order ${quantity}x ${item.name}\nTotal Price: Rs ${totalPrice}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            onOrder(item, quantity);
            setQuantity(1); 
          },
        },
      ]
    );
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

  const router = useRouter();

  const handleLogout = async () => {
    // Clear the token from storage
    await AsyncStorage.removeItem('token');
    // Send the user back to the login screen
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
      Alert.alert('Error', 'Could not load the menu from the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async (menuItem: MenuItem, selectedQuantity: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Auth Error', 'You must be logged in to order.');
        return;
      }

      const decodedToken: any = jwtDecode(token);
      const currentUserId = decodedToken.userId || decodedToken.id || decodedToken._id;

      await apiClient.post(
        '/orders',
        {
          userId: currentUserId,
          menuItemId: menuItem._id,
          quantity: selectedQuantity,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert('Success!', `You successfully ordered ${selectedQuantity} ${menuItem.name}.`);
      fetchMenu();
    } catch (error: any) {
      Alert.alert('Order Failed', error?.response?.data?.message || 'Check your connection.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // 1. Extract unique categories from the fetched menu items
  const categories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];

  // 2. Filter the items based on the selected category pill
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
      {/* 3. Horizontal Category Filter Bar */}
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

      {/* 4. Pass the filteredMenu to the FlatList instead of the raw menuItems */}
      <FlatList
        data={filteredMenu}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <MenuItemCard item={item} onOrder={handleOrder} />}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Backgrounds matching the mockup
  container: { flex: 1, backgroundColor: '#E8D8C8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Filter Bar
  filterWrapper: { backgroundColor: '#E8D8C8', paddingVertical: 10, elevation: 0 },
  categoryContainer: { paddingHorizontal: 16, alignItems: 'center' },
  categoryBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#AFA49B', marginRight: 10 }, // Taupe/Grey inactive
  categoryBtnActive: { backgroundColor: '#C8945A' }, // Gold active
  categoryText: { fontSize: 14, fontWeight: 'bold', color: '#4A3022' },
  categoryTextActive: { color: '#4A3022' }, // Text stays dark brown when active
  
  // Grid & Cards
  list: { padding: 8 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 4 },
  card: { backgroundColor: '#F5EFE6', borderRadius: 12, elevation: 2, flex: 1, margin: 8, overflow: 'hidden', maxWidth: '46%' },
  image: { width: '100%', height: 130, backgroundColor: '#dccfc1' },
  cardContent: { padding: 12, alignItems: 'center' },
  
  // Text Colors
  name: { fontSize: 15, fontWeight: 'bold', marginBottom: 4, textAlign: 'center', minHeight: 40, textAlignVertical: 'center', color: '#4A3022' },
  details: { fontSize: 12, color: '#7A5C4A', marginBottom: 4, textAlign: 'center' },
  price: { fontSize: 16, fontWeight: 'bold', color: '#4A3022', marginBottom: 6 },
  stock: { fontSize: 11, color: '#7A5C4A', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  outOfStock: { color: '#7A5C4A' }, // Reverted from red to muted grey/brown to match mockup
  
  // Quantity Selector
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'center' },
  qtyBtn: { backgroundColor: '#C8945A', width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  qtyText: { fontSize: 18, fontWeight: 'bold', color: '#4A3022', marginTop: -2 },
  qtyLabel: { fontSize: 15, fontWeight: 'bold', color: '#4A3022', marginHorizontal: 12 },
  
  // Custom Order Button
  buttonContainer: { width: '100%' },
  orderBtn: { paddingVertical: 10, borderRadius: 8, alignItems: 'center', width: '100%' },
  orderBtnActive: { backgroundColor: '#4A3022' },
  orderBtnDisabled: { backgroundColor: '#AFA49B' }, // Grey background when out of stock
  orderBtnText: { fontWeight: 'bold', fontSize: 14 },
  orderBtnTextActive: { color: '#FFF' },
  orderBtnTextDisabled: { color: '#4A3022' }
});