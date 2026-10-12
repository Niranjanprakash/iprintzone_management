import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../utils/theme';

interface Props {
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}

export function SummaryCard({ label, value, color = Colors.primary, small }: Props) {
  return (
    <View style={[styles.card, small && styles.small]}>
      <Text style={[styles.value, { color }, small && styles.smallValue]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flex: 1,
    minWidth: 140,
    margin: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  small: {
    padding: Spacing.md,
    minWidth: 100,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  smallValue: {
    fontSize: 15,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
