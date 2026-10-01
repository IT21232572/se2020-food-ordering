// import { Stack } from 'expo-router';

// export default function RootLayout() {
//   return (
//     <Stack>
//       <Stack.Screen name="index" options={{ headerShown: false }} />
//       <Stack.Screen name="menu" options={{ title: 'Menu', headerBackVisible: false }} />
//     </Stack>
//   );
// }

import React from 'react';
import { Stack } from 'expo-router';
import { CartProvider } from '../context/CartContext';

export default function RootLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="menu" 
          options={{ 
            headerShown: true, // Overrides the global false so your menu header shows
            title: 'Menu', 
            headerBackVisible: false 
          }} 
        />
        {/* Other screens like 'cart' and 'history' will render automatically */}
      </Stack>
    </CartProvider>
  );
}