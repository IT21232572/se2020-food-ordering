import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  stockQuantity: number;
  imageUrl: string;
}

export default function AdminScreen() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [imageUrl, setImageUrl] = useState(''); // E.g., /uploads/bread.webp

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await apiClient.get('/menu');
      setMenuItems(response.data);
    } catch (error) {
      Alert.alert('Error', 'Could not load the menu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setCategory('');
    setStockQuantity('');
    setImageUrl('');
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingId(item._id);
    setName(item.name);
    setPrice(item.price.toString());
    setCategory(item.category);
    setStockQuantity(item.stockQuantity.toString());
    setImageUrl(item.imageUrl);
  };

  const handleSave = async () => {
    if (!name || !price || !category || !stockQuantity) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const payload = {
        name,
        price: Number(price),
        category,
        stockQuantity: Number(stockQuantity),
        imageUrl,
        availabilityStatus: Number(stockQuantity) > 0 ? 'In Stock' : 'Out of Stock'
      };

      if (editingId) {
        // Update existing item
        await apiClient.put(`/menu/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Success', 'Item updated successfully.');
      } else {
        // Create new item
        await apiClient.post('/menu', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Alert.alert('Success', 'New item added successfully.');
      }
      
      resetForm();
      fetchMenu();
    } catch (error: any) {
      Alert.alert('Save Failed', error?.response?.data?.message || 'Check your connection.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to permanently delete this food item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await apiClient.delete(`/menu/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            fetchMenu();
          } catch (error) {
            Alert.alert('Error', 'Could not delete the item.');
          }
        }
      }
    ]);
  };

  const renderForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</Text>
      <TextInput style={styles.input} placeholder="Food Name" value={name} onChangeText={setName} />
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.halfInput]} placeholder="Price (Rs)" value={price} onChangeText={setPrice} keyboardType="numeric" />
        <TextInput style={[styles.input, styles.halfInput]} placeholder="Stock Qty" value={stockQuantity} onChangeText={setStockQuantity} keyboardType="numeric" />
      </View>
      <TextInput style={styles.input} placeholder="Category (e.g., Bakery, Beverages)" value={category} onChangeText={setCategory} />
      <TextInput style={styles.input} placeholder="Image URL (e.g., /uploads/new.webp)" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
      
      <View style={styles.formActionRow}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.btnText}>{editingId ? 'Update Item' : 'Add Item'}</Text>
        </TouchableOpacity>
        {editingId && (
          <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Manage Menu',
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
              <Text style={{ fontWeight: 'bold', color: '#dc3545' }}>Logout</Text>
            </TouchableOpacity>
          )
        }} 
      />
      
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderForm}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDetails}>Rs {item.price} | Stock: {item.stockQuantity}</Text>
              <Text style={styles.itemDetails}>Category: {item.category}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.editBtn} onPress={() => handleEditClick(item)}>
                <Text style={styles.btnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item._id)}>
                <Text style={styles.btnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  formContainer: { backgroundColor: '#fff', padding: 16, borderRadius: 8, elevation: 2, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 6, marginBottom: 10, backgroundColor: '#fafafa' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  formActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  saveBtn: { backgroundColor: '#28a745', padding: 12, borderRadius: 6, flex: 1, alignItems: 'center', marginRight: 5 },
  cancelBtn: { backgroundColor: '#6c757d', padding: 12, borderRadius: 6, flex: 1, alignItems: 'center', marginLeft: 5 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 8, elevation: 2, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  itemDetails: { fontSize: 13, color: '#666' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#007bff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  deleteBtn: { backgroundColor: '#dc3545', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});