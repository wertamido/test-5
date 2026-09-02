import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchLoads,
  selectLoads,
  selectLoadsLoading,
} from '../../store/slices/loadsSlice';
import { selectUser } from '../../store/slices/authSlice';
import { lightColors as colors } from '../../theme';
import { LoadCard } from '../../components/LoadCard';
import type { Load } from '@dispatch/shared';

const HomeScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const loads = useAppSelector(selectLoads);
  const loading = useAppSelector(selectLoadsLoading);
  const user = useAppSelector(selectUser);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchLoads({ status: 'posted', sortBy: 'price', sortOrder: 'desc' }));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchLoads({ status: 'posted', sortBy: 'price', sortOrder: 'desc' }));
    setRefreshing(false);
  };

  const renderLoadItem = ({ item }: { item: Load }) => (
    <LoadCard
      load={item}
      onPress={() => navigation.navigate('LoadDetails', { loadId: item.id })}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.firstName || 'Driver'} 👋</Text>
          <Text style={styles.subtitle}>Find your next load</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.notificationIcon}>🔔</Text>
          {/* Badge could go here */}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActions}
          contentContainerStyle={styles.quickActionsContent}
        >
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.quickActionIcon}>🔍</Text>
            <Text style={styles.quickActionText}>Search Loads</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('MapView')}
          >
            <Text style={styles.quickActionIcon}>🗺️</Text>
            <Text style={styles.quickActionText}>Live Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.secondary }]}
            onPress={() => navigation.navigate('ActiveTrip')}
          >
            <Text style={styles.quickActionIcon}>🚛</Text>
            <Text style={styles.quickActionText}>Active Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.info }]}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.quickActionIcon}>💰</Text>
            <Text style={styles.quickActionText}>Earnings</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primary + '15' }]}>
            <Text style={styles.statValue}>$12,450</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.accent + '15' }]}>
            <Text style={styles.statValue}>23</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.secondary + '15' }]}>
            <Text style={styles.statValue}>4.8 ⭐</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Available Loads Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Loads</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Loads List */}
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={loads.slice(0, 5)}
            renderItem={renderLoadItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No loads available</Text>
              </View>
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  notificationButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  notificationIcon: { fontSize: 20 },

  scrollView: { flex: 1 },

  quickActions: { maxHeight: 100, marginVertical: 8 },
  quickActionsContent: { paddingHorizontal: 16, gap: 12 },
  quickAction: {
    width: 100, height: 80, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', padding: 8,
  },
  quickActionIcon: { fontSize: 28, marginBottom: 4 },
  quickActionText: { color: colors.white, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginVertical: 16 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12, marginTop: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  seeAll: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  loader: { marginVertical: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary },
});

export default HomeScreen;
