import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius } from '../utils/theme';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/dates';
import type { JobWithTotals } from '../database/schema';

const STATUS_COLORS: Record<string, string> = {
  Pending: Colors.warning,
  'In Progress': Colors.accent,
  Ready: Colors.primary,
  Delivered: Colors.success,
};

interface Props {
  job: JobWithTotals;
  onPress: () => void;
}

export function JobCard({ job, onPress }: Props) {
  const statusColor = STATUS_COLORS[job.delivery_status] ?? Colors.textSecondary;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View>
          <Text style={styles.jobId}>#{job.id}</Text>
          <Text style={styles.client}>{job.client_name}</Text>
          {!!job.phone_number && <Text style={styles.phone}>{job.phone_number}</Text>}
        </View>
        <View style={styles.right}>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{job.delivery_status}</Text>
          </View>
          <Text style={styles.date}>{formatDate(job.job_date)}</Text>
        </View>
      </View>
      <Text style={styles.desc} numberOfLines={1}>{job.job_description}</Text>
      <View style={styles.amounts}>
        <AmountChip label="Billed" value={formatINR(job.c_total_paise)} color={Colors.customerColor} />
        <AmountChip
          label="C Balance"
          value={formatINR(job.customer_balance_paise)}
          color={job.customer_balance_paise > 0 ? Colors.balanceColor : Colors.success}
        />
        <AmountChip
          label="SVK Bal"
          value={formatINR(job.svk_balance_paise)}
          color={job.svk_balance_paise > 0 ? Colors.svkColor : Colors.success}
        />
      </View>
    </TouchableOpacity>
  );
}

function AmountChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  right: { alignItems: 'flex-end' },
  jobId: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  client: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  phone: { fontSize: 12, color: Colors.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 11, color: Colors.textMuted },
  desc: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.sm },
  amounts: { flexDirection: 'row', gap: Spacing.sm },
  chip: { flex: 1 },
  chipLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  chipValue: { fontSize: 13, fontWeight: '700' },
});
