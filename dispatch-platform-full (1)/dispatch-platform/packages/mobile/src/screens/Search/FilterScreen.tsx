import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../store';
import { setFilters, clearFilters } from '../../store/slices/loadsSlice';
import { selectLoadsFilters } from '../../store/slices/loadsSlice';
import { lightColors as colors } from '../../theme';
import type { LoadStatus, EquipmentType } from '@dispatch/shared';

const FilterScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const currentFilters = useAppSelector(selectLoadsFilters);

  const [status, setStatus] = useState<LoadStatus | undefined>(currentFilters.status);
  const [minPrice, setMinPrice] = useState(currentFilters.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(currentFilters.maxPrice?.toString() || '');
  const [equipmentType, setEquipmentType] = useState<EquipmentType | undefined>(
    currentFilters.equipmentType as EquipmentType | undefined
  );
  const [sortBy, setSortBy] = useState(currentFilters.sortBy || 'price');
  const [sortOrder, setSortOrder] = useState(currentFilters.sortOrder || 'desc');

  const statusOptions: Array<{ value: LoadStatus; label: string }> = [
    { value: 'posted', label: 'Available' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
  ];

  const equipmentOptions: EquipmentType[] = [
    'dry_van', 'reefer', 'flatbed', 'step_deck', 'lowboy', 'tanker', 'hopper', 'livestock', 'car_carrier',
  ];

  const sortOptions = [
    { value: 'price', label: 'Price' },
    { value: 'pickupDate', label: 'Pickup Date' },
    { value: 'distance', label: 'Distance' },
  ];

  const handleApply = () => {
    dispatch(
      setFilters({
        status,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        equipmentType,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      })
    );
    navigation.goBack();
  };

  const handleClear = () => {
    dispatch(clearFilters());
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.chipGroup}>
            <Chip label="All" selected={!status} onPress={() => setStatus(undefined)} />
            {statusOptions.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={status === opt.value}
                onPress={() => setStatus(opt.value)}
              />
            ))}
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range ($)</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              value={minPrice}
              onChangeText={setMinPrice}
              placeholder="Min"
              keyboardType="numeric"
            />
            <Text style={styles.priceSeparator}>—</Text>
            <TextInput
              style={styles.priceInput}
              value={maxPrice}
              onChangeText={setMaxPrice}
              placeholder="Max"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Equipment Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment Type</Text>
          <View style={styles.chipGroup}>
            <Chip label="All" selected={!equipmentType} onPress={() => setEquipmentType(undefined)} />
            {equipmentOptions.map((eq) => (
              <Chip
                key={eq}
                label={eq.replace('_', ' ')}
                selected={equipmentType === eq}
                onPress={() => setEquipmentType(eq)}
              />
            ))}
          </View>
        </View>

        {/* Sort By */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sort By</Text>
          <View style={styles.chipGroup}>
            {sortOptions.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={sortBy === opt.value}
                onPress={() => setSortBy(opt.value as any)}
              />
            ))}
          </View>

          {/* Sort Order */}
          <View style={[styles.chipGroup, styles.sortOrderGroup]}>
            <Chip label="↑ Ascending" selected={sortOrder === 'asc'} onPress={() => setSortOrder('asc')} />
            <Chip label="↓ Descending" selected={sortOrder === 'desc'} onPress={() => setSortOrder('desc')} />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Chip sub-component
const Chip: React.FC<{ label: string; selected: boolean; onPress: () => void }> = ({
  label, selected, onPress,
}) => (
  <TouchableOpacity
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },

  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortOrderGroup: { marginTop: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  chipTextSelected: { color: colors.white, fontWeight: '600' },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInput: {
    flex: 1, height: 48, backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 16, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  priceSeparator: { fontSize: 18, color: colors.textMuted },

  footer: {
    flexDirection: 'row', padding: 24, gap: 12,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  clearButton: {
    flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  clearButtonText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  applyButton: {
    flex: 2, height: 52, backgroundColor: colors.primary, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  applyButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});

export default FilterScreen;
