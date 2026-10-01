import React, { createContext, useState, useContext } from 'react';

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  stockQuantity: number;
  imageUrl: string;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: MenuItem, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.item._id === item._id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, item.stockQuantity);
        return prev.map(i => i.item._id === item._id ? { ...i, quantity: newQty } : i);
      }
      return [...prev, { item, quantity }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(id);
    setCart(prev => prev.map(i => i.item._id === id ? { ...i, quantity } : i));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.item._id !== id));
  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart required');
  return context;
};