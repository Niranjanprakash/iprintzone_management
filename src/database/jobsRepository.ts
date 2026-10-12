import { getSupabase } from './supabaseClient';
import type { Job, JobWithTotals, DeliveryStatus } from './schema';
import { nowISO } from '../utils/dates';

export interface JobFilters {
  search?: string;
  status?: DeliveryStatus | '';
  dateFrom?: string;
  dateTo?: string;
  hasCustomerBalance?: boolean;
  hasSVKBalance?: boolean;
}

export interface CreateJobInput {
  job_date: string;
  phone_number: string;
  client_name: string;
  job_description: string;
  quantity: number;
  c_rate_paise: number;
  c_design_charge_paise: number;
  c_total_paise: number;
  svk_rate_paise: number;
  svk_total_paise: number;
  ipz_total_paise: number;
  remarks: string;
  expected_delivery_date: string;
  delivery_status: DeliveryStatus;
}

function enrichJobData(row: any): JobWithTotals {
  const payments = Array.isArray(row.payments) ? row.payments : [];
  const expenses = Array.isArray(row.expenses) ? row.expenses : [];

  const customerPaid = payments
    .filter((p: any) => p.account_type === 'C')
    .reduce((s: number, p: any) => s + Number(p.amount_paise || 0), 0);

  const svkPaid = payments
    .filter((p: any) => p.account_type === 'SVK')
    .reduce((s: number, p: any) => s + Number(p.amount_paise || 0), 0);

  const totalExpenses = expenses
    .reduce((s: number, e: any) => s + Number(e.amount_paise || 0), 0);

  const cTotal = Number(row.c_total_paise || 0);
  const svkTotal = Number(row.svk_total_paise || 0);

  return {
    ...row,
    id: Number(row.id),
    expected_delivery_date: row.expected_delivery_date || '',
    actual_delivery_date: row.actual_delivery_date || '',
    customer_paid_paise: customerPaid,
    svk_paid_paise: svkPaid,
    customer_balance_paise: cTotal - customerPaid,
    svk_balance_paise: svkTotal - svkPaid,
    total_expenses_paise: totalExpenses,
    ipz_profit_paise: cTotal - svkTotal - totalExpenses,
  };
}

