import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchConversations,
  selectConversations,
  selectMessagesLoading,
} from '../../store/slices/messagesSlice';
import { lightColors as colors } from '../../theme';
import type { Conversation } from '@dispatch/shared';

const ConversationsListScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const conversations = useAppSelector(selectConversations);
  const loading = useAppSelector(selectMessagesLoading);

  useEffect(() => {
    dispatch(fetchConversations());
  }, []);

  const handleOpenConversation = (conversation: Conversation) => {
    const otherParticipant = conversation.participants?.find(
      (p) => p.id !== 'current-user-id' // Replace with actual user ID
    );
    navigation.navigate('ChatScreen', {
      conversationId: conversation.id,
      participantName: otherParticipant?.companyName || otherParticipant?.firstName || 'Chat',
    });
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherParticipant = item.participants?.find(
      (p) => p.id !== 'current-user-id'
    );
    const initials = (otherParticipant?.companyName || otherParticipant?.firstName || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleOpenConversation(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
          {item.online && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {otherParticipant?.companyName || otherParticipant?.firstName || 'Unknown'}
            </Text>
            <Text style={styles.conversationTime}>
              {item.lastMessage
                ? new Date(item.lastMessage.createdAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : ''}
            </Text>
          </View>

          <View style={styles.conversationPreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage?.content || 'No messages yet'}
            </Text>
            {item.unreadCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => dispatch(fetchConversations())}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Start chatting with shippers or carriers from load details
              </Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },

  conversationItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  onlineIndicator: {
    position: 'absolute', bottom: 0, right: 0, width: 12, height: 12,
    borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.white,
  },

  conversationContent: { flex: 1 },
  conversationHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  conversationName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 },
  conversationTime: { fontSize: 11, color: colors.textMuted },

  conversationPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 13, color: colors.textSecondary, flex: 1, marginRight: 8 },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  loader: { marginVertical: 40 },
});

export default ConversationsListScreen;
