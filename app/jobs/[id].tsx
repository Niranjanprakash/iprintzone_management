import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getJobById, deleteJob } from '../../src/database/jobsRepository';
import { getPaymentsByJob, deletePayment } from '../../src/database/paymentsRepository';
import { getExpensesByJob } from '../../src/database/expensesRepository';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { PaymentForm } from '../../src/components/PaymentForm';
import { Colors, Spacing, Radius } from '../../src/utils/theme';
import { formatINR } from '../../src/utils/currency';
import { formatDate } from '../../src/utils/dates';
import type { JobWithTotals, Payment, Expense, AccountType } from '../../src/database/schema';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const jobId = parseInt(id ?? '0');

  const [job, setJob] = useState<JobWithTotals | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ type: AccountType } | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, p, e] = await Promise.all([
        getJobById(jobId),
        getPaymentsByJob(jobId),
        getExpensesByJob(jobId),
      ]);
      setJob(j);
      setPayments(p);
      setExpenses(e);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = async () => {
    await deleteJob(jobId);
    router.replace('/(tabs)/jobs');
  };

  const handleDeletePayment = async () => {
    if (deletePaymentId) {
      await deletePayment(deletePaymentId);
      setDeletePaymentId(null);
      load();
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;
  if (!job) return <View style={styles.center}><Text>Job not found</Text></View>;

  const cPayments = payments.filter(p => p.account_type === 'C');
  const svkPayments = payments.filter(p => p.account_type === 'SVK');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job #{job.id}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/jobs/edit/${job.id}`)}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDelete(true)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Job Info */}
        <View style={styles.card}>
          <Row label="Client" value={job.client_name} bold />
          {!!job.phone_number && <Row label="Phone" value={job.phone_number} />}
          <Row label="Date" value={formatDate(job.job_date)} />
          <Row label="Description" value={job.job_description} />
          <Row label="Quantity" value={String(job.quantity)} />
          {!!job.remarks && <Row label="Remarks" value={job.remarks} />}
          <Row label="Expected Delivery" value={formatDate(job.expected_delivery_date) || '—'} />
          {!!job.actual_delivery_date && <Row label="Actual Delivery" value={formatDate(job.actual_delivery_date)} />}
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{job.delivery_status}</Text>
          </View>
        </View>

        {/* Customer Account */}
        <SectionTitle title="Customer Account" color={Colors.customerColor} />
        <View style={styles.card}>
          <Row label="C Rate" value={formatINR(job.c_rate_paise)} />
          <Row label="Design Charge" value={formatINR(job.c_design_charge_paise)} />
          <Row label="C Total" value={formatINR(job.c_total_paise)} bold color={Colors.customerColor} />
          <Row label="Total Collected" value={formatINR(job.customer_paid_paise)} color={Colors.success} />
          <Row label="Balance Due" value={formatINR(job.customer_balance_paise)} bold color={job.customer_balance_paise > 0 ? Colors.balanceColor : Colors.success} />
          <TouchableOpacity style={styles.addPaymentBtn} onPress={() => setPaymentModal({ type: 'C' })}>
            <Text style={styles.addPaymentText}>+ Add Customer Payment</Text>
          </TouchableOpacity>
          {cPayments.map(p => (
            <PaymentRow key={p.id} payment={p} onEdit={() => setEditPayment(p)} onDelete={() => setDeletePaymentId(p.id)} />
          ))}
        </View>

        {/* SVK Account */}
        <SectionTitle title="SVK Supplier Account" color={Colors.svkColor} />
        <View style={styles.card}>
          <Row label="SVK Rate" value={formatINR(job.svk_rate_paise)} />
          <Row label="SVK Total" value={formatINR(job.svk_total_paise)} bold color={Colors.svkColor} />
          <Row label="Total Paid" value={formatINR(job.svk_paid_paise)} color={Colors.success} />
          <Row label="SVK Balance" value={formatINR(job.svk_balance_paise)} bold color={job.svk_balance_paise > 0 ? Colors.warning : Colors.success} />
          <TouchableOpacity style={[styles.addPaymentBtn, { borderColor: Colors.svkColor }]} onPress={() => setPaymentModal({ type: 'SVK' })}>
            <Text style={[styles.addPaymentText, { color: Colors.svkColor }]}>+ Add SVK Payment</Text>
          </TouchableOpacity>
          {svkPayments.map(p => (
            <PaymentRow key={p.id} payment={p} onEdit={() => setEditPayment(p)} onDelete={() => setDeletePaymentId(p.id)} />
          ))}
        </View>

        {/* Expenses */}
        {expenses.length > 0 && (
          <>
            <SectionTitle title="Additional Expenses" color={Colors.error} />
            <View style={styles.card}>
              {expenses.map(e => (
                <View key={e.id} style={styles.expenseRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseDesc}>{e.description}</Text>
                    <Text style={styles.expenseDate}>{formatDate(e.expense_date)}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>{formatINR(e.amount_paise)}</Text>
                </View>
              ))}
              <Row label="Total Expenses" value={formatINR(expenses.reduce((s, e) => s + e.amount_paise, 0))} bold color={Colors.error} />
            </View>
          </>
        )}

        {/* Profit */}
        <SectionTitle title="IPZ Profit" color={Colors.primary} />
        <View style={[styles.card, styles.profitCard]}>
          <Row label="Revenue (C Total)" value={formatINR(job.c_total_paise)} />
          <Row label="SVK Cost" value={`- ${formatINR(job.svk_total_paise)}`} color={Colors.svkColor} />
          <Row label="Expenses" value={`- ${formatINR(job.total_expenses_paise)}`} color={Colors.error} />
          <View style={styles.divider} />
          <Row label="IPZ Profit" value={formatINR(job.ipz_profit_paise)} bold large color={job.ipz_profit_paise >= 0 ? Colors.success : Colors.error} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={!!paymentModal || !!editPayment} animationType="slide" presentationStyle="pageSheet">
        <PaymentForm
          jobId={jobId}
          accountType={editPayment?.account_type ?? paymentModal?.type ?? 'C'}
          existing={editPayment ?? undefined}
          onSaved={() => { setPaymentModal(null); setEditPayment(null); load(); }}
          onCancel={() => { setPaymentModal(null); setEditPayment(null); }}
        />
      </Modal>

      <ConfirmDialog
        visible={showDelete}
        title="Delete Job"
        message={`Delete job #${job.id} for ${job.client_name}? All payments and expenses will also be deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      <ConfirmDialog
        visible={!!deletePaymentId}
        title="Delete Payment"
        message="Are you sure you want to delete this payment?"
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeletePayment}
        onCancel={() => setDeletePaymentId(null)}
      />
    </View>
  );
}

function Row({ label, value, bold, color, large }: { label: string; value: string; bold?: boolean; color?: string; large?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.bold, color ? { color } : {}, large && rowStyles.large]}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <View style={[stStyles.container, { borderLeftColor: color }]}>
      <Text style={stStyles.text}>{title}</Text>
    </View>
  );
}

function PaymentRow({ payment, onEdit, onDelete }: { payment: Payment; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={prStyles.row}>
      <View style={{ flex: 1 }}>
        <Text style={prStyles.amount}>{formatINR(payment.amount_paise)}</Text>
        <Text style={prStyles.meta}>{formatDate(payment.payment_date)} · {payment.payment_method}</Text>
        {!!payment.reference_number && <Text style={prStyles.ref}>Ref: {payment.reference_number}</Text>}
        {!!payment.notes && <Text style={prStyles.notes}>{payment.notes}</Text>}
      </View>
      <View style={prStyles.actions}>
        <TouchableOpacity onPress={onEdit}><Text style={prStyles.editBtn}>Edit</Text></TouchableOpacity>
        <TouchableOpacity onPress={onDelete}><Text style={prStyles.deleteBtn}>Del</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border + '60' },
  label: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  value: { fontSize: 14, color: Colors.textPrimary, textAlign: 'right', flex: 1 },
  bold: { fontWeight: '700' },
  large: { fontSize: 18, fontWeight: '800' },
});

const stStyles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderLeftWidth: 3, backgroundColor: Colors.primary + '08', marginTop: Spacing.md },
  text: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
});

const prStyles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border + '60' },
  amount: { fontSize: 15, fontWeight: '700', color: Colors.success },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  ref: { fontSize: 11, color: Colors.textMuted },
  notes: { fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  editBtn: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  deleteBtn: { fontSize: 13, color: Colors.error, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  headerActions: { flexDirection: 'row', gap: Spacing.md },
  editText: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
  deleteText: { fontSize: 14, color: '#FF6B6B', fontWeight: '600' },
  scroll: { flex: 1 },
  card: { backgroundColor: Colors.card, marginHorizontal: Spacing.lg, marginTop: 2, borderRadius: Radius.md, padding: Spacing.lg },
  statusBadge: { backgroundColor: Colors.accent + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginTop: Spacing.sm },
  statusText: { fontSize: 12, color: Colors.accent, fontWeight: '700' },
  addPaymentBtn: { borderWidth: 1, borderColor: Colors.accent, borderRadius: Radius.sm, padding: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.sm, borderStyle: 'dashed' },
  addPaymentText: { color: Colors.accent, fontWeight: '700', fontSize: 13 },
  expenseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border + '60' },
  expenseDesc: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  expenseDate: { fontSize: 11, color: Colors.textMuted },
  expenseAmount: { fontSize: 14, fontWeight: '700', color: Colors.error },
  profitCard: { backgroundColor: Colors.primary + '08' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
});
