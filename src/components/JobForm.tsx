import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, Radius } from '../utils/theme';
import { CurrencyInput } from './CurrencyInput';
import { DateField } from './DateField';
import { ConfirmDialog } from './ConfirmDialog';
import { formatINR, parseINRInput, paiseToRupeeString } from '../utils/currency';
import { todayISO } from '../utils/dates';
import { calculateCTotal, calculateSVKTotal } from '../calculations/billing';
import { calculateIPZProfit } from '../calculations/profit';
import { DELIVERY_STATUSES, type DeliveryStatus } from '../database/schema';
import { createJob, updateJob } from '../database/jobsRepository';
import { createPayment } from '../database/paymentsRepository';
import { createExpense, getExpensesByJob, deleteExpense } from '../database/expensesRepository';
import type { JobWithTotals, Expense } from '../database/schema';

interface ExpenseInput {
  id?: number;
  description: string;
  amount_paise: number;
  expense_date: string;
  notes: string;
}

interface Props {
  existing?: JobWithTotals;
  initialCustomerPaid?: number;
  initialSVKPaid?: number;
  onSaved: (jobId: number) => void;
  onCancel: () => void;
}

export function JobForm({ existing, initialCustomerPaid = 0, initialSVKPaid = 0, onSaved, onCancel }: Props) {
  // General
  const [jobDate, setJobDate] = useState(existing?.job_date ?? todayISO());
  const [phone, setPhone] = useState(existing?.phone_number ?? '');
  const [client, setClient] = useState(existing?.client_name ?? '');
  const [desc, setDesc] = useState(existing?.job_description ?? '');
  const [qty, setQty] = useState(String(existing?.quantity ?? '1'));
  const [remarks, setRemarks] = useState(existing?.remarks ?? '');
  const [expectedDelivery, setExpectedDelivery] = useState(existing?.expected_delivery_date ?? '');
  const [actualDelivery, setActualDelivery] = useState(existing?.actual_delivery_date ?? '');
  const [status, setStatus] = useState<DeliveryStatus>(existing?.delivery_status ?? 'Pending');

  // Customer
  const [cRate, setCRate] = useState(existing?.c_rate_paise ?? 0);
  const [cDesign, setCDesign] = useState(existing?.c_design_charge_paise ?? 0);
  const [cAdvance, setCAdvance] = useState(0);
  const [cAdvanceDate, setCAdvanceDate] = useState(todayISO());

  // SVK
  const [svkRate, setSVKRate] = useState(existing?.svk_rate_paise ?? 0);
  const [svkAdvance, setSVKAdvance] = useState(0);
  const [svkAdvanceDate, setSVKAdvanceDate] = useState(todayISO());

  // Expenses
  const [expenses, setExpenses] = useState<ExpenseInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const quantity = parseInt(qty) || 0;
  const cTotal = calculateCTotal(cRate, quantity, cDesign);
  const svkTotal = calculateSVKTotal(svkRate, quantity);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount_paise, 0);
  const profit = calculateIPZProfit(cTotal, svkTotal, expenses.map(e => e.amount_paise));

  // For edit mode, use existing paid amounts
  const effectiveCPaid = existing ? initialCustomerPaid : cAdvance;
  const effectiveSVKPaid = existing ? initialSVKPaid : svkAdvance;
  const cBalance = cTotal - effectiveCPaid;
  const svkBalance = svkTotal - effectiveSVKPaid;

  useEffect(() => {
    if (existing) {
      getExpensesByJob(existing.id).then(exps => {
        setExpenses(exps.map(e => ({
          id: e.id,
          description: e.description,
          amount_paise: e.amount_paise,
          expense_date: e.expense_date,
          notes: e.notes,
        })));
      });
    }
  }, [existing?.id]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!client.trim()) errs.client = 'Client name is required';
    if (!desc.trim()) errs.desc = 'Job description is required';
    if (!quantity || quantity <= 0) errs.qty = 'Quantity must be at least 1';
    if (!jobDate) errs.jobDate = 'Job date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (saving) return;
    setSaving(true);
    try {
      const jobInput = {
        job_date: jobDate,
        phone_number: phone,
        client_name: client.trim(),
        job_description: desc.trim(),
        quantity,
        c_rate_paise: cRate,
        c_design_charge_paise: cDesign,
        c_total_paise: cTotal,
        svk_rate_paise: svkRate,
        svk_total_paise: svkTotal,
        ipz_total_paise: cTotal,
        remarks: remarks.trim(),
        expected_delivery_date: expectedDelivery,
        delivery_status: status,
      };

      if (existing) {
        await updateJob(existing.id, { ...jobInput, actual_delivery_date: actualDelivery });

        // Sync expenses: delete removed, create new
        const existingIds = expenses.filter(e => e.id).map(e => e.id!);
        const originalExps = await getExpensesByJob(existing.id);
        for (const orig of originalExps) {
          if (!existingIds.includes(orig.id)) await deleteExpense(orig.id);
        }
        for (const exp of expenses) {
          if (!exp.id && exp.description && exp.amount_paise >= 0) {
            await createExpense({ job_id: existing.id, description: exp.description, amount_paise: exp.amount_paise, expense_date: exp.expense_date, notes: exp.notes });
          }
        }
        onSaved(existing.id);
      } else {
        const jobId = await createJob(jobInput);

        // Save initial advances as payments
        if (cAdvance > 0) {
          await createPayment({ job_id: jobId, account_type: 'C', amount_paise: cAdvance, payment_date: cAdvanceDate, payment_method: 'Cash', notes: 'Initial advance' });
        }
        if (svkAdvance > 0) {
          await createPayment({ job_id: jobId, account_type: 'SVK', amount_paise: svkAdvance, payment_date: svkAdvanceDate, payment_method: 'Cash', notes: 'Initial advance' });
        }

        // Save expenses
        for (const exp of expenses) {
          if (exp.description && exp.amount_paise >= 0) {
            await createExpense({ job_id: jobId, description: exp.description, amount_paise: exp.amount_paise, expense_date: exp.expense_date, notes: exp.notes });
          }
        }
        onSaved(jobId);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const addExpense = () => {
    setExpenses(prev => [...prev, { description: '', amount_paise: 0, expense_date: todayISO(), notes: '' }]);
  };

  const removeExpense = (idx: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== idx));
  };

  const updateExpense = (idx: number, field: keyof ExpenseInput, value: any) => {
    setExpenses(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowCancel(true)}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{existing ? 'Edit Job' : 'New Job'}</Text>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* General Info */}
        <SectionHeader title="General Information" />
        <View style={styles.section}>
          {existing && <InfoRow label="Job ID" value={`#${existing.id}`} />}
          <DateField label="Job Date" value={jobDate} onChange={setJobDate} error={errors.jobDate} />
          <FormField label="Client Name *" value={client} onChange={setClient} error={errors.client} placeholder="Enter client name" />
          <FormField label="Phone Number" value={phone} onChange={setPhone} keyboardType="phone-pad" placeholder="Mobile number" />
          <FormField label="Job Description *" value={desc} onChange={setDesc} error={errors.desc} placeholder="Describe the print job" multiline />
          <FormField label="Quantity *" value={qty} onChange={setQty} error={errors.qty} keyboardType="number-pad" placeholder="1" />
          <FormField label="Remarks" value={remarks} onChange={setRemarks} placeholder="Any remarks..." multiline />
          <DateField label="Expected Delivery" value={expectedDelivery} onChange={setExpectedDelivery} optional />
          {existing && <DateField label="Actual Delivery" value={actualDelivery} onChange={setActualDelivery} optional />}
          <Text style={styles.fieldLabel}>Delivery Status</Text>
          <View style={styles.statusRow}>
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

        {/* Customer Account */}
        <SectionHeader title="Customer Account (C)" color={Colors.customerColor} />
        <View style={styles.section}>
          <CurrencyInput label="C Rate per Unit" valuePaise={cRate} onChange={setCRate} />
          <CurrencyInput label="C Design Charge" valuePaise={cDesign} onChange={setCDesign} />
          <CalcRow label="C Total (auto)" value={formatINR(cTotal)} color={Colors.customerColor} />
          {!existing && (
            <>
              <CurrencyInput label="C Advance" valuePaise={cAdvance} onChange={setCAdvance} />
              {cAdvance > 0 && <DateField label="C Advance Date" value={cAdvanceDate} onChange={setCAdvanceDate} />}
            </>
          )}
          <CalcRow label={existing ? 'C Balance' : 'C Balance (after advance)'} value={formatINR(cBalance)} color={cBalance > 0 ? Colors.balanceColor : Colors.success} />
        </View>

        {/* SVK Account */}
        <SectionHeader title="SVK Supplier Account" color={Colors.svkColor} />
        <View style={styles.section}>
          <CurrencyInput label="SVK Rate per Unit" valuePaise={svkRate} onChange={setSVKRate} />
          <CalcRow label="SVK Total (auto)" value={formatINR(svkTotal)} color={Colors.svkColor} />
          {!existing && (
            <>
              <CurrencyInput label="SVK Advance" valuePaise={svkAdvance} onChange={setSVKAdvance} />
              {svkAdvance > 0 && <DateField label="SVK Advance Date" value={svkAdvanceDate} onChange={setSVKAdvanceDate} />}
            </>
          )}
          <CalcRow label={existing ? 'SVK Balance' : 'SVK Balance (after advance)'} value={formatINR(svkBalance)} color={svkBalance > 0 ? Colors.warning : Colors.success} />
        </View>

        {/* Additional Expenses */}
        <SectionHeader title="Additional Expenses" />
        <View style={styles.section}>
          {expenses.map((exp, idx) => (
            <View key={idx} style={styles.expenseItem}>
              <View style={styles.expenseHeader}>
                <Text style={styles.expenseNum}>Expense {idx + 1}</Text>
                <TouchableOpacity onPress={() => removeExpense(idx)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
              <FormField label="Description" value={exp.description} onChange={v => updateExpense(idx, 'description', v)} placeholder="Expense description" />
              <CurrencyInput label="Amount" valuePaise={exp.amount_paise} onChange={v => updateExpense(idx, 'amount_paise', v)} />
              <DateField label="Date" value={exp.expense_date} onChange={v => updateExpense(idx, 'expense_date', v)} />
              <FormField label="Notes" value={exp.notes} onChange={v => updateExpense(idx, 'notes', v)} placeholder="Notes..." />
            </View>
          ))}
          <TouchableOpacity style={styles.addExpenseBtn} onPress={addExpense}>
            <Text style={styles.addExpenseText}>+ Add Expense</Text>
          </TouchableOpacity>
          {expenses.length > 0 && <CalcRow label="Total Expenses" value={formatINR(totalExpenses)} color={Colors.error} />}
        </View>

        {/* IPZ Summary */}
        <SectionHeader title="IPZ Profit Summary" color={Colors.primary} />
        <View style={[styles.section, styles.profitSection]}>
          <CalcRow label="Revenue (C Total)" value={formatINR(cTotal)} color={Colors.primary} />
          <CalcRow label="SVK Production Cost" value={formatINR(svkTotal)} color={Colors.svkColor} />
          <CalcRow label="Other Expenses" value={formatINR(totalExpenses)} color={Colors.error} />
          <View style={styles.divider} />
          <CalcRow label="IPZ Profit" value={formatINR(profit)} color={profit >= 0 ? Colors.success : Colors.error} large />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmDialog
        visible={showCancel}
        title="Discard Changes?"
        message="Are you sure you want to cancel? Unsaved changes will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={onCancel}
        onCancel={() => setShowCancel(false)}
      />
    </View>
  );
}

