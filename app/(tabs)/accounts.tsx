import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getAllPayments } from '../../src/database/paymentsRepository';
import { getDashboardStats } from '../../src/database/jobsRepository';
import { SummaryCard } from '../../src/components/SummaryCard';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors, Spacing, Radius } from '../../src/utils/theme';
import { formatINR } from '../../src/utils/currency';
import { formatDate, todayISO, monthStartISO } from '../../src/utils/dates';
import type { AccountType } from '../../src/database/schema';

type TabType = 'all' | 'C' | 'SVK';

export default function AccountsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabType>('all');
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        getAllPayments({ accountType: tab === 'all' ? undefined : tab as AccountType }),
        getDashboardStats(),
      ]);
      setPayments(p);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'All Payments' },
    { key: 'C', label: 'Customer' },
    { key: 'SVK', label: 'SVK Supplier' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts & Payments</Text>
      </View>

      {/* Summary */}
      {stats && (
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <SummaryCard label="Customer Outstanding" value={formatINR(stats.customerOutstanding)} color={stats.customerOutstanding > 0 ? Colors.balanceColor : Colors.success} small />
            <SummaryCard label="SVK Payable" value={formatINR(stats.svkOutstanding)} color={stats.svkOutstanding > 0 ? Colors.warning : Colors.success} small />
          </View>
          <View style={styles.summaryRow}>
            <SummaryCard label="Total Collected" value={formatINR(stats.totalCustomerCollected)} color={Colors.success} small />
            <SummaryCard label="Total SVK Paid" value={formatINR(stats.totalSVKPaid)} color={Colors.svkColor} small />
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabActiveText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.paymentCard} onPress={() => router.push(`/jobs/${item.job_id}`)}>
              <View style={styles.paymentLeft}>
                <View style={[styles.typeBadge, { backgroundColor: item.account_type === 'C' ? Colors.customerColor + '20' : Colors.svkColor + '20' }]}>
                  <Text style={[styles.typeText, { color: item.account_type === 'C' ? Colors.customerColor : Colors.svkColor }]}>
                    {item.account_type === 'C' ? 'Customer' : 'SVK'}
                  </Text>
                </View>
                <Text style={styles.clientName}>{item.client_name}</Text>
                <Text style={styles.paymentMeta}>Job #{item.job_id} · {formatDate(item.payment_date)}</Text>
                <Text style={styles.paymentMethod}>{item.payment_method}{item.reference_number ? ` · ${item.reference_number}` : ''}</Text>
              </View>
              <Text style={[styles.amount, { color: item.account_type === 'C' ? Colors.success : Colors.svkColor }]}>
                {formatINR(item.amount_paise)}
              </Text>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.accent} />}
          ListEmptyComponent={<EmptyState icon="card" title="No payments found" subtitle="Payments will appear here once recorded" />}
          contentContainerStyle={payments.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  summarySection: { padding: Spacing.md },
  summaryRow: { flexDirection: 'row' },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  tabActiveText: { color: Colors.accent, fontWeight: '700' },
  paymentCard: {
    backgroundColor: Colors.card, marginHorizontal: Spacing.lg, marginVertical: Spacing.xs,
    borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', elevation: 1,
  },
  paymentLeft: { flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 4 },
  typeText: { fontSize: 11, fontWeight: '700' },
  clientName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  paymentMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  paymentMethod: { fontSize: 11, color: Colors.textMuted },
  amount: { fontSize: 16, fontWeight: '800', marginLeft: Spacing.md },
});
