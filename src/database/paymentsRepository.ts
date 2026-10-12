import { getSupabase } from './supabaseClient';
import type { Payment, AccountType, PaymentMethod } from './schema';
import { nowISO } from '../utils/dates';

export interface CreatePaymentInput {
  job_id: number;
  account_type: AccountType;
  amount_paise: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

export async function getPaymentsByJob(jobId: number): Promise<Payment[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('job_id', jobId)
    .order('payment_date', { ascending: true })
    .order('id', { ascending: true });

  if (error || !data) {
    console.error('Error fetching payments for job:', error);
    return [];
  }

  return data.map((p: any) => ({
    ...p,
    id: Number(p.id),
    job_id: Number(p.job_id),
    amount_paise: Number(p.amount_paise),
  }));
}

export async function getPaymentsByJobAndType(jobId: number, accountType: AccountType): Promise<Payment[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('job_id', jobId)
    .eq('account_type', accountType)
    .order('payment_date', { ascending: true })
    .order('id', { ascending: true });

  if (error || !data) {
    console.error('Error fetching payments by job and type:', error);
    return [];
  }

  return data.map((p: any) => ({
    ...p,
    id: Number(p.id),
    job_id: Number(p.job_id),
    amount_paise: Number(p.amount_paise),
  }));
}

export async function getAllPayments(filters: {
  accountType?: AccountType;
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<(Payment & { client_name: string; job_date: string })[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('payments')
    .select('*, jobs(client_name, job_date)')
    .order('payment_date', { ascending: false })
    .order('id', { ascending: false });

  if (filters.accountType) {
    query = query.eq('account_type', filters.accountType);
  }
  if (filters.dateFrom) {
    query = query.gte('payment_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('payment_date', filters.dateTo);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching all payments:', error);
    return [];
  }

  return data.map((p: any) => ({
    ...p,
    id: Number(p.id),
    job_id: Number(p.job_id),
    amount_paise: Number(p.amount_paise),
    client_name: p.jobs?.client_name || '',
    job_date: p.jobs?.job_date || '',
  }));
}

export async function createPayment(input: CreatePaymentInput): Promise<number> {
  const supabase = getSupabase();
  const now = nowISO();
  const { data, error } = await supabase
    .from('payments')
    .insert([
      {
        job_id: input.job_id,
        account_type: input.account_type,
        amount_paise: input.amount_paise,
        payment_date: input.payment_date?.trim() ? input.payment_date.trim() : now.split('T')[0],
        payment_method: input.payment_method,
        reference_number: input.reference_number ?? '',
        notes: input.notes ?? '',
        created_at: now,
      },
    ])
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error creating payment:', error);
    throw new Error(error?.message || 'Failed to create payment');
  }

  return Number(data.id);
}

export async function updatePayment(id: number, input: Partial<CreatePaymentInput>): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('payments')
    .update(input)
    .eq('id', id);

  if (error) {
    console.error('Error updating payment:', error);
    throw new Error(error.message);
  }
}

export async function deletePayment(id: number): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting payment:', error);
    throw new Error(error.message);
  }
}

export async function getSumByJobAndType(jobId: number, accountType: AccountType): Promise<number> {
  const payments = await getPaymentsByJobAndType(jobId, accountType);
  return payments.reduce((sum, p) => sum + p.amount_paise, 0);
}
