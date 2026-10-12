import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../utils/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, destructive }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.destructiveBtn]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialog: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.xl, width: 300, maxWidth: '90%' },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  message: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xl },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  confirmBtn: { backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.sm },
  destructiveBtn: { backgroundColor: Colors.error },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
