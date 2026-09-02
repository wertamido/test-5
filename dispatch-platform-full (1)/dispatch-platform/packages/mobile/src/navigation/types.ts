import type { NavigatorScreenParams } from '@react-navigation/native';

// ─── Root Stack Param List ─────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  LoadDetails: { loadId: string };
  CreateLoad: undefined;
  BidScreen: { loadId: string };
  TripDetails: { tripId: string };
  ChatScreen: { conversationId: string; participantName?: string };
  PaymentScreen: { tripId: string; amount: number };
  RatingScreen: { tripId: string; ratedUserId: string };
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Documents: undefined;
  UploadDocument: { type: string };
  Vehicles: undefined;
  AddVehicle: undefined;
  EditVehicle: { vehicleId: string };
  Earnings: undefined;
  Subscription: undefined;
  Notifications: undefined;
  MapView: { loadId?: string; tripId?: string };
  FilterScreen: undefined;
  WebView: { url: string; title?: string };
  AdminPanel: undefined;
};

// ─── Auth Stack ───────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: { role?: 'shipper' | 'carrier' };
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyPhone: undefined;
  Setup2FA: undefined;
};

// ─── Main Tab Param List ──────────────────────────────────────────────────────

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  ActiveTrip: undefined;
  Messages: undefined;
  Account: undefined;
};

// ─── Home Stack ───────────────────────────────────────────────────────────────

export type HomeStackParamList = {
  HomeScreen: undefined;
  LoadDetails: { loadId: string };
  CreateLoad: undefined;
  FilterScreen: undefined;
};

// ─── Search Stack ─────────────────────────────────────────────────────────────

export type SearchStackParamList = {
  SearchScreen: undefined;
  LoadDetails: { loadId: string };
  MapView: { loadId?: string };
};

// ─── Trip Stack ───────────────────────────────────────────────────────────────

export type TripStackParamList = {
  ActiveTripScreen: undefined;
  TripDetails: { tripId: string };
  MapView: { tripId: string };
  PaymentScreen: { tripId: string; amount: number };
};

// ─── Messages Stack ───────────────────────────────────────────────────────────

export type MessagesStackParamList = {
  ConversationsList: undefined;
  ChatScreen: { conversationId: string; participantName?: string };
};

// ─── Account Stack ────────────────────────────────────────────────────────────

export type AccountStackParamList = {
  AccountScreen: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Documents: undefined;
  Vehicles: undefined;
  Earnings: undefined;
  Subscription: undefined;
  Notifications: undefined;
};

// ─── Navigation Helpers ───────────────────────────────────────────────────────

import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

export const useRootNavigation = () => useNavigation<RootNavigationProp>();
export const useTabNavigation = () => useNavigation<MainTabNavigationProp>();
export const useRouteParams = <T = any>() => useRoute<T>();
