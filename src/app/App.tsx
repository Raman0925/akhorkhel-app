import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAds } from '@/monetization';
import { colors } from '@/theme';

import { ErrorBoundary } from './ErrorBoundary';
import { RootNavigator } from './navigation/RootNavigator';

const theme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    text: colors.text,
  },
};

export default function App() {
  useEffect(() => {
    // Initialising the SDK shows nothing; ads only appear at the placements in monetization/.
    initAds().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <ErrorBoundary>
          <NavigationContainer theme={theme}>
            <RootNavigator />
          </NavigationContainer>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
