import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Modal States
  const [modalVisible, setModalVisible] = useState(false); // For the Add/Edit Form
  const [deleteModalVisible, setDeleteModalVisible] = useState(false); // For Delete Confirmation
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);

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

  const showToast = (title: string, message: string, type: 'success' | 'error') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMenu = async () => {
    try {
      const response = await apiClient.get('/menu');
      setMenuItems(response.data);
    } catch (error) {
      showToast('Error', 'Could not load the menu.', 'error');
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
    setModalVisible(false);
  };

  const handleAddClick = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingId(item._id);
    setName(item.name);
    setPrice(item.price.toString());
    setCategory(item.category);
    setStockQuantity(item.stockQuantity.toString());
    setImageUri(null);
    setModalVisible(true);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name || !price || !category || !stockQuantity) {
      showToast('Error', 'Please fill in all required fields.', 'error');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('name', String(name));
      formData.append('price', String(price));
      formData.append('category', String(category));
      formData.append('stockQuantity', String(stockQuantity));
      formData.append('availabilityStatus', Number(stockQuantity) > 0 ? 'In Stock' : 'Out of Stock');

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'upload.jpg';
        const match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : `image/jpeg`;
        if (type === 'image/jpg') type = 'image/jpeg';

        formData.append('image', {
          uri: imageUri,
          name: filename,
          type: type,
        } as any);
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        }
      };

      if (editingId) {
        await apiClient.put(`/menu/${editingId}`, formData, config);
        showToast('Success', 'Item updated successfully.', 'success');
      } else {
        await apiClient.post('/menu', formData, config);
        showToast('Success', 'New item added successfully.', 'success');
      }
      
      resetForm();
      fetchMenu();
    } catch (error: any) {
      console.log("=== AXIOS UPLOAD ERROR ===", error?.response?.data || error.message || error);
      showToast('Save Failed', 'Could not save the item.', 'error');
    }
  };

  const initiateDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteModalVisible(false);
    
    try {
      const token = await AsyncStorage.getItem('token');
      await apiClient.delete(`/menu/${itemToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Item Deleted', 'The food item was successfully removed.', 'success');
      fetchMenu();
    } catch (error: any) {
      showToast('Delete Failed', error?.response?.data?.message || 'Could not delete the item.', 'error');
    } finally {
      setItemToDelete(null);
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
  const filteredMenu = selectedCategory === 'All' ? menuItems : menuItems.filter(item => item.category === selectedCategory);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Manage menu',
          headerShown: true,
          headerStyle: { backgroundColor: '#4A3022' },
          headerTintColor: '#FFF',
          headerTitleAlign: 'left', // Forces left alignment like the mockup
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => router.push('/admin-orders')} style={{ marginRight: 20 }}>
                {/* Added fontSize: 15 */}
                <Text style={{ fontWeight: 'bold', color: '#C8945A', fontSize: 15 }}>View orders</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
                {/* Added fontSize: 15 */}
                <Text style={{ fontWeight: 'bold', color: '#C8945A', fontSize: 15 }}>Logout</Text>
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

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
          {categories.map((cat, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.categoryBtn, selectedCategory === cat && styles.categoryBtnActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <FlatList
        data={filteredMenu}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
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
                <Text style={styles.editBtnText}>Edit</Text> 
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => initiateDelete(item._id)}>
                <Text style={styles.deleteBtnText}>Delete</Text> 
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddClick}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Form Modal for Add/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>{editingId ? 'Edit Menu Item' : 'Add New Menu Item'}</Text>
            
            <TextInput style={styles.input} placeholder="Food Name" placeholderTextColor="#888" value={name} onChangeText={setName} />
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Price (Rs)" placeholderTextColor="#888" value={price} onChangeText={setPrice} keyboardType="numeric" />
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Stock Qty" placeholderTextColor="#888" value={stockQuantity} onChangeText={setStockQuantity} keyboardType="numeric" />
            </View>
            
            <TextInput 
              style={[styles.input, { marginBottom: 8 }]} 
              placeholder="Category (Type or select below)" 
              placeholderTextColor="#888"
              value={category} 
              onChangeText={setCategory} 
            />
            
            <View style={styles.chipWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                {['Bread', 'Savory', 'Desserts', 'Beverages', 'Cookies'].map((cat) => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.chip, category.toLowerCase() === cat.toLowerCase() && styles.chipActive]} 
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category.toLowerCase() === cat.toLowerCase() && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <Text style={styles.imageBtnText}>Select Image from Device</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.formActionRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.btnText}>{editingId ? 'Update Item' : 'Add Item'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent={true}>
        <View style={styles.alertOverlay}>
          <View style={styles.confirmBox}>
            
            <View style={styles.confirmHeader}>
              <View style={styles.iconCircle}><Text style={styles.iconText}>⚠️</Text></View>
              <View>
                <Text style={styles.confirmTitle}>Delete item</Text>
                <Text style={styles.confirmSubtitle}>Are you sure you want to delete this?</Text>
              </View>
            </View>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity 
                style={styles.confirmCancelBtn} 
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmOkBtn} 
                onPress={confirmDelete}
              >
                <Text style={styles.confirmOkText}>Yes, delete</Text>
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
  list: { padding: 16, paddingBottom: 80 }, 
  card: { backgroundColor: '#F5EFE6', padding: 14, borderRadius: 8, elevation: 2, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  thumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#dccfc1' },
  cardInfo: { flex: 1 },
  
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#4A3022', marginBottom: 4 },
  itemDetails: { fontSize: 13, color: '#7A5C4A' },
  
  actionButtons: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#4A3022', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  deleteBtn: { backgroundColor: '#C8945A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  editBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  deleteBtnText: { color: '#4A3022', fontWeight: 'bold', fontSize: 14 },
  
  fab: { position: 'absolute', bottom: 90, right: 20, backgroundColor: '#C8945A', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  fabIcon: { fontSize: 36, color: '#4A3022', fontWeight: 'bold', marginTop: -4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  formContainer: { backgroundColor: '#F5EFE6', padding: 20, borderRadius: 12, elevation: 5 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#4A3022', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#dccfc1', padding: 12, borderRadius: 8, marginBottom: 12, backgroundColor: '#fff', fontSize: 15, color: '#4A3022' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  imagePickerBtn: { backgroundColor: '#E8D8C8', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center', justifyContent: 'center', minHeight: 50, borderWidth: 1, borderColor: '#dccfc1', borderStyle: 'dashed' },
  imageBtnText: { color: '#4A3022', fontWeight: 'bold' },
  previewImage: { width: 100, height: 100, borderRadius: 8, resizeMode: 'cover' },
  formActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  saveBtn: { backgroundColor: '#4A3022', padding: 14, borderRadius: 8, flex: 1, alignItems: 'center', marginRight: 6 },
  cancelBtn: { backgroundColor: '#C8945A', padding: 14, borderRadius: 8, flex: 1, alignItems: 'center', marginLeft: 6 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  
  chipWrapper: { marginBottom: 16, height: 35 },
  chipContainer: { alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E8D8C8', borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#dccfc1', justifyContent: 'center' },
  chipActive: { backgroundColor: '#4A3022', borderColor: '#4A3022' },
  chipText: { fontSize: 13, color: '#7A5C4A' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  
  filterWrapper: { backgroundColor: '#E8D8C8', paddingVertical: 10, elevation: 0, marginBottom: 8 },
  categoryContainer: { paddingHorizontal: 16, alignItems: 'center' },
  categoryBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#AFA49B', marginRight: 10 },
  categoryBtnActive: { backgroundColor: '#C8945A' },
  categoryText: { fontSize: 14, fontWeight: 'bold', color: '#4A3022' },
  categoryTextActive: { color: '#4A3022' },

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