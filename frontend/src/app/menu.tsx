import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Button, Alert, Image, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../api/client';
import { Stack, useRouter } from 'expo-router';

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

  const increase = () => {
    if (quantity < item.stockQuantity) setQuantity(quantity + 1);
  };

  const decrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleOrderPress = () => {
    const totalPrice = item.price * quantity;
    
    // Trigger the confirmation popup
    Alert.alert(
      'Confirm Order',
      `Order ${quantity}x ${item.name}\nTotal Price: Rs ${totalPrice}`,
      [
        {
          text: 'Cancel',
          style: 'cancel', // This makes it a standard dismiss button
        },
        {
          text: 'OK',
          onPress: () => {
            onOrder(item, quantity);
            setQuantity(1); // Reset back to 1 only if they click OK
          },
        },
      ]
    );
  };

  const fullImageUrl = `https://se2020-food-ordering-backend.onrender.com${item.imageUrl}`;

  return (
    <View style={styles.card}>
      {item.imageUrl && (
        <Image source={{ uri: fullImageUrl }} style={styles.image} resizeMode="cover" />
      )}
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.details}>Category: {item.category} | Price: Rs {item.price}</Text>
      <Text style={[styles.stock, item.stockQuantity === 0 && styles.outOfStock]}>
        Stock: {item.stockQuantity} ({item.availabilityStatus})
      </Text>

      {/* 2. Quantity Selector UI */}
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
        <Button
          title={`Place Order (Qty: ${quantity})`}
          disabled={item.stockQuantity === 0}
          onPress={handleOrderPress} 
        />
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

  useEffect(() => {
    fetchMenu();
  }, []);

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
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 15 }}>
              <TouchableOpacity onPress={() => router.push('/history')} style={{ marginRight: 20 }}>
                <Text style={{ fontWeight: 'bold', color: '#007bff' }}>My Orders</Text>
            </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout}>
                <Text style={{ fontWeight: 'bold', color: '#dc3545' }}>Logout</Text>
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
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterWrapper: { backgroundColor: '#fff', paddingVertical: 10, elevation: 2 },
  categoryContainer: { paddingHorizontal: 16, alignItems: 'center' },
  categoryBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e0e0e0', marginRight: 10 },
  categoryBtnActive: { backgroundColor: '#007bff' },
  categoryText: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  categoryTextActive: { color: '#fff' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, marginBottom: 16, borderRadius: 8, elevation: 3 },
  image: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  details: { fontSize: 15, color: '#555', marginBottom: 4 },
  stock: { fontSize: 14, color: '#28a745', fontWeight: '600', marginBottom: 12 },
  outOfStock: { color: '#dc3545' },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  qtyBtn: { backgroundColor: '#ddd', width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  qtyText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  qtyLabel: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20 },
  buttonContainer: { marginTop: 8 },
});