export async function getJobs(filters: JobFilters = {}): Promise<JobWithTotals[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('jobs')
    .select('*, payments(*), expenses(*)')
    .order('job_date', { ascending: false })
    .order('id', { ascending: false });

  if (filters.status) {
    query = query.eq('delivery_status', filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte('job_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('job_date', filters.dateTo);
  }
  if (filters.search) {
    const s = filters.search.trim();
    query = query.or(`client_name.ilike.%${s}%,phone_number.ilike.%${s}%,job_description.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching jobs from Supabase:', error);
    return [];
  }

  let results = (data || []).map(enrichJobData);

  if (filters.hasCustomerBalance) {
    results = results.filter(j => j.customer_balance_paise > 0);
  }
  if (filters.hasSVKBalance) {
    results = results.filter(j => j.svk_balance_paise > 0);
  }

  return results;
}

export async function getJobById(id: number): Promise<JobWithTotals | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('jobs')
    .select('*, payments(*), expenses(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching job by ID from Supabase:', error);
    return null;
  }

  return enrichJobData(data);
}

export async function createJob(input: CreateJobInput): Promise<number> {
  const supabase = getSupabase();
  const now = nowISO();
  const payload = {
    ...input,
    expected_delivery_date: input.expected_delivery_date?.trim() ? input.expected_delivery_date.trim() : null,
    actual_delivery_date: null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert([payload])
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error creating job in Supabase:', error);
    throw new Error(error?.message || 'Failed to create job');
  }

  return Number(data.id);
}

export const addJob = createJob;

export async function updateJob(id: number, input: Partial<CreateJobInput> & { actual_delivery_date?: string }): Promise<void> {
  const supabase = getSupabase();
  const sanitizedInput: any = {
    ...input,
    updated_at: nowISO(),
  };

  if ('expected_delivery_date' in input) {
    sanitizedInput.expected_delivery_date = input.expected_delivery_date?.trim() ? input.expected_delivery_date.trim() : null;
  }
  if ('actual_delivery_date' in input) {
    sanitizedInput.actual_delivery_date = input.actual_delivery_date?.trim() ? input.actual_delivery_date.trim() : null;
  }

  const { error } = await supabase
    .from('jobs')
    .update(sanitizedInput)
    .eq('id', id);

  if (error) {
    console.error('Error updating job in Supabase:', error);
    throw new Error(error.message);
  }
}

export async function deleteJob(id: number): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting job from Supabase:', error);
    throw new Error(error.message);
  }
}

export async function getDashboardStats(dateFrom?: string, dateTo?: string): Promise<{
  totalJobs: number;
  todayJobs: number;
  awaitingDelivery: number;
  deliveredJobs: number;
  totalCustomerBilling: number;
  totalCustomerCollected: number;
  customerOutstanding: number;
  totalSVKCost: number;
  totalSVKPaid: number;
  svkOutstanding: number;
  totalIPZRevenue: number;
  totalExpenses: number;
  totalIPZProfit: number;
}> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  let query = supabase.from('jobs').select('*, payments(*), expenses(*)');
  if (dateFrom && dateTo) {
    query = query.gte('job_date', dateFrom).lte('job_date', dateTo);
  } else if (dateFrom) {
    query = query.gte('job_date', dateFrom);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching dashboard stats from Supabase:', error);
    return {
      totalJobs: 0,
      todayJobs: 0,
      awaitingDelivery: 0,
      deliveredJobs: 0,
      totalCustomerBilling: 0,
      totalCustomerCollected: 0,
      customerOutstanding: 0,
      totalSVKCost: 0,
      totalSVKPaid: 0,
      svkOutstanding: 0,
      totalIPZRevenue: 0,
      totalExpenses: 0,
      totalIPZProfit: 0,
    };
  }

  const enriched = data.map(enrichJobData);

  let totalBilling = 0;
  let totalSVKCost = 0;
  let totalCustomerCollected = 0;
  let totalSVKPaid = 0;
  let totalExpenses = 0;
  let todayJobsCount = 0;
  let awaitingDeliveryCount = 0;
  let deliveredJobsCount = 0;

  for (const j of enriched) {
    totalBilling += j.c_total_paise;
    totalSVKCost += j.svk_total_paise;
    totalCustomerCollected += j.customer_paid_paise;
    totalSVKPaid += j.svk_paid_paise;
    totalExpenses += j.total_expenses_paise;

    if (j.job_date === today) todayJobsCount++;
    if (j.delivery_status === 'Delivered') deliveredJobsCount++;
    else awaitingDeliveryCount++;
  }

  return {
    totalJobs: enriched.length,
    todayJobs: todayJobsCount,
    awaitingDelivery: awaitingDeliveryCount,
    deliveredJobs: deliveredJobsCount,
    totalCustomerBilling: totalBilling,
    totalCustomerCollected,
    customerOutstanding: totalBilling - totalCustomerCollected,
    totalSVKCost,
    totalSVKPaid,
    svkOutstanding: totalSVKCost - totalSVKPaid,
    totalIPZRevenue: totalBilling,
    totalExpenses,
    totalIPZProfit: totalBilling - totalSVKCost - totalExpenses,
  };
}

export async function getRecentJobs(limit = 5): Promise<JobWithTotals[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('jobs')
    .select('*, payments(*), expenses(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching recent jobs:', error);
    return [];
  }

  return data.map(enrichJobData);
}

export async function getUpcomingDeliveries(limit = 5): Promise<Job[]> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .neq('delivery_status', 'Delivered')
    .gte('expected_delivery_date', today)
    .order('expected_delivery_date', { ascending: true })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching upcoming deliveries:', error);
    return [];
  }

  return data;
}
