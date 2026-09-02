import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { messagesApi } from '../../services/api';
import type { Message, Conversation } from '@dispatch/shared';

interface MessagesState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  typingUsers: Record<string, boolean>;
  onlineUsers: Record<string, boolean>;
}

const initialState: MessagesState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  typingUsers: {},
  onlineUsers: {},
};

export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messagesApi.getConversations();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch conversations');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (
    { conversationId, page = 1 }: { conversationId: string; page?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await messagesApi.getMessages(conversationId, page);
      return { conversationId, ...response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (
    data: { conversationId: string; content: string; type?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await messagesApi.send(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

export const createConversation = createAsyncThunk(
  'messages/createConversation',
  async (
    data: { participantIds: string[]; loadId?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await messagesApi.createConversation(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create conversation');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'messages/markAsRead',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await messagesApi.markAsRead(conversationId);
      return conversationId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark as read');
    }
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setCurrentConversation: (
      state,
      action: PayloadAction<Conversation | null>
    ) => {
      state.currentConversation = action.payload;
      if (action.payload) {
        state.messages = [];
      }
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      // Avoid duplicates
      if (!state.messages.find((m) => m.id === action.payload.id)) {
        state.messages.push(action.payload);
      }
      // Update conversation last message
      const conv = state.conversations.find(
        (c) => c.id === action.payload.conversationId
      );
      if (conv) {
        conv.lastMessage = action.payload;
        conv.updatedAt = new Date().toISOString();
      }
    },
    prependMessages: (state, action: PayloadAction<Message[]>) => {
      const newMessages = action.payload.filter(
        (m) => !state.messages.find((sm) => sm.id === m.id)
      );
      state.messages = [...newMessages, ...state.messages];
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    updateMessage: (state, action: PayloadAction<Message>) => {
      const idx = state.messages.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) state.messages[idx] = action.payload;
    },
    deleteMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter((m) => m.id !== action.payload);
    },
    setTyping: (
      state,
      action: PayloadAction<{ userId: string; isTyping: boolean }>
    ) => {
      state.typingUsers[action.payload.userId] = action.payload.isTyping;
    },
    setOnline: (
      state,
      action: PayloadAction<{ userId: string; isOnline: boolean }>
    ) => {
      state.onlineUsers[action.payload.userId] = action.payload.isOnline;
    },
    incrementUnread: (state, action: PayloadAction<string>) => {
      const conv = state.conversations.find((c) => c.id === action.payload);
      if (conv) conv.unreadCount = (conv.unreadCount || 0) + 1;
    },
    clearUnread: (state, action: PayloadAction<string>) => {
      const conv = state.conversations.find((c) => c.id === action.payload);
      if (conv) conv.unreadCount = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload.data || action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { messages } = action.payload;
        if (action.meta.arg.page === 1) {
          state.messages = messages;
        } else {
          // Prepend older messages
          const newOnes = messages.filter(
            (m: Message) => !state.messages.find((sm) => sm.id === m.id)
          );
          state.messages = [...newOnes, ...state.messages];
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload);
        // Update conversation
        const conv = state.conversations.find(
          (c) => c.id === action.payload.conversationId
        );
        if (conv) {
          conv.lastMessage = action.payload;
          conv.updatedAt = new Date().toISOString();
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(createConversation.fulfilled, (state, action) => {
        if (!state.conversations.find((c) => c.id === action.payload.id)) {
          state.conversations = [action.payload, ...state.conversations];
        }
        state.currentConversation = action.payload;
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(markAsRead.fulfilled, (state, action) => {
        const conv = state.conversations.find((c) => c.id === action.payload);
        if (conv) conv.unreadCount = 0;
        state.messages = state.messages.map((m) =>
          m.conversationId === action.payload && m.senderId !== 'me'
            ? { ...m, readAt: new Date().toISOString() }
            : m
        );
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setCurrentConversation,
  addMessage,
  prependMessages,
  setMessages,
  updateMessage,
  deleteMessage,
  setTyping,
  setOnline,
  incrementUnread,
  clearUnread,
  clearError,
} = messagesSlice.actions;

export const selectConversations = (state: any) => state.messages.conversations;
export const selectCurrentConversation = (state: any) =>
  state.messages.currentConversation;
export const selectMessages = (state: any) => state.messages.messages;
export const selectTypingUsers = (state: any) => state.messages.typingUsers;
export const selectOnlineUsers = (state: any) => state.messages.onlineUsers;
export const selectTotalUnread = (state: any) =>
  state.messages.conversations.reduce(
    (sum: number, c: Conversation) => sum + (c.unreadCount || 0),
    0
  );
export const selectMessagesLoading = (state: any) => state.messages.loading;
export const selectMessagesError = (state: any) => state.messages.error;

export default messagesSlice.reducer;
