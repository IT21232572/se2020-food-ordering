import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Button, Alert, Image } from 'react-native';
import apiClient from '../api/client';

// Define the structure of your data based on your Node.js model
interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  stockQuantity: number;
  availabilityStatus: string;
  imageUrl: string;
}

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      // Makes a GET request to https://se2020-food-ordering-backend.onrender.com/api/menu
      const response = await apiClient.get('/menu');
      setMenuItems(response.data);
    } catch (error) {
      Alert.alert('Error', 'Could not load the menu from the server.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: MenuItem }) => {
    // Combine your live server URL with the database image path
    const fullImageUrl = `https://se2020-food-ordering-backend.onrender.com${item.imageUrl}`;

    return (
      <View style={styles.card}>
        {item.imageUrl && (
          <Image 
            source={{ uri: fullImageUrl }} 
            style={styles.image} 
            resizeMode="cover" 
          />
        )}
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.details}>Category: {item.category} | Price: Rs {item.price}</Text>
        <Text style={[styles.stock, item.stockQuantity === 0 && styles.outOfStock]}>
          Stock: {item.stockQuantity} ({item.availabilityStatus})
        </Text>
        <View style={styles.buttonContainer}>
          <Button 
            title="Place Order" 
            disabled={item.stockQuantity === 0} 
            onPress={() => Alert.alert('Coming Soon', `Order ${item.name}`)} 
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', padding: 16, marginBottom: 16, borderRadius: 8, elevation: 3 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  details: { fontSize: 15, color: '#555', marginBottom: 4 },
  stock: { fontSize: 14, color: '#28a745', fontWeight: '600', marginBottom: 12 },
  outOfStock: { color: '#dc3545' },
  buttonContainer: { marginTop: 8 },
  image: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
});