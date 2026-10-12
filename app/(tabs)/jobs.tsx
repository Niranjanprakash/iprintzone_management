import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useJobs } from '../../src/hooks/useJobs';
import { JobCard } from '../../src/components/JobCard';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Spacing, Radius } from '../../src/utils/theme';
import { DELIVERY_STATUSES, type DeliveryStatus } from '../../src/database/schema';
import { SearchIcon, CloseIcon, SettingsIcon } from '../../src/components/SvgIcons';

export default function JobsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const { jobs, loading, refresh } = useJobs({ search, status });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Jobs</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/jobs/new')}>
          <Text style={styles.addBtnText}>+ New Job</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <SearchIcon size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, phone, ID, description..."
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CloseIcon size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters(v => !v)}
        >
          <SettingsIcon size={20} color={showFilters ? '#fff' : Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusBtn, status === '' && styles.statusActive]}
              onPress={() => setStatus('')}
            >
              <Text style={[styles.statusText, status === '' && styles.statusActiveText]}>All</Text>
            </TouchableOpacity>
            {DELIVERY_STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.statusBtn, status === s && styles.statusActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.statusText, status === s && styles.statusActiveText]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {loading && jobs.length === 0 ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <JobCard job={item} onPress={() => router.push(`/jobs/${item.id}`)} />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard"
              title="No jobs found"
              subtitle={search || status ? 'Try adjusting your search or filters' : 'Tap "+ New Job" to add your first job'}
            />
          }
          contentContainerStyle={jobs.length === 0 ? { flex: 1 } : { paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/jobs/new')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  addBtn: { backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchRow: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.sm },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, height: 44,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  clearIcon: { fontSize: 14, color: Colors.textMuted, padding: 4 },
  filterToggle: {
    width: 44, height: 44, backgroundColor: Colors.card, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
  },
  filterToggleActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterIcon: { fontSize: 18 },
  filterPanel: { backgroundColor: Colors.card, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  statusActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  statusText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  statusActiveText: { color: '#fff', fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 32 },
});
