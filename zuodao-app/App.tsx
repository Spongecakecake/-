// 「做到」App MVP · React Native (Expo) · Material Design 3
import React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/auth';
import { C } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateGoalScreen from './src/screens/CreateGoalScreen';
import GoalDetailScreen from './src/screens/GoalDetailScreen';
import InviteScreen from './src/screens/InviteScreen';
import MemoirScreen from './src/screens/MemoirScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FlagFieldScreen from './src/screens/FlagFieldScreen';
import FlagDetailScreen from './src/screens/FlagDetailScreen';
import FlagFallScreen from './src/screens/FlagFallScreen';
import TemptPickerScreen from './src/screens/TemptPickerScreen';
import ProofRequestScreen from './src/screens/ProofRequestScreen';
import PointsHomeScreen from './src/screens/PointsHomeScreen';
import PointsLedgerScreen from './src/screens/PointsLedgerScreen';
import PointsShopScreen from './src/screens/PointsShopScreen';
import OpsScreen from './src/screens/OpsScreen';

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.surface, primary: C.primary },
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ ch, focused }: { ch: string; focused: boolean }) {
  return (
    <View
      style={{
        width: 48,
        height: 30,
        borderRadius: 15,
        backgroundColor: focused ? C.secondaryContainer : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: focused ? '700' : '500',
          color: focused ? C.onSecondaryContainer : C.onSurfaceVariant,
        }}
      >
        {ch}
      </Text>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.onSurface,
        tabBarInactiveTintColor: C.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: C.surfaceContainer,
          borderTopWidth: 0,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="首页Tab"
        component={HomeScreen}
        options={{ title: '契约', tabBarIcon: ({ focused }) => <TabIcon ch="约" focused={focused} /> }}
      />
      <Tab.Screen
        name="旗场Tab"
        component={FlagFieldScreen}
        options={{ title: '旗场', tabBarIcon: ({ focused }) => <TabIcon ch="旗" focused={focused} /> }}
      />
      <Tab.Screen
        name="积分Tab"
        component={PointsHomeScreen}
        options={{ title: '积分', tabBarIcon: ({ focused }) => <TabIcon ch="分" focused={focused} /> }}
      />
      <Tab.Screen
        name="我的Tab"
        component={ProfileScreen}
        options={{ title: '我的', tabBarIcon: ({ focused }) => <TabIcon ch="我" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { token, ready } = useAuth();
  if (!ready) return null;
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="GoalDetail" component={GoalDetailScreen} />
          <Stack.Screen name="CreateGoal" component={CreateGoalScreen} />
          <Stack.Screen name="Invite" component={InviteScreen} />
          <Stack.Screen name="Memoir" component={MemoirScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="FlagDetail" component={FlagDetailScreen} />
          <Stack.Screen name="FlagFall" component={FlagFallScreen} />
          <Stack.Screen name="TemptPicker" component={TemptPickerScreen} />
          <Stack.Screen name="ProofRequest" component={ProofRequestScreen} />
          <Stack.Screen name="PointsLedger" component={PointsLedgerScreen} />
          <Stack.Screen name="PointsShop" component={PointsShopScreen} />
          <Stack.Screen name="Ops" component={OpsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}
