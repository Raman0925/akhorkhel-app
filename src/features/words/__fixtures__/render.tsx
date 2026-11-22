/** Test-only: mount one screen in a real stack navigator, with stubs for the routes it opens. */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/navigation';
import { useProfiles, useProgress } from '@/progress';
import { useSettings } from '@/storage/settings';

export const PROFILE_ID = 'p1';

export function resetStores() {
  useProfiles.setState({
    profiles: [{ id: PROFILE_ID, nickname: 'Kid', avatar: 'rhino', createdAt: 0 }],
    currentId: PROFILE_ID,
  });
  useProgress.setState({ progress: {} });
  useSettings.setState({ uiLanguage: 'en' });
}

type RouteName = keyof RootStackParamList;
const Stack = createNativeStackNavigator<RootStackParamList>();

type StubProps = {
  route: { name: string; params?: object };
  navigation: { goBack: () => void };
};

/** Stands in for screens owned elsewhere: shows its params and has a back button. */
function Stub({ route, navigation }: StubProps) {
  return (
    <Pressable testID="stub-back" onPress={() => navigation.goBack()}>
      <Text testID={`screen-${route.name}`}>{JSON.stringify(route.params ?? {})}</Text>
    </Pressable>
  );
}

/** Mount `component` as route `name`; every route in `stubs` renders a stub showing its params. */
export async function renderScreen<T extends RouteName>(
  name: T,
  component: React.ComponentType<never>,
  params?: RootStackParamList[T],
  stubs: RouteName[] = [],
) {
  return render(
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={name} screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name={name}
            component={component as React.ComponentType<object>}
            initialParams={params as object}
          />
          {stubs.map(stub => (
            <Stack.Screen key={stub} name={stub} component={Stub} />
          ))}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>,
  );
}
