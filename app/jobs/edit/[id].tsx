import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getJobById } from '../../../src/database/jobsRepository';
import { getSumByJobAndType } from '../../../src/database/paymentsRepository';
import { JobForm } from '../../../src/components/JobForm';
import { Colors } from '../../../src/utils/theme';
import type { JobWithTotals } from '../../../src/database/schema';

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const jobId = parseInt(id ?? '0');

  const [job, setJob] = useState<JobWithTotals | null>(null);
  const [cPaid, setCPaid] = useState(0);
  const [svkPaid, setSVKPaid] = useState(0);

  useEffect(() => {
    Promise.all([
      getJobById(jobId),
      getSumByJobAndType(jobId, 'C'),
      getSumByJobAndType(jobId, 'SVK'),
    ]).then(([j, c, s]) => {
      setJob(j);
      setCPaid(c);
      setSVKPaid(s);
    });
  }, [jobId]);

  if (!job) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <JobForm
      existing={job}
      initialCustomerPaid={cPaid}
      initialSVKPaid={svkPaid}
      onSaved={(jid) => router.replace(`/jobs/${jid}`)}
      onCancel={() => router.back()}
    />
  );
}
