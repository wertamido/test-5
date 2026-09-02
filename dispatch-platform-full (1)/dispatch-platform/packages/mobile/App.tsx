/**
 * FreightConnect Mobile App - Main App Component
 * 
 * Architecture:
 * - React Navigation (Native Stack + Bottom Tabs + Drawer)
 * - Redux Toolkit for state management
 * - Socket.IO for real-time updates
 * - i18next for internationalization
 * - React Native Paper for UI components
 * 
 * Screens:
 * - Auth (Login, Register, Forgot Password)
 * - Main (Loads, Map, Messages, Profile)
 * - Load Details, Bidding, Trip Tracking
 * - Earnings, Documents, Settings
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, Platform, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, DefaultTheme, DarkTheme } from 'react-native-paper';
import { Provider as StoreProvider } from 'react-redux';
import { NavigationContainer, DarkTheme as NavDark, DefaultTheme as NavLight } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import FlashMessage from 'react-native-flash-message';
import { io, Socket } from 'socket.io-client';

// Store
import { store } from './src/store';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { setTheme, setOnlineStatus } from './src/store/slices/appSlice';
import { checkAuth } from './src/store/slices/authSlice';

// Navigation
import { RootStackParamList, MainTabParamList, DrawerParamList } from './src/navigation/types';

// Screens
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from './src/screens/auth/ForgotPasswordScreen';
import { VerifyScreen } from './src/screens/auth/VerifyScreen';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';

import { HomeScreen } from './src/screens/main/HomeScreen';
import { LoadsScreen } from './src/screens/main/LoadsScreen';
import { MapScreen } from './src/screens/main/MapScreen';
import { MessagesScreen } from './src/screens/main/MessagesScreen';
import { ProfileScreen } from './src/screens/main/ProfileScreen';
import { EarningsScreen } from './src/screens/main/EarningsScreen';
import { DocumentsScreen } from './src/screens/main/DocumentsScreen';
import { SettingsScreen } from './src/screens/main/SettingsScreen';

import { LoadDetailsScreen } from './src/screens/loads/LoadDetailsScreen';
import { CreateLoadScreen } from './src/screens/loads/CreateLoadScreen';
import { BiddingScreen } from './src/screens/loads/BiddingScreen';
import { TripTrackingScreen } from './src/screens/trips/TripTrackingScreen';
import { ConversationScreen } from './src/screens/messages/ConversationScreen';
import { NotificationsScreen } from './src/screens/main/NotificationsScreen';
import { SearchScreen } from './src/screens/main/SearchScreen';

// Services
import { notificationService } from './src/services/notification.service';
import { locationService } from './src/services/location.service';
import { i18n } from './src/i18n';

// ============================================================================
// NAVIGATION SETUP
// ============================================================================

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// ============================================================================
// THEME CONFIGURATION
// ============================================================================

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1B5E20',       // Deep green
    accent: '#FF6F00',         // Amber
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#212121',
    secondaryText: '#757575',
    border: '#E0E0E0',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    card: '#FFFFFF',
    notification: '#FF6F00',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 20, round: 999 },
};

const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#4CAF50',
    accent: '#FFB74D',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    secondaryText: '#AAAAAA',
    border: '#333333',
    success: '#66BB6A',
    warning: '#FFB74D',
    error: '#EF5350',
    info: '#64B5F6',
    card: '#1E1E1E',
    notification: '#FFB74D',
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
};

// ============================================================================
// MAIN TABS (after authentication)
// ============================================================================

function MainTabs() {
  const { theme } = useAppSelector((state) => state.app);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondaryText,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingTop: 4,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 84 : 60,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Loads"
        component={LoadsScreen}
        options={{
          title: 'Loads',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="truck-delivery" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Live Map',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-path" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ============================================================================
// DRAWER (side menu with additional options)
// ============================================================================

function MainDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: { width: 280 },
        headerShown: false,
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainTabs} options={{ title: 'Home' }} />
      <Drawer.Screen name="Earnings" component={EarningsScreen} options={{ title: '💰 Earnings' }} />
      <Drawer.Screen name="Documents" component={DocumentsScreen} options={{ title: '📄 Documents' }} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} options={{ title: '🔔 Notifications' }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: '⚙️ Settings' }} />
    </Drawer.Navigator>
  );
}

// ============================================================================
// ROOT NAVIGATION (handles auth state)
// ============================================================================

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const { theme } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();

  if (isLoading) {
    // Show splash/loading
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="Verify" component={VerifyScreen} />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="Main" component={MainDrawer} />
          <Stack.Screen
            name="LoadDetails"
            component={LoadDetailsScreen}
            options={{ headerShown: true, title: 'Load Details' }}
          />
          <Stack.Screen
            name="CreateLoad"
            component={CreateLoadScreen}
            options={{ headerShown: true, title: 'Post a Load' }}
          />
          <Stack.Screen
            name="Bidding"
            component={BiddingScreen}
            options={{ headerShown: true, title: 'Place Bid' }}
          />
          <Stack.Screen
            name="TripTracking"
            component={TripTrackingScreen}
            options={{ headerShown: true, title: 'Trip Tracking' }}
          />
          <Stack.Screen
            name="Conversation"
            component={ConversationScreen}
            options={{ headerShown: true, title: 'Messages' }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ headerShown: true, title: 'Search' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { theme: themeMode } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Check authentication status on app start
    dispatch(checkAuth());

    // Initialize push notifications
    notificationService.initialize();

    // Initialize location tracking (for drivers)
    locationService.initialize();

    // Connect to WebSocket
    const newSocket = io(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: { token: store.getState().auth.token },
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
    });

    // Global socket event listeners
    newSocket.on('load:created', (data) => {
      // Handle new load notification
    });

    newSocket.on('bid:received', (data) => {
      // Handle new bid
    });

    newSocket.on('trip:location_update', (data) => {
      // Update trip location in store
    });

    newSocket.on('message:received', (data) => {
      // Handle new message
    });

    setSocket(newSocket);

    // App state change handler (foreground/background)
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        dispatch(setOnlineStatus(true));
      } else {
        dispatch(setOnlineStatus(false));
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      newSocket.disconnect();
      subscription.remove();
    };
  }, []);

  const paperTheme = themeMode === 'dark' ? darkTheme : lightTheme;
  const navTheme = themeMode === 'dark' ? NavDark : NavLight;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider store={store}>
          <PaperProvider theme={paperTheme}>
            <NavigationContainer theme={navTheme}>
              <StatusBar
                barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={paperTheme.colors.primary}
              />
              <RootNavigator />
              <FlashMessage position="top" />
            </NavigationContainer>
          </PaperProvider>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
