import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { documentsApi } from '../../services/api';
import type { Document, DocumentType } from '@dispatch/shared';

interface DocumentsState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  uploadProgress: Record<string, number>;
}

const initialState: DocumentsState = {
  documents: [],
  loading: false,
  error: null,
  uploadProgress: {},
};

export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async (
    params: { type?: DocumentType } = {},
    { rejectWithValue }
  ) => {
    try {
      const response = await documentsApi.list(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch documents');
    }
  }
);

export const uploadDocument = createAsyncThunk(
  'documents/uploadDocument',
  async (
    data: { file: any; type: DocumentType; metadata?: any },
    { rejectWithValue }
  ) => {
    try {
      const response = await documentsApi.upload(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload document');
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/deleteDocument',
  async (id: string, { rejectWithValue }) => {
    try {
      await documentsApi.delete(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete document');
    }
  }
);

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setUploadProgress: (
      state,
      action: PayloadAction<{ id: string; progress: number }>
    ) => {
      state.uploadProgress[action.payload.id] = action.payload.progress;
    },
    clearUploadProgress: (state, action: PayloadAction<string>) => {
      delete state.uploadProgress[action.payload];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.data || action.payload;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(uploadDocument.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = [action.payload, ...state.documents];
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter(
          (d) => d.id !== action.payload
        );
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setUploadProgress, clearUploadProgress, clearError } =
  documentsSlice.actions;

export const selectDocuments = (state: any) => state.documents.documents;
export const selectDocumentsLoading = (state: any) => state.documents.loading;
export const selectDocumentsError = (state: any) => state.documents.error;
export const selectUploadProgress = (state: any) =>
  state.documents.uploadProgress;

export default documentsSlice.reducer;