function SectionHeader({ title, color }: { title: string; color?: string }) {
  return (
    <View style={[shStyles.container, color ? { borderLeftColor: color } : {}]}>
      <Text style={shStyles.text}>{title}</Text>
    </View>
  );
}

function FormField({ label, value, onChange, error, placeholder, multiline, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; placeholder?: string; multiline?: boolean; keyboardType?: any;
}) {
  return (
    <View style={ffStyles.container}>
      <Text style={ffStyles.label}>{label}</Text>
      <TextInput
        style={[ffStyles.input, multiline && ffStyles.multiline, !!error && ffStyles.error]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 2 : 1}
        keyboardType={keyboardType}
      />
      {!!error && <Text style={ffStyles.errorText}>{error}</Text>}
    </View>
  );
}

function CalcRow({ label, value, color, large }: { label: string; value: string; color: string; large?: boolean }) {
  return (
    <View style={crStyles.row}>
      <Text style={crStyles.label}>{label}</Text>
      <Text style={[crStyles.value, { color }, large && crStyles.large]}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={crStyles.row}>
      <Text style={crStyles.label}>{label}</Text>
      <Text style={[crStyles.value, { color: Colors.textMuted }]}>{value}</Text>
    </View>
  );
}

const shStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
    backgroundColor: Colors.primary + '10', marginTop: Spacing.md,
  },
  text: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
});

