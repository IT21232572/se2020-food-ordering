// import { Stack } from 'expo-router';

// export default function RootLayout() {
//   return (
//     <Stack>
//       <Stack.Screen name="index" options={{ headerShown: false }} />
//       <Stack.Screen name="menu" options={{ title: 'Menu', headerBackVisible: false }} />
//     </Stack>
//   );
// }

// import React from 'react';
// import { Stack } from 'expo-router';
// import { CartProvider } from '../context/CartContext';

// export default function RootLayout() {
//   return (
//     <CartProvider>
//       <Stack screenOptions={{ headerShown: false }}>
//         <Stack.Screen 
//           name="index" 
//           options={{ headerShown: false }} 
//         />
//         <Stack.Screen 
//           name="menu" 
//           options={{ 
//             headerShown: true, // Overrides the global false so your menu header shows
//             title: 'Menu', 
//             headerBackVisible: false 
//           }} 
//         />
//         {/* Other screens like 'cart' and 'history' will render automatically */}
//       </Stack>
//     </CartProvider>
//   );
// }

import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { CartProvider } from '../context/CartContext';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate a brief loading/initialization check (e.g., checking tokens or assets)
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 2000); // Shows splash screen for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splashContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <ActivityIndicator size="large" color="#4A3022" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen 
          name="menu" 
          options={{ 
            headerShown: true, 
            title: 'Menu', 
            headerBackVisible: false 
          }} 
        />
      </Stack>
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#E8D8C8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
});