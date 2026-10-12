import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { getSecureItem, setSecureItem, deleteSecureItem } from '../../src/utils/storage';
import { Colors, Spacing, Radius } from '../../src/utils/theme';
import { exportJobsCSV, exportPaymentsCSV, exportExpensesCSV } from '../../src/utils/export';
import { getSavedSupabaseConfig, setSupabaseCredentials } from '../../src/database/supabaseClient';
import { AlertTriangleIcon, LightbulbIcon, SettingsIcon } from '../../src/components/SvgIcons';

const PIN_KEY = 'iprintzone_pin_hash';

function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash)) + pin.length;
}

export default function SettingsScreen() {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState<'set' | 'remove'>('set');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Supabase Config State
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [savingSupabase, setSavingSupabase] = useState(false);

  useEffect(() => {
    getSecureItem(PIN_KEY).then(v => setPinEnabled(!!v));
    getSavedSupabaseConfig().then(cfg => {
      setSupabaseUrl(cfg.url);
      setSupabaseAnonKey(cfg.anonKey);
      setIsConfigured(cfg.isConfigured);
    });
  }, []);

  const handleSetPin = async () => {
    if (pin.length < 4) { setPinError('PIN must be at least 4 digits'); return; }
    if (pin !== confirmPin) { setPinError('PINs do not match'); return; }
    await setSecureItem(PIN_KEY, hashPin(pin));
    setPinEnabled(true);
    setShowPinModal(false);
    setPin(''); setConfirmPin(''); setPinError('');
    Alert.alert('Success', 'PIN has been set');
  };

  const handleRemovePin = async () => {
    await deleteSecureItem(PIN_KEY);
    setPinEnabled(false);
    setShowPinModal(false);
    setPin(''); setPinError('');
    Alert.alert('Success', 'PIN has been removed');
  };

  const doExport = async (fn: () => Promise<void>, label: string) => {
    setExporting(true);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert('Export Failed', e.message ?? 'Could not export data');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      Alert.alert('Error', 'Please provide both Supabase URL and Anon Key');
      return;
    }
    setSavingSupabase(true);
    const success = await setSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    setSavingSupabase(false);
    if (success) {
      setIsConfigured(true);
      setShowSupabaseModal(false);
      Alert.alert('Connected', 'Supabase credentials saved successfully!');
    } else {
      Alert.alert('Notice', 'Credentials saved, but could not verify tables. Ensure you ran the supabase_schema.sql query.');
      setShowSupabaseModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Supabase Cloud Connection */}
        <SectionHeader title="Database Connection" />
        <View style={styles.section}>
          <SettingRow
            label="Supabase Cloud Database"
            subtitle={isConfigured ? 'Connected to Supabase' : 'Configure Project URL & Key'}
            value={isConfigured ? 'Active' : 'Setup Required'}
            valueColor={isConfigured ? Colors.success : Colors.warning}
            onPress={() => setShowSupabaseModal(true)}
            action="Configure"
          />
        </View>

        {/* Security */}
        <SectionHeader title="Security" />
        <View style={styles.section}>
          <SettingRow
            label="App PIN Protection"
            value={pinEnabled ? 'Enabled' : 'Disabled'}
            valueColor={pinEnabled ? Colors.success : Colors.textMuted}
            onPress={() => { setPinAction(pinEnabled ? 'remove' : 'set'); setShowPinModal(true); }}
            action={pinEnabled ? 'Remove PIN' : 'Set PIN'}
          />
        </View>

        {/* Export */}
        <SectionHeader title="Export Data (CSV)" />
        <View style={styles.section}>
          <SettingRow label="Export Jobs to CSV" onPress={() => doExport(exportJobsCSV, 'Jobs')} action="Export" />
          <SettingRow label="Export Payments to CSV" onPress={() => doExport(exportPaymentsCSV, 'Payments')} action="Export" />
          <SettingRow label="Export Expenses to CSV" onPress={() => doExport(exportExpensesCSV, 'Expenses')} action="Export" />
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View style={styles.section}>
          <InfoRow label="App Name" value="IprintZone Manager" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Database" value="Supabase (PostgreSQL Cloud)" />
          <InfoRow label="Currency" value="INR (₹)" />
          <View style={styles.notice}>
            <LightbulbIcon size={18} color={Colors.accent} />
            <Text style={styles.noticeText}>
              All data is synced safely with your Supabase Cloud Database. Accessible from Mobile, Tablet, and Web!
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {exporting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Exporting...</Text>
        </View>
      )}

      {/* Supabase Config Modal */}
      <Modal visible={showSupabaseModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Supabase Configuration</Text>
            <Text style={styles.modalSubtitle}>
              Enter your Supabase project URL and anon API key
            </Text>

            <Text style={styles.fieldLabel}>Project URL</Text>
            <TextInput
              style={styles.textInput}
              value={supabaseUrl}
              onChangeText={setSupabaseUrl}
              placeholder="https://your-project.supabase.co"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Anon Public Key</Text>
            <TextInput
              style={[styles.textInput, { height: 68 }]}
              value={supabaseAnonKey}
              onChangeText={setSupabaseAnonKey}
              placeholder="eyJhbGciOiJIUzI1NiIsInR..."
              placeholderTextColor={Colors.textMuted}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.hintBox}>
              <AlertTriangleIcon size={16} color={Colors.warning} />
              <Text style={styles.hintText}>
                Be sure to run supabase_schema.sql once in your Supabase SQL Editor.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowSupabaseModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSaveSupabase}
                disabled={savingSupabase}
              >
                {savingSupabase ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save & Connect</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pinModal}>
            {pinAction === 'set' ? (
              <>
                <Text style={styles.pinTitle}>Set App PIN</Text>
                <Text style={styles.pinLabel}>Enter 4-6 digit PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={6}
                />
                <Text style={styles.pinLabel}>Confirm PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={6}
                />
                {!!pinError && <Text style={styles.pinError}>{pinError}</Text>}
                <View style={styles.pinButtons}>
                  <TouchableOpacity style={styles.pinCancel} onPress={() => setShowPinModal(false)}>
                    <Text style={styles.pinCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pinConfirm} onPress={handleSetPin}>
                    <Text style={styles.pinConfirmText}>Save PIN</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.pinTitle}>Remove PIN</Text>
                <Text style={styles.pinSubtitle}>Are you sure you want to remove the PIN?</Text>
                <View style={styles.pinButtons}>
                  <TouchableOpacity style={styles.pinCancel} onPress={() => setShowPinModal(false)}>
                    <Text style={styles.pinCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pinConfirm, { backgroundColor: Colors.error }]} onPress={handleRemovePin}>
                    <Text style={styles.pinConfirmText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={shStyles.text}>{title}</Text>;
}

