import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDashboard } from '../../src/hooks/useDashboard';
import { SummaryCard } from '../../src/components/SummaryCard';
import { JobCard } from '../../src/components/JobCard';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Spacing, Radius } from '../../src/utils/theme';
import { formatINR } from '../../src/utils/currency';
import { formatDate, todayISO, weekStartISO, monthStartISO } from '../../src/utils/dates';

type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function DashboardScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<DateFilter>('all');

  const getDateRange = () => {
    const today = todayISO();
    if (filter === 'today') return { from: today, to: today };
    if (filter === 'week') return { from: weekStartISO(), to: today };
    if (filter === 'month') return { from: monthStartISO(), to: today };
    return { from: undefined, to: undefined };
  };

  const { from, to } = getDateRange();
  const { data, loading, refresh } = useDashboard(from, to);

  const filters: { key: DateFilter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>IprintZone Manager</Text>
          <Text style={styles.subtitle}>Business Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/jobs/new')}>
          <Text style={styles.addBtnText}>+ Add Job</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterActiveText]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && !data ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : data ? (
          <>
            {/* Job Counts */}
            <Text style={styles.sectionTitle}>Job Overview</Text>
            <View style={styles.cardRow}>
              <SummaryCard label="Total Jobs" value={String(data.totalJobs)} color={Colors.primary} />
              <SummaryCard label="Today's Jobs" value={String(data.todayJobs)} color={Colors.accent} />
            </View>
            <View style={styles.cardRow}>
              <SummaryCard label="Awaiting Delivery" value={String(data.awaitingDelivery)} color={Colors.warning} />
              <SummaryCard label="Delivered" value={String(data.deliveredJobs)} color={Colors.success} />
            </View>

            {/* Customer Account */}
            <Text style={styles.sectionTitle}>Customer Account</Text>
            <View style={styles.cardRow}>
              <SummaryCard label="Total Billed" value={formatINR(data.totalCustomerBilling)} color={Colors.customerColor} />
              <SummaryCard label="Collected" value={formatINR(data.totalCustomerCollected)} color={Colors.success} />
            </View>
            <View style={styles.cardRow}>
              <SummaryCard label="Outstanding" value={formatINR(data.customerOutstanding)} color={data.customerOutstanding > 0 ? Colors.balanceColor : Colors.success} />
            </View>

            {/* SVK Account */}
            <Text style={styles.sectionTitle}>SVK Supplier Account</Text>
            <View style={styles.cardRow}>
              <SummaryCard label="Production Cost" value={formatINR(data.totalSVKCost)} color={Colors.svkColor} />
              <SummaryCard label="SVK Paid" value={formatINR(data.totalSVKPaid)} color={Colors.success} />
            </View>
            <View style={styles.cardRow}>
              <SummaryCard label="SVK Payable" value={formatINR(data.svkOutstanding)} color={data.svkOutstanding > 0 ? Colors.warning : Colors.success} />
            </View>

            {/* IPZ Profit */}
            <Text style={styles.sectionTitle}>IPZ Profit Summary</Text>
            <View style={styles.cardRow}>
              <SummaryCard label="Revenue" value={formatINR(data.totalIPZRevenue)} color={Colors.primary} />
              <SummaryCard label="Expenses" value={formatINR(data.totalExpenses)} color={Colors.error} />
            </View>
            <View style={styles.profitCard}>
              <Text style={styles.profitLabel}>Total IPZ Profit</Text>
              <Text style={[styles.profitValue, { color: data.totalIPZProfit >= 0 ? Colors.success : Colors.error }]}>
                {formatINR(data.totalIPZProfit)}
              </Text>
            </View>

            {/* Recent Jobs */}
            {data.recentJobs.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Jobs</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
                    <Text style={styles.seeAll}>See All</Text>
                  </TouchableOpacity>
                </View>
                {data.recentJobs.map(job => (
                  <JobCard key={job.id} job={job} onPress={() => router.push(`/jobs/${job.id}`)} />
                ))}
              </>
            )}

            {/* Upcoming Deliveries */}
            {data.upcomingDeliveries.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Upcoming Deliveries</Text>
                {data.upcomingDeliveries.map(job => (
                  <TouchableOpacity
                    key={job.id}
                    style={styles.deliveryItem}
                    onPress={() => router.push(`/jobs/${job.id}`)}
                  >
                    <View>
                      <Text style={styles.deliveryClient}>{job.client_name}</Text>
                      <Text style={styles.deliveryDesc} numberOfLines={1}>{job.job_description}</Text>
                    </View>
                    <View style={styles.deliveryRight}>
                      <Text style={styles.deliveryDate}>{formatDate(job.expected_delivery_date)}</Text>
                      <Text style={styles.deliveryStatus}>{job.delivery_status}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={{ height: 24 }} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  appName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  addBtn: { backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  filterRow: { paddingVertical: Spacing.md },
  filterContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  filterActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  filterActiveText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, marginBottom: Spacing.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: Spacing.lg },
  seeAll: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  cardRow: { flexDirection: 'row', paddingHorizontal: Spacing.md },
  profitCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  profitLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  profitValue: { fontSize: 28, fontWeight: '800' },
  deliveryItem: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  deliveryClient: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  deliveryDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  deliveryRight: { alignItems: 'flex-end' },
  deliveryDate: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  deliveryStatus: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
