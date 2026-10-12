import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats, getRecentJobs, getUpcomingDeliveries } from '../database/jobsRepository';
import type { JobWithTotals, Job } from '../database/schema';

interface DashboardData {
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
  recentJobs: JobWithTotals[];
  upcomingDeliveries: Job[];
}

export function useDashboard(dateFrom?: string, dateTo?: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, recent, upcoming] = await Promise.all([
        getDashboardStats(dateFrom, dateTo),
        getRecentJobs(5),
        getUpcomingDeliveries(5),
      ]);
      setData({ ...stats, recentJobs: recent, upcomingDeliveries: upcoming });
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, refresh: load };
}
