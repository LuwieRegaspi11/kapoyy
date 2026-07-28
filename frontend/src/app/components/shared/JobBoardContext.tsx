import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../AuthContext';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Remote' | 'Contract' | 'Internship';
  department: string;
  description: string;
  requirements: string;
  postedBy: string;
  postedByRole: string;
  postedAt: string;
  active: boolean;
  suggestedBy?: string;
  status: 'Active' | 'Pending' | 'Closed';
}

interface JobCtx {
  jobs: Job[];
  loading: boolean;
  refresh: () => Promise<void>;
  addJob: (j: Omit<Job, 'id' | 'postedAt' | 'active'>) => Promise<void>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  closeJob: (id: string) => Promise<void>;
  approveJob: (id: string) => Promise<void>;
}

const Ctx = createContext<JobCtx>({
  jobs: [], loading: false, refresh: async () => {},
  addJob: async () => {}, updateJob: async () => {}, closeJob: async () => {}, approveJob: async () => {},
});

export function JobBoardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/jobs');
      setJobs(res.jobs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, user]);

  const addJob = async (j: Omit<Job, 'id' | 'postedAt' | 'active'>) => {
    await api.post('/jobs', {
      title: j.title, company: j.company, location: j.location, type: j.type,
      department: j.department, description: j.description, requirements: j.requirements,
    });
    await refresh();
  };

  const updateJob = async (id: string, updates: Partial<Job>) => {
    await api.put(`/jobs/${id}`, updates);
    await refresh();
  };

  const closeJob = async (id: string) => {
    await api.post(`/jobs/${id}/close`);
    await refresh();
  };

  const approveJob = async (id: string) => {
    await api.post(`/jobs/${id}/approve`);
    await refresh();
  };

  return (
    <Ctx.Provider value={{ jobs, loading, refresh, addJob, updateJob, closeJob, approveJob }}>
      {children}
    </Ctx.Provider>
  );
}

export const useJobBoard = () => useContext(Ctx);
