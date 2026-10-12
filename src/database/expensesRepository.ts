import { getSupabase } from './supabaseClient';
import type { Expense } from './schema';
import { nowISO } from '../utils/dates';

export interface CreateExpenseInput {
  job_id: number;
  description: string;
  amount_paise: number;
  expense_date: string;
  notes?: string;
}

export async function getExpensesByJob(jobId: number): Promise<Expense[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('job_id', jobId)
    .order('expense_date', { ascending: true })
    .order('id', { ascending: true });

  if (error || !data) {
    console.error('Error fetching expenses for job:', error);
    return [];
  }

  return data.map((e: any) => ({
    ...e,
    id: Number(e.id),
    job_id: Number(e.job_id),
    amount_paise: Number(e.amount_paise),
  }));
}

export async function getAllExpenses(filters: { dateFrom?: string; dateTo?: string } = {}): Promise<(Expense & { client_name: string })[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('expenses')
    .select('*, jobs(client_name)')
    .order('expense_date', { ascending: false });

  if (filters.dateFrom) {
    query = query.gte('expense_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('expense_date', filters.dateTo);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching all expenses:', error);
    return [];
  }

  return data.map((e: any) => ({
    ...e,
    id: Number(e.id),
    job_id: Number(e.job_id),
    amount_paise: Number(e.amount_paise),
    client_name: e.jobs?.client_name || '',
  }));
}

export async function createExpense(input: CreateExpenseInput): Promise<number> {
  const supabase = getSupabase();
  const now = nowISO();
  const { data, error } = await supabase
    .from('expenses')
    .insert([
      {
        job_id: input.job_id,
        description: input.description,
        amount_paise: input.amount_paise,
        expense_date: input.expense_date?.trim() ? input.expense_date.trim() : now.split('T')[0],
        notes: input.notes ?? '',
        created_at: now,
      },
    ])
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error creating expense:', error);
    throw new Error(error?.message || 'Failed to create expense');
  }

  return Number(data.id);
}

export async function updateExpense(id: number, input: Partial<CreateExpenseInput>): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('expenses')
    .update(input)
    .eq('id', id);

  if (error) {
    console.error('Error updating expense:', error);
    throw new Error(error.message);
  }
}

export async function deleteExpense(id: number): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting expense:', error);
    throw new Error(error.message);
  }
}

export async function getSumByJob(jobId: number): Promise<number> {
  const expenses = await getExpensesByJob(jobId);
  return expenses.reduce((sum, e) => sum + e.amount_paise, 0);
}
