import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchMessages,
  sendMessage,
  selectMessages,
  selectMessagesLoading,
  markAsRead,
} from '../../store/slices/messagesSlice';
import { emitTyping } from '../../services/socketService';
import { lightColors as colors } from '../../theme';
import type { Message } from '@dispatch/shared';

const ChatScreen = ({ route, navigation }: any) => {
  const { conversationId, participantName } = route.params;
  const dispatch = useAppDispatch();
  const messages = useAppSelector(selectMessages);
  const loading = useAppSelector(selectMessagesLoading);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (conversationId) {
      dispatch(fetchMessages({ conversationId }));
      dispatch(markAsRead(conversationId));
    }
  }, [conversationId]);

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId) return;

    setSending(true);
    const text = inputText.trim();
    setInputText('');

    await dispatch(
      sendMessage({
        conversationId,
        content: text,
        type: 'text',
      })
    );
    setSending(false);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === 'me' || item.senderId === 'current-user-id';
    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
        <View style={[styles.messageBubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextTheirs]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMine ? styles.messageTimeMine : styles.messageTimeTheirs]}>
            {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{participantName || 'Chat'}</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
        <TouchableOpacity style={styles.callButton}>
          <Text style={styles.callIcon}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color={colors.primary} />
          )
        }
      />

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputBar}
      >
        <TouchableOpacity style={styles.attachButton}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          onFocus={() => emitTyping(conversationId, true)}
          onBlur={() => emitTyping(conversationId, false)}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: 4 },
  backIcon: { fontSize: 28, color: colors.primary, fontWeight: '300' },
  headerInfo: { flex: 1, marginLeft: 8 },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerStatus: { fontSize: 12, color: colors.success },
  callButton: { padding: 8 },
  callIcon: { fontSize: 20 },

  messagesList: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },

  messageRow: { marginBottom: 12, maxWidth: '80%' },
  messageRowMine: { alignSelf: 'flex-end' },
  messageRowTheirs: { alignSelf: 'flex-start' },

  messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },

  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextMine: { color: colors.white },
  messageTextTheirs: { color: colors.text },

  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeMine: { color: colors.white + '80' },
  messageTimeTheirs: { color: colors.textMuted },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12,
    paddingVertical: 8, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 8,
  },
  attachButton: { padding: 8 },
  attachIcon: { fontSize: 22, color: colors.textSecondary },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.background, borderRadius: 20, fontSize: 15,
    color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendIcon: { color: colors.white, fontSize: 18, marginLeft: -2 },
});

export default ChatScreen;
