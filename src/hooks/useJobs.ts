import { useState, useEffect, useCallback } from 'react';
import { getJobs, type JobFilters } from '../database/jobsRepository';
import type { JobWithTotals } from '../database/schema';

export function useJobs(filters: JobFilters = {}) {
  const [jobs, setJobs] = useState<JobWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getJobs(filters);
      setJobs(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => { load(); }, [load]);

  return { jobs, loading, error, refresh: load };
}
