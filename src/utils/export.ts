import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getSupabase } from '../database/supabaseClient';
import { formatDate } from './dates';

const cacheDir: string = (FileSystem as any).cacheDirectory ?? '';

function csvRow(fields: (string | number)[]): string {
  return fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',');
}

export async function exportJobsCSV(): Promise<void> {
  const supabase = getSupabase();
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*, payments(*), expenses(*)')
    .order('job_date', { ascending: false });

  if (error || !jobs) {
    throw new Error(error?.message || 'Could not fetch jobs for export');
  }

  const header = csvRow([
    'ID','Date','Client','Phone','Description','Qty',
    'C Rate','C Design','C Total','C Paid','C Balance',
    'SVK Rate','SVK Total','SVK Paid','SVK Balance',
    'Expenses','Profit','Status','Expected Delivery','Actual Delivery','Remarks'
  ]);

  const rows = jobs.map((j: any) => {
    const payments = j.payments || [];
    const expenses = j.expenses || [];
    const customer_paid = payments.filter((p: any) => p.account_type === 'C').reduce((s: number, p: any) => s + Number(p.amount_paise || 0), 0);
    const svk_paid = payments.filter((p: any) => p.account_type === 'SVK').reduce((s: number, p: any) => s + Number(p.amount_paise || 0), 0);
    const total_expenses = expenses.reduce((s: number, e: any) => s + Number(e.amount_paise || 0), 0);

    const c_total = Number(j.c_total_paise || 0);
    const svk_total = Number(j.svk_total_paise || 0);

    return csvRow([
      j.id, formatDate(j.job_date), j.client_name, j.phone_number, j.job_description,
      j.quantity, (j.c_rate_paise || 0) / 100, (j.c_design_charge_paise || 0) / 100, c_total / 100,
      customer_paid / 100, (c_total - customer_paid) / 100,
      (j.svk_rate_paise || 0) / 100, svk_total / 100, (svk_total - svk_paid) / 100,
      total_expenses / 100, (c_total - svk_total - total_expenses) / 100,
      j.delivery_status, formatDate(j.expected_delivery_date), formatDate(j.actual_delivery_date), j.remarks,
    ]);
  });

  const csv = [header, ...rows].join('\n');
  await writeAndShare(csv, `iprintzone_jobs_${todayStr()}.csv`);
}

export async function exportPaymentsCSV(): Promise<void> {
  const supabase = getSupabase();
  const { data: payments, error } = await supabase
    .from('payments')
    .select('*, jobs(client_name)')
    .order('payment_date', { ascending: false });

  if (error || !payments) {
    throw new Error(error?.message || 'Could not fetch payments for export');
  }

  const header = csvRow(['ID','Job ID','Client','Type','Amount','Date','Method','Reference','Notes']);
  const rows = payments.map((p: any) => csvRow([
    p.id, p.job_id, p.jobs?.client_name || '', p.account_type, (p.amount_paise || 0) / 100,
    formatDate(p.payment_date), p.payment_method, p.reference_number, p.notes,
  ]));
  await writeAndShare([header, ...rows].join('\n'), `iprintzone_payments_${todayStr()}.csv`);
}

export async function exportExpensesCSV(): Promise<void> {
  const supabase = getSupabase();
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*, jobs(client_name)')
    .order('expense_date', { ascending: false });

  if (error || !expenses) {
    throw new Error(error?.message || 'Could not fetch expenses for export');
  }

  const header = csvRow(['ID','Job ID','Client','Description','Amount','Date','Notes']);
  const rows = expenses.map((e: any) => csvRow([
    e.id, e.job_id, e.jobs?.client_name || '', e.description, (e.amount_paise || 0) / 100,
    formatDate(e.expense_date), e.notes,
  ]));
  await writeAndShare([header, ...rows].join('\n'), `iprintzone_expenses_${todayStr()}.csv`);
}

async function writeAndShare(content: string, filename: string): Promise<void> {
  const path = `${cacheDir}${filename}`;
  await (FileSystem as any).writeAsStringAsync(path, content, { encoding: 'utf8' });
  await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: `Export ${filename}` });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}
