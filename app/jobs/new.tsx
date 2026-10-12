import React from 'react';
import { useRouter } from 'expo-router';
import { JobForm } from '../../src/components/JobForm';

export default function NewJobScreen() {
  const router = useRouter();
  return (
    <JobForm
      onSaved={(jobId) => router.replace(`/jobs/${jobId}`)}
      onCancel={() => router.back()}
    />
  );
}
