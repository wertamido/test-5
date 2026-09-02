import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchLoads,
  setFilters,
  resetLoads,
  selectLoads,
  selectLoadsLoading,
  selectHasMoreLoads,
  selectLoadsFilters,
} from '../../store/slices/loadsSlice';
import { lightColors as colors } from '../../theme';
import { LoadCard } from '../../components/LoadCard';
import type { Load, LoadStatus } from '@dispatch/shared';

const SearchScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const loads = useAppSelector(selectLoads);
  const loading = useAppSelector(selectLoadsLoading);
  const hasMore = useAppSelector(selectHasMoreLoads);
  const filters = useAppSelector(selectLoadsFilters);

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLoads(1, true);
  }, [filters]);

  const loadLoads = (page: number, reset = false) => {
    dispatch(fetchLoads({ ...filters, page }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(resetLoads());
    await dispatch(fetchLoads({ ...filters, page: 1 }));
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadLoads((filters as any).page + 1);
    }
  };

  const handleFilter = () => {
    navigation.navigate('FilterScreen');
  };

  const renderLoadItem = ({ item }: { item: Load }) => (
    <LoadCard
      load={item}
      onPress={() => navigation.navigate('LoadDetails', { loadId: item.id })}
    />
  );

  const renderFooter = () => {
    if (!loading) return null;
    return <ActivityIndicator size="large" color={colors.primary} style={styles.footerLoader} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search city, state, or ZIP..."
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={handleFilter}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(filters.status || filters.equipmentType || filters.minPrice) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFilters}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {filters.status && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{filters.status}</Text>
              <TouchableOpacity onPress={() => dispatch(setFilters({ status: undefined }))}>
                <Text style={styles.filterChipRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {filters.equipmentType && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{filters.equipmentType}</Text>
              <TouchableOpacity onPress={() => dispatch(setFilters({ equipmentType: undefined }))}>
                <Text style={styles.filterChipRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Results */}
      <FlatList
        data={loads}
        renderItem={renderLoadItem}
        keyExtractor={(item) => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No loads found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters</Text>
            </View>
          ) : null
        }
        contentContainerStyle={loads.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Floating Action Button - Post Load (for shippers) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateLoad')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  searchHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 44, backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  clearIcon: { fontSize: 14, color: colors.textMuted, padding: 4 },

  filterButton: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  filterIcon: { fontSize: 18 },

  activeFilters: { maxHeight: 50, paddingVertical: 4 },
  activeFiltersContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30',
  },
  filterChipText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  filterChipRemove: { fontSize: 12, color: colors.primary, marginLeft: 4 },

  footerLoader: { marginVertical: 20 },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyContainer: { flex: 1 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 4 },
  emptyText: { fontSize: 14, color: colors.textSecondary },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  fabIcon: { fontSize: 28, color: colors.white, fontWeight: '300' },
});

export default SearchScreen;
