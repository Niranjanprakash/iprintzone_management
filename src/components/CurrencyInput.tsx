import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius } from '../utils/theme';
import { parseINRInput, paiseToRupeeString } from '../utils/currency';

interface Props {
  label: string;
  valuePaise: number;
  onChange: (paise: number) => void;
  error?: string;
  placeholder?: string;
  editable?: boolean;
}

export function CurrencyInput({ label, valuePaise, onChange, error, placeholder = '0.00', editable = true }: Props) {
  const [text, setText] = useState(valuePaise > 0 ? paiseToRupeeString(valuePaise) : '');

  const handleChange = (val: string) => {
    setText(val);
    onChange(parseINRInput(val));
  };

  const handleBlur = () => {
    const paise = parseINRInput(text);
    setText(paise > 0 ? paiseToRupeeString(paise) : '');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, !!error && styles.inputError, !editable && styles.disabled]}>
        <Text style={styles.prefix}>₹</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          editable={editable}
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputError: { borderColor: Colors.error },
  disabled: { backgroundColor: '#F8FAFC' },
  prefix: { fontSize: 16, color: Colors.textSecondary, marginRight: 4 },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  error: { fontSize: 12, color: Colors.error, marginTop: 4 },
});
