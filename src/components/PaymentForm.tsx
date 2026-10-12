import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Colors, Spacing, Radius } from '../utils/theme';
import { CurrencyInput } from './CurrencyInput';
import { DateField } from './DateField';
import { todayISO } from '../utils/dates';
import { PAYMENT_METHODS, type AccountType, type PaymentMethod } from '../database/schema';
import { createPayment, updatePayment } from '../database/paymentsRepository';
import type { Payment } from '../database/schema';

interface Props {
  jobId: number;
  accountType: AccountType;
  existing?: Payment;
  onSaved: () => void;
  onCancel: () => void;
}

export function PaymentForm({ jobId, accountType, existing, onSaved, onCancel }: Props) {
  const [amount, setAmount] = useState(existing?.amount_paise ?? 0);
  const [date, setDate] = useState(existing?.payment_date ?? todayISO());
  const [method, setMethod] = useState<PaymentMethod>(existing?.payment_method as PaymentMethod ?? 'Cash');
  const [ref, setRef] = useState(existing?.reference_number ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (amount <= 0) { Alert.alert('Error', 'Amount must be greater than zero'); return; }
    if (!date) { Alert.alert('Error', 'Payment date is required'); return; }
    if (saving) return;
    setSaving(true);
    try {
      if (existing) {
        await updatePayment(existing.id, { amount_paise: amount, payment_date: date, payment_method: method, reference_number: ref, notes });
      } else {
        await createPayment({ job_id: jobId, account_type: accountType, amount_paise: amount, payment_date: date, payment_method: method, reference_number: ref, notes });
      }
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{existing ? 'Edit' : 'Add'} {accountType === 'C' ? 'Customer' : 'SVK'} Payment</Text>
      <CurrencyInput label="Amount" valuePaise={amount} onChange={setAmount} />
      <DateField label="Payment Date" value={date} onChange={setDate} />
      <Text style={styles.label}>Payment Method</Text>
      <View style={styles.methodRow}>
        {PAYMENT_METHODS.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.methodBtn, method === m && styles.methodActive]}
            onPress={() => setMethod(m)}
          >
            <Text style={[styles.methodText, method === m && styles.methodActiveText]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>Reference Number (optional)</Text>
      <TextInput style={styles.input} value={ref} onChangeText={setRef} placeholder="UTR / Cheque no." placeholderTextColor={Colors.textMuted} />
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline numberOfLines={2} placeholder="Notes..." placeholderTextColor={Colors.textMuted} />
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Payment'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    backgroundColor: Colors.card, paddingHorizontal: Spacing.md, height: 48,
    fontSize: 15, color: Colors.textPrimary, marginBottom: Spacing.md,
  },
  multiline: { height: 72, paddingTop: Spacing.sm, textAlignVertical: 'top' },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  methodBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  methodActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  methodText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  methodActiveText: { color: '#fff', fontWeight: '700' },
  buttons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.xxl },
  cancelBtn: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.accent, borderRadius: Radius.sm },
  disabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