const ffStyles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    backgroundColor: Colors.card, paddingHorizontal: Spacing.md, height: 48,
    fontSize: 15, color: Colors.textPrimary,
  },
  multiline: { height: 72, paddingTop: Spacing.sm, textAlignVertical: 'top' },
  error: { borderColor: Colors.error },
  errorText: { fontSize: 12, color: Colors.error, marginTop: 4 },
});

const crStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  value: { fontSize: 15, fontWeight: '700' },
  large: { fontSize: 20, fontWeight: '800' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#fff' },
  cancelText: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  saveBtn: { backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.6 },
  scroll: { flex: 1 },
  section: { backgroundColor: Colors.card, marginHorizontal: Spacing.lg, marginTop: 2, borderRadius: Radius.md, padding: Spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  statusBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  statusActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  statusText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  statusActiveText: { color: '#fff', fontWeight: '700' },
  expenseItem: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.md },
  expenseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  expenseNum: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  removeText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  addExpenseBtn: {
    borderWidth: 1, borderColor: Colors.accent, borderRadius: Radius.sm,
    padding: Spacing.md, alignItems: 'center', borderStyle: 'dashed',
  },
  addExpenseText: { color: Colors.accent, fontWeight: '700', fontSize: 14 },
  profitSection: { backgroundColor: Colors.primary + '08' },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
});