function SettingRow({ label, subtitle, value, valueColor, onPress, action, actionColor }: {
  label: string; subtitle?: string; value?: string; valueColor?: string;
  onPress: () => void; action: string; actionColor?: string;
}) {
  return (
    <TouchableOpacity style={srStyles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={srStyles.label}>{label}</Text>
        {!!subtitle && <Text style={srStyles.subtitle}>{subtitle}</Text>}
        {!!value && <Text style={[srStyles.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>}
      </View>
      <Text style={[srStyles.action, actionColor ? { color: actionColor } : {}]}>{action} →</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={srStyles.row}>
      <Text style={srStyles.label}>{label}</Text>
      <Text style={srStyles.infoValue}>{value}</Text>
    </View>
  );
}

const shStyles = StyleSheet.create({
  text: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
});

const srStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border + '60' },
  label: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  value: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  action: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  infoValue: { fontSize: 14, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  section: { backgroundColor: Colors.card, marginHorizontal: Spacing.lg, borderRadius: Radius.md, paddingHorizontal: Spacing.lg },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accent + '15',
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  noticeText: { fontSize: 13, color: Colors.primary, lineHeight: 18, flex: 1 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: Spacing.md, fontSize: 16, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.xl, width: 330 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  modalSubtitle: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md, marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  textInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 8, fontSize: 13,
    color: Colors.textPrimary, backgroundColor: Colors.background, marginBottom: Spacing.md,
  },
  hintBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.warning + '15', borderRadius: Radius.sm,
    padding: Spacing.sm, marginBottom: Spacing.md,
  },
  hintText: { fontSize: 11, color: Colors.warning, flex: 1 },
  modalButtons: { flexDirection: 'row', gap: Spacing.sm },
  modalCancel: { flex: 1, height: 42, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600' },
  modalSave: { flex: 1, height: 42, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.accent, borderRadius: Radius.sm },
  modalSaveText: { color: '#fff', fontWeight: '700' },
  pinModal: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.xl, width: 300 },
  pinTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg, textAlign: 'center' },
  pinSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  pinLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  pinInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    height: 48, paddingHorizontal: Spacing.md, fontSize: 20, textAlign: 'center',
    letterSpacing: 8, marginBottom: Spacing.md, color: Colors.textPrimary,
  },
  pinError: { fontSize: 12, color: Colors.error, textAlign: 'center', marginBottom: Spacing.sm },
  pinButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  pinCancel: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm },
  pinCancelText: { color: Colors.textSecondary, fontWeight: '600' },
  pinConfirm: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.accent, borderRadius: Radius.sm },
  pinConfirmText: { color: '#fff', fontWeight: '700' },
});
