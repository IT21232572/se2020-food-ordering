import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Alert, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import * as ImagePicker from 'expo-image-picker';

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
  const [imageUri, setImageUri] = useState<string | null>(null);

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
    setImageUri(null);
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingId(item._id);
    setName(item.name);
    setPrice(item.price.toString());
    setCategory(item.category);
    setStockQuantity(item.stockQuantity.toString());
    setImageUri(null);
  };

  const handleSave = async () => {
    if (!name || !price || !category || !stockQuantity) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      
      // Use FormData instead of a standard JSON object to send files
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('stockQuantity', stockQuantity);
      formData.append('availabilityStatus', Number(stockQuantity) > 0 ? 'In Stock' : 'Out of Stock');

      // Append the image file if one was selected
      if (imageUri) {
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('image', {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      if (editingId) {
        await apiClient.put(`/menu/${editingId}`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            
          }
        });
        Alert.alert('Success', 'Item updated successfully.');
      } else {
        await apiClient.post('/menu', formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            
          }
        });
        Alert.alert('Success', 'New item added successfully.');
      }
      
      resetForm();
      fetchMenu();
    } catch (error: any) {
      // 1. ADD THIS LINE to print the full error to your VS Code terminal
      console.log("=== UPLOAD ERROR ===", error?.response?.data || error.message || error);
      
      // 2. This is your existing alert
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
          } catch (error: any) {
            Alert.alert(
              'Delete Failed', 
              error?.response?.data?.message || 'Could not delete the item.'
            );
          }
        }
      }
    ]);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // This fixes the deprecation warning
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
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
      <TouchableOpacity 
        style={styles.imagePickerBtn} 
        onPress={pickImage}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <Text style={styles.btnText}>Select Image from Device</Text>
        )}
      </TouchableOpacity>
      
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
        ListHeaderComponent={renderForm()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Add this Image component */}
            <Image 
              source={{ uri: item.imageUrl ? `https://se2020-food-ordering-backend.onrender.com${item.imageUrl}` : 'https://via.placeholder.com/60' }} 
              style={styles.thumbnail} 
            />
            
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
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  imagePickerBtn: { backgroundColor: '#007bff', padding: 10, borderRadius: 6, marginBottom: 10, alignItems: 'center', justifyContent: 'center', minHeight: 45 },
  previewImage: { width: 100, height: 100, borderRadius: 8, resizeMode: 'cover' },
  thumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#eee' },
});