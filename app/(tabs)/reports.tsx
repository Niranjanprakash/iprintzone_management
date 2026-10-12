import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator,
} from 'react-native';
import { getSupabase } from '../../src/database/supabaseClient';
import { EmptyState } from '../../src/components/EmptyState';
import { AppSvgIcon } from '../../src/components/SvgIcons';
import { Colors, Spacing, Radius } from '../../src/utils/theme';
import { formatINR } from '../../src/utils/currency';
import { formatDate, todayISO, weekStartISO, monthStartISO } from '../../src/utils/dates';

type ReportType =
  | 'daily'
  | 'monthly'
  | 'customer_outstanding'
  | 'svk_outstanding'
  | 'customer_collection'
  | 'svk_payment'
  | 'expenses'
  | 'job_profit'
  | 'monthly_revenue'
  | 'delivery_pending';

type DateFilter = 'today' | 'week' | 'month' | 'all';

const REPORTS: { key: ReportType; label: string; icon: string }[] = [
  { key: 'daily', label: 'Daily Job Register', icon: 'daily' },
  { key: 'monthly', label: 'Monthly Job Register', icon: 'monthly' },
  { key: 'customer_outstanding', label: 'Customer Outstanding', icon: 'customer_outstanding' },
  { key: 'svk_outstanding', label: 'SVK Outstanding', icon: 'svk_outstanding' },
  { key: 'customer_collection', label: 'Customer Collections', icon: 'customer_collection' },
  { key: 'svk_payment', label: 'SVK Payments', icon: 'svk_payment' },
  { key: 'expenses', label: 'Production Expenses', icon: 'expenses' },
  { key: 'job_profit', label: 'Job-wise Profit', icon: 'job_profit' },
  { key: 'monthly_revenue', label: 'Monthly Revenue & Profit', icon: 'monthly_revenue' },
  { key: 'delivery_pending', label: 'Delivery Pending', icon: 'delivery_pending' },
];

