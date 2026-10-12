import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initSupabase } from '../src/database/supabaseClient';

export default function RootLayout() {
  useEffect(() => {
    initSupabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="jobs/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="jobs/[id]" />
        <Stack.Screen name="jobs/edit/[id]" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
