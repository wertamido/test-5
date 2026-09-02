import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode, Language } from '@dispatch/shared';

interface AppState {
  theme: ThemeMode;
  language: Language;
  isOnline: boolean;
  isLoading: boolean;
  loadingMessage: string | null;
  currentRoute: string | null;
  modals: {
    login: boolean;
    filter: boolean;
    bid: boolean;
    payment: boolean;
    rating: boolean;
    documentUpload: boolean;
  };
  toast: {
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null;
  bottomSheet: {
    visible: boolean;
    content: string | null;
  };
  hapticEnabled: boolean;
  soundEnabled: boolean;
  pushNotificationsEnabled: boolean;
  biometricEnabled: boolean;
  lastSyncAt: string | null;
  appVersion: string;
}

const initialState: AppState = {
  theme: 'system',
  language: 'en',
  isOnline: true,
  isLoading: false,
  loadingMessage: null,
  currentRoute: null,
  modals: {
    login: false,
    filter: false,
    bid: false,
    payment: false,
    rating: false,
    documentUpload: false,
  },
  toast: null,
  bottomSheet: {
    visible: false,
    content: null,
  },
  hapticEnabled: true,
  soundEnabled: true,
  pushNotificationsEnabled: true,
  biometricEnabled: false,
  lastSyncAt: null,
  appVersion: '1.0.0',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload;
    },
    setIsOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setIsLoading: (
      state,
      action: PayloadAction<{ loading: boolean; message?: string }>
    ) => {
      state.isLoading = action.payload.loading;
      state.loadingMessage = action.payload.message || null;
    },
    setCurrentRoute: (state, action: PayloadAction<string | null>) => {
      state.currentRoute = action.payload;
    },
    openModal: (
      state,
      action: PayloadAction<keyof AppState['modals']>
    ) => {
      state.modals[action.payload] = true;
    },
    closeModal: (
      state,
      action: PayloadAction<keyof AppState['modals']>
    ) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key as keyof AppState['modals']] = false;
      });
    },
    showToast: (
      state,
      action: PayloadAction<{
        message: string;
        type: AppState['toast'] extends infer T
          ? T extends { type: infer U }
            ? U
            : never
          : never;
      }>
    ) => {
      state.toast = {
        visible: true,
        message: action.payload.message,
        type: action.payload.type,
      };
    },
    hideToast: (state) => {
      if (state.toast) {
        state.toast.visible = false;
      }
    },
    showBottomSheet: (state, action: PayloadAction<string>) => {
      state.bottomSheet = { visible: true, content: action.payload };
    },
    hideBottomSheet: (state) => {
      state.bottomSheet = { visible: false, content: null };
    },
    setHapticEnabled: (state, action: PayloadAction<boolean>) => {
      state.hapticEnabled = action.payload;
    },
    setSoundEnabled: (state, action: PayloadAction<boolean>) => {
      state.soundEnabled = action.payload;
    },
    setPushNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.pushNotificationsEnabled = action.payload;
    },
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
    setLastSyncAt: (state, action: PayloadAction<string>) => {
      state.lastSyncAt = action.payload;
    },
    resetApp: (state) => {
      // Keep theme, language, and preferences
      const { theme, language, hapticEnabled, soundEnabled } = state;
      Object.assign(state, initialState);
      state.theme = theme;
      state.language = language;
      state.hapticEnabled = hapticEnabled;
      state.soundEnabled = soundEnabled;
    },
  },
});

export const {
  setTheme,
  setLanguage,
  setIsOnline,
  setIsLoading,
  setCurrentRoute,
  openModal,
  closeModal,
  closeAllModals,
  showToast,
  hideToast,
  showBottomSheet,
  hideBottomSheet,
  setHapticEnabled,
  setSoundEnabled,
  setPushNotificationsEnabled,
  setBiometricEnabled,
  setLastSyncAt,
  resetApp,
} = appSlice.actions;

export const selectTheme = (state: any) => state.app.theme;
export const selectLanguage = (state: any) => state.app.language;
export const selectIsOnline = (state: any) => state.app.isOnline;
export const selectIsLoading = (state: any) => state.app.isLoading;
export const selectLoadingMessage = (state: any) => state.app.loadingMessage;
export const selectModals = (state: any) => state.app.modals;
export const selectToast = (state: any) => state.app.toast;
export const selectBottomSheet = (state: any) => state.app.bottomSheet;

export default appSlice.reducer;
