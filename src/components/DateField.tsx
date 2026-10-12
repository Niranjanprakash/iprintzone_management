import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Colors, Spacing, Radius } from '../utils/theme';
import { formatDate } from '../utils/dates';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './SvgIcons';

interface Props {
  label: string;
  value: string; // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  error?: string;
  optional?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DateField({ label, value, onChange, error, optional }: Props) {
  const [show, setShow] = useState(false);

  // Initialize selected date
  const todayIso = new Date().toISOString().split('T')[0];
  const initialDate = value || todayIso;
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Current viewed month and year in the calendar
  const [parts] = useState(() => {
    const [y, m] = initialDate.split('-').map(Number);
    return { year: y || new Date().getFullYear(), month: m ? m - 1 : new Date().getMonth() };
  });

  const [viewYear, setViewYear] = useState(parts.year);
  const [viewMonth, setViewMonth] = useState(parts.month); // 0-11

  const handleOpen = () => {
    const cur = value || todayIso;
    setSelectedDate(cur);
    const [y, m] = cur.split('-').map(Number);
    setViewYear(y || new Date().getFullYear());
    setViewMonth(m ? m - 1 : new Date().getMonth());
    setShow(true);
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    setShow(false);
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const newIso = `${viewYear}-${mStr}-${dStr}`;
    setSelectedDate(newIso);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSetToday = () => {
    const now = new Date();
    setSelectedDate(todayIso);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // Calendar calculations
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Selected date parsed
  const [selY, selM, selD] = selectedDate.split('-').map(Number);
  const isSelectedMonth = selY === viewYear && selM === viewMonth + 1;

  // Build calendar matrix
  const calendarCells: { day: number; isCurrentMonth: boolean; key: string }[] = [];

  // Padding from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      key: `prev-${daysInPrevMonth - i}`,
    });
  }

  // Days in current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      key: `cur-${d}`,
    });
  }

  // Padding for next month to complete the grid rows
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      day: i,
      isCurrentMonth: false,
      key: `next-${i}`,
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}{optional ? ' (optional)' : ''}</Text>
      <TouchableOpacity
        style={[styles.input, !!error && styles.inputError]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.valueText : styles.placeholder}>
          {value ? formatDate(value) : 'DD/MM/YYYY'}
        </Text>
        <CalendarIcon size={20} color={Colors.accent} />
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}

      {/* Visual Calendar Modal */}
      <Modal visible={show} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header / Month Navigator */}
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                <ChevronLeftIcon size={20} color={Colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.monthYearDisplay}>
                <Text style={styles.monthText}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              </View>

              <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                <ChevronRightIcon size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Weekday Labels */}
            <View style={styles.weekRow}>
              {WEEK_DAYS.map((wd, i) => (
                <Text key={wd} style={[styles.weekDayText, (i === 0 || i === 6) && styles.weekendText]}>
                  {wd}
                </Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.grid}>
              {calendarCells.map(cell => {
                const isSelected = cell.isCurrentMonth && isSelectedMonth && cell.day === selD;
                const isToday = cell.isCurrentMonth &&
                  new Date().getDate() === cell.day &&
                  new Date().getMonth() === viewMonth &&
                  new Date().getFullYear() === viewYear;

                return (
                  <TouchableOpacity
                    key={cell.key}
                    disabled={!cell.isCurrentMonth}
                    style={[
                      styles.cell,
                      isSelected && styles.selectedCell,
                      isToday && !isSelected && styles.todayCell,
                    ]}
                    onPress={() => cell.isCurrentMonth && handleSelectDay(cell.day)}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        !cell.isCurrentMonth && styles.dimmedText,
                        isSelected && styles.selectedCellText,
                        isToday && !isSelected && styles.todayText,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Actions & Confirm Buttons */}
            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.todayBtn} onPress={handleSetToday}>
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>

              <View style={styles.actionButtons}>
                {optional && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => { onChange(''); setShow(false); }}
                  >
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShow(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                  <Text style={styles.confirmText}>Select</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm,
    backgroundColor: Colors.card, paddingHorizontal: Spacing.md, height: 48,
  },
  inputError: { borderColor: Colors.error },
  valueText: { fontSize: 16, color: Colors.textPrimary },
  placeholder: { fontSize: 16, color: Colors.textMuted },
  error: { fontSize: 12, color: Colors.error, marginTop: 4 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 350,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthYearDisplay: { alignItems: 'center' },
  monthText: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  weekendText: { color: Colors.accent },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  selectedCell: {
    backgroundColor: Colors.accent,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  cellText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dimmedText: {
    color: Colors.border,
  },
  selectedCellText: {
    color: '#fff',
    fontWeight: '700',
  },
  todayText: {
    color: Colors.accent,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  todayBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  clearText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
  cancelBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  cancelText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  confirmBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  confirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