export default function ReportsScreen() {
  const [activeReport, setActiveReport] = useState<ReportType>('daily');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState<Record<string, number>>({});

  const getDateRange = () => {
    const today = todayISO();
    if (dateFilter === 'today') return { from: today, to: today };
    if (dateFilter === 'week') return { from: weekStartISO(), to: today };
    if (dateFilter === 'month') return { from: monthStartISO(), to: today };
    return { from: '2000-01-01', to: '2099-12-31' };
  };

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { from, to } = getDateRange();
      let rows: any[] = [];
      let t: Record<string, number> = {};

      switch (activeReport) {
        case 'daily':
        case 'monthly': {
          const { data: jobs } = await supabase
            .from('jobs')
            .select('*, payments(*), expenses(*)')
            .gte('job_date', from)
            .lte('job_date', to)
            .order('job_date', { ascending: false });

          rows = (jobs || []).map((j: any) => {
            const payments = j.payments || [];
            const expenses = j.expenses || [];
            const c_paid = payments.filter((p: any) => p.account_type === 'C').reduce((s: number, p: any) => s + Number(p.amount_paise || 0), 0);
            const svk_paid = payments.filter((p: any) => p.account_type === 'SVK').reduce((s: number, p: any) => s + Number(p.amount_paise || 0), 0);
            const total_exp = expenses.reduce((s: number, e: any) => s + Number(e.amount_paise || 0), 0);
            return {
              ...j,
              c_paid,
              svk_paid,
              total_exp,
            };
          });

          t.totalBilling = rows.reduce((s, r) => s + Number(r.c_total_paise || 0), 0);
          t.totalSVK = rows.reduce((s, r) => s + Number(r.svk_total_paise || 0), 0);
          t.totalProfit = rows.reduce((s, r) => s + (Number(r.c_total_paise || 0) - Number(r.svk_total_paise || 0) - r.total_exp), 0);
          break;
        }
        case 'customer_outstanding': {
          const { data: jobs } = await supabase
            .from('jobs')
            .select('*, payments(*)')
            .gte('job_date', from)
            .lte('job_date', to)
            .order('job_date', { ascending: false });

          rows = (jobs || [])
            .map((j: any) => {
              const c_paid = (j.payments || []).filter((p: any) => p.account_type === 'C').reduce((s: number, p: any) => s + Number(p.amount_paise || 0), 0);
              return { ...j, c_paid };
            })
            .filter((j: any) => (Number(j.c_total_paise || 0) - j.c_paid) > 0);

          t.totalOutstanding = rows.reduce((s, r) => s + (Number(r.c_total_paise || 0) - r.c_paid), 0);
          break;
        }
        case 'svk_outstanding': {
          const { data: jobs } = await supabase
            .from('jobs')
            .select('*, payments(*)')
            .gte('job_date', from)
            .lte('job_date', to)
            .order('job_date', { ascending: false });

          rows = (jobs || [])
            .map((j: any) => {
              const svk_paid = (j.payments || []).filter((p: any) => p.account_type === 'SVK').reduce((s: number, p: any) => s + Number(p.amount_paise || 0), 0);
              return { ...j, svk_paid };
            })
            .filter((j: any) => (Number(j.svk_total_paise || 0) - j.svk_paid) > 0);

          t.totalOutstanding = rows.reduce((s, r) => s + (Number(r.svk_total_paise || 0) - r.svk_paid), 0);
          break;
        }
        case 'customer_collection': {
          const { data: payments } = await supabase
            .from('payments')
            .select('*, jobs(client_name, job_date)')
            .eq('account_type', 'C')
            .gte('payment_date', from)
            .lte('payment_date', to)
            .order('payment_date', { ascending: false });

          rows = (payments || []).map((p: any) => ({
            ...p,
            client_name: p.jobs?.client_name || '',
            job_date: p.jobs?.job_date || '',
          }));
          t.total = rows.reduce((s, r) => s + Number(r.amount_paise || 0), 0);
          break;
        }
        case 'svk_payment': {
          const { data: payments } = await supabase
            .from('payments')
            .select('*, jobs(client_name)')
            .eq('account_type', 'SVK')
            .gte('payment_date', from)
            .lte('payment_date', to)
            .order('payment_date', { ascending: false });

          rows = (payments || []).map((p: any) => ({
            ...p,
            client_name: p.jobs?.client_name || '',
          }));
          t.total = rows.reduce((s, r) => s + Number(r.amount_paise || 0), 0);
          break;
        }
        case 'expenses': {
          const { data: expenses } = await supabase
            .from('expenses')
            .select('*, jobs(client_name)')
            .gte('expense_date', from)
            .lte('expense_date', to)
            .order('expense_date', { ascending: false });

          rows = (expenses || []).map((e: any) => ({
            ...e,
            client_name: e.jobs?.client_name || '',
          }));
          t.total = rows.reduce((s, r) => s + Number(r.amount_paise || 0), 0);
          break;
        }
        case 'job_profit': {
          const { data: jobs } = await supabase
            .from('jobs')
            .select('*, expenses(*)')
            .gte('job_date', from)
            .lte('job_date', to);

          rows = (jobs || []).map((j: any) => {
            const total_exp = (j.expenses || []).reduce((s: number, e: any) => s + Number(e.amount_paise || 0), 0);
            return { ...j, total_exp };
          }).sort((a, b) => (Number(b.c_total_paise || 0) - Number(b.svk_total_paise || 0)) - (Number(a.c_total_paise || 0) - Number(a.svk_total_paise || 0)));

          t.totalProfit = rows.reduce((s, r) => s + (Number(r.c_total_paise || 0) - Number(r.svk_total_paise || 0) - r.total_exp), 0);
          break;
        }
        case 'monthly_revenue': {
          const { data: jobs } = await supabase
            .from('jobs')
            .select('*, expenses(*)');

          const monthMap: Record<string, { month: string; job_count: number; revenue: number; svk_cost: number; expenses: number }> = {};
          for (const j of jobs || []) {
            const month = (j.job_date || '').substring(0, 7) || 'Unknown';
            if (!monthMap[month]) {
              monthMap[month] = { month, job_count: 0, revenue: 0, svk_cost: 0, expenses: 0 };
            }
            monthMap[month].job_count += 1;
            monthMap[month].revenue += Number(j.c_total_paise || 0);
            monthMap[month].svk_cost += Number(j.svk_total_paise || 0);
            const expSum = (j.expenses || []).reduce((s: number, e: any) => s + Number(e.amount_paise || 0), 0);
            monthMap[month].expenses += expSum;
          }

          rows = Object.values(monthMap).sort((a, b) => b.month.localeCompare(a.month));
          t.totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
          t.totalProfit = rows.reduce((s, r) => s + (r.revenue - r.svk_cost - r.expenses), 0);
          break;
        }
        case 'delivery_pending': {
          const { data: jobs } = await supabase
            .from('jobs')
            .select('*')
            .neq('delivery_status', 'Delivered')
            .order('expected_delivery_date', { ascending: true });

          rows = jobs || [];
          break;
        }
      }

      setData(rows);
      setTotals(t);
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  }, [activeReport, dateFilter]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const dateFilters: { key: DateFilter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
      </View>

      {/* Report Type Selector with SVGs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reportTabs} contentContainerStyle={styles.reportTabsContent}>
        {REPORTS.map(r => {
          const isActive = activeReport === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              style={[styles.reportTab, isActive && styles.reportTabActive]}
              onPress={() => setActiveReport(r.key)}
            >
              <AppSvgIcon name={r.icon} size={16} color={isActive ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.reportTabText, isActive && styles.reportTabTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Date Filter */}
      {activeReport !== 'delivery_pending' && activeReport !== 'monthly_revenue' && (
        <View style={styles.dateFilterRow}>
          {dateFilters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.dateBtn, dateFilter === f.key && styles.dateBtnActive]}
              onPress={() => setDateFilter(f.key)}
            >
              <Text style={[styles.dateBtnText, dateFilter === f.key && styles.dateBtnActiveText]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Totals */}
      {Object.keys(totals).length > 0 && (
        <View style={styles.totalsRow}>
          {Object.entries(totals).map(([key, val]) => (
            <View key={key} style={styles.totalChip}>
              <Text style={styles.totalLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
              <Text style={styles.totalValue}>{formatINR(val)}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <ReportRow report={activeReport} item={item} />}
          ListEmptyComponent={<EmptyState icon="chart" title="No data for this period" subtitle="Try changing the date filter" />}
          contentContainerStyle={data.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function ReportRow({ report, item }: { report: ReportType; item: any }) {
  switch (report) {
    case 'daily':
    case 'monthly':
      return (
        <View style={rrStyles.card}>
          <View style={rrStyles.row}>
            <Text style={rrStyles.main}>#{item.id} {item.client_name}</Text>
            <Text style={[rrStyles.amount, { color: Colors.customerColor }]}>{formatINR(item.c_total_paise)}</Text>
          </View>
          <View style={rrStyles.row}>
            <Text style={rrStyles.sub}>{formatDate(item.job_date)} · {item.delivery_status}</Text>
            <Text style={[rrStyles.sub, { color: item.c_total_paise - item.c_paid > 0 ? Colors.balanceColor : Colors.success }]}>
              Bal: {formatINR(item.c_total_paise - item.c_paid)}
            </Text>
          </View>
        </View>
      );
    case 'customer_outstanding':
      return (
        <View style={rrStyles.card}>
          <View style={rrStyles.row}>
            <Text style={rrStyles.main}>{item.client_name}</Text>
            <Text style={[rrStyles.amount, { color: Colors.balanceColor }]}>{formatINR(item.c_total_paise - item.c_paid)}</Text>
          </View>
          <View style={rrStyles.row}>
            <Text style={rrStyles.sub}>Job #{item.id} · {formatDate(item.job_date)}</Text>
            <Text style={rrStyles.sub}>Billed: {formatINR(item.c_total_paise)}</Text>
          </View>
        </View>
      );
    case 'svk_outstanding':
      return (
        <View style={rrStyles.card}>
          <View style={rrStyles.row}>
            <Text style={rrStyles.main}>Job #{item.id} - {item.client_name}</Text>
            <Text style={[rrStyles.amount, { color: Colors.warning }]}>{formatINR(item.svk_total_paise - item.svk_paid)}</Text>
          </View>
          <View style={rrStyles.row}>
            <Text style={rrStyles.sub}>{formatDate(item.job_date)}</Text>
            <Text style={rrStyles.sub}>SVK Cost: {formatINR(item.svk_total_paise)}</Text>
          </View>
        </View>
      );
    case 'customer_collection':
    case 'svk_payment':
      return (
        <View style={rrStyles.card}>
          <View style={rrStyles.row}>
            <Text style={rrStyles.main}>{item.client_name || `Job #${item.job_id}`}</Text>
            <Text style={[rrStyles.amount, { color: Colors.success }]}>{formatINR(item.amount_paise)}</Text>
          </View>
          <View style={rrStyles.row}>
            <Text style={rrStyles.sub}>{formatDate(item.payment_date)} · {item.payment_method}</Text>
            <Text style={rrStyles.sub}>{item.reference_number ? `Ref: ${item.reference_number}` : ''}</Text>
          </View>
        </View>
      );
    case 'expenses':
      return (
        <View style={rrStyles.card}>
          <View style={rrStyles.row}>
            <Text style={rrStyles.main}>{item.description}</Text>
            <Text style={[rrStyles.amount, { color: Colors.error }]}>{formatINR(item.amount_paise)}</Text>
          </View>
          <View style={rrStyles.row}>
            <Text style={rrStyles.sub}>{formatDate(item.expense_date)} · {item.client_name ? `Job: ${item.client_name}` : ''}</Text>
          </View>
        </View>
      );
    case 'job_profit':
      return (
        <View style={rrStyles.card}>
          <View style={rrStyles.row}>
            <Text style={rrStyles.main}>#{item.id} {item.client_name}</Text>
            <Text style={[rrStyles.amount, { color: (item.c_total_paise - item.svk_total_paise - item.total_exp) >= 0 ? Colors.success : Colors.error }]}>
              {formatINR(item.c_total_paise - item.svk_total_paise - item.total_exp)}
            </Text>
          </View>
          <View style={rrStyles.row}>
            <Text style={rrStyles.sub}>Billed: {formatINR(item.c_total_paise)} · SVK: {formatINR(item.svk_total_paise)}</Text>
            <Text style={rrStyles.sub}>Exp: {formatINR(item.total_exp)}</Text>
          </View>
        </View>
      );
    case 'monthly_revenue':
      return (
        <View style={rrStyles.card}>
          <View style={rrStyles.row}>
            <Text style={rrStyles.main}>{item.month}</Text>
            <Text style={[rrStyles.amount, { color: Colors.success }]}>{formatINR(item.revenue - item.svk_cost - item.expenses)}</Text>
          </View>
          <View style={rrStyles.row}>
            <Text style={rrStyles.sub}>{item.job_count} jobs · Rev: {formatINR(item.revenue)}</Text>
            <Text style={rrStyles.sub}>Cost: {formatINR(item.svk_cost + item.expenses)}</Text>
          </View>
        </View>
      );
    case 'delivery_pending':
      return (
        <View style={rrStyles.card}>
          <View style={rrStyles.row}>
            <Text style={rrStyles.main}>#{item.id} {item.client_name}</Text>
            <Text style={[rrStyles.badge, { color: Colors.warning }]}>{item.delivery_status}</Text>
          </View>
          <Text style={rrStyles.desc} numberOfLines={1}>{item.job_description}</Text>
          <View style={rrStyles.row}>
            <Text style={rrStyles.sub}>Expected: {formatDate(item.expected_delivery_date)}</Text>
            <Text style={rrStyles.sub}>{item.phone_number}</Text>
          </View>
        </View>
      );
    default:
      return null;
  }
}

const rrStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    elevation: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 },
  main: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  amount: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 12, color: Colors.textSecondary },
  desc: { fontSize: 12, color: Colors.textMuted, marginVertical: 2 },
  badge: { fontSize: 12, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  reportTabs: { backgroundColor: Colors.primary, maxHeight: 48 },
  reportTabsContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  reportTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  reportTabActive: { backgroundColor: Colors.accent },
  reportTabText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  reportTabTextActive: { color: '#fff', fontWeight: '700' },
  dateFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  dateBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateBtnText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  dateBtnActiveText: { color: '#fff', fontWeight: '700' },
  totalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  totalChip: { backgroundColor: Colors.card, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 4, elevation: 1 },
  totalLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'capitalize' },
  totalValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
});
