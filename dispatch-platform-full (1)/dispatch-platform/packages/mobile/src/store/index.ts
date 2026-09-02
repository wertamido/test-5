import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';

import appReducer from './slices/appSlice';
import authReducer from './slices/authSlice';
import loadsReducer from './slices/loadsSlice';
import tripsReducer from './slices/tripsSlice';
import bidsReducer from './slices/bidsSlice';
import paymentsReducer from './slices/paymentsSlice';
import messagesReducer from './slices/messagesSlice';
import notificationsReducer from './slices/notificationsSlice';
import trackingReducer from './slices/trackingSlice';
import vehiclesReducer from './slices/vehiclesSlice';
import documentsReducer from './slices/documentsSlice';

// ─── Persist Config ───────────────────────────────────────────────────────────

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['accessToken', 'refreshToken', 'user', 'isAuthenticated', 'role'],
};

const appPersistConfig = {
  key: 'app',
  storage: AsyncStorage,
  whitelist: [
    'theme',
    'language',
    'hapticEnabled',
    'soundEnabled',
    'pushNotificationsEnabled',
    'biometricEnabled',
  ],
};

// ─── Root Reducer ─────────────────────────────────────────────────────────────

const rootReducer = combineReducers({
  app: persistReducer(appPersistConfig, appReducer),
  auth: persistReducer(authPersistConfig, authReducer),
  loads: loadsReducer,
  trips: tripsReducer,
  bids: bidsReducer,
  payments: paymentsReducer,
  messages: messagesReducer,
  notifications: notificationsReducer,
  tracking: trackingReducer,
  vehicles: vehiclesReducer,
  documents: documentsReducer,
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user.createdAt', 'auth.user.updatedAt'],
      },
      immutableCheck: {
        // Ignore large/complex objects
        ignoredPaths: ['tracking.locationHistory'],
      },
    }),
  devTools: __DEV__,
});

// ─── Persistor ────────────────────────────────────────────────────────────────

export const persistor = persistStore(store);

// ─── Types ───────────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ─── Typed Hooks ─────────────────────────────────────────────────────────────

import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
