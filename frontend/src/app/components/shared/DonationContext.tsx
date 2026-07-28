import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../AuthContext';

export interface DonationRecord {
  id: string;
  alumniName: string;
  alumniEmail: string;
  department: string;
  campaign: string;
  amount: number;
  type: 'Cash' | 'In-Kind';
  description: string;
  proofUrl: string | null;
  status: 'Pending' | 'Verified' | 'Rejected';
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  department: string;
  active: boolean;
  deadline?: string;
}

interface DonationCtx {
  donations: DonationRecord[];
  campaigns: Campaign[];
  loading: boolean;
  refresh: () => Promise<void>;
  submitDonation: (d: Omit<DonationRecord, 'id' | 'status' | 'submittedAt'>) => Promise<DonationRecord | undefined>;
  verifyDonation: (id: string, verifiedBy: string) => Promise<void>;
  rejectDonation: (id: string, reason: string, verifiedBy: string) => Promise<void>;
  addCampaign: (c: Omit<Campaign, 'id' | 'current'>) => Promise<void>;
}

const Ctx = createContext<DonationCtx>({
  donations: [], campaigns: [], loading: false,
  refresh: async () => {},
  submitDonation: async () => undefined, verifyDonation: async () => {},
  rejectDonation: async () => {}, addCampaign: async () => {},
});

export function DonationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setDonations([]); setCampaigns([]); return; }
    setLoading(true);
    try {
      const [donationsRes, campaignsRes] = await Promise.all([
        api.get('/donations'),
        api.get('/campaigns'),
      ]);
      setDonations(donationsRes.donations);
      setCampaigns(campaignsRes.campaigns);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const submitDonation = async (d: Omit<DonationRecord, 'id' | 'status' | 'submittedAt'>) => {
    const res = await api.post('/donations', {
      campaign: d.campaign, amount: d.amount, type: d.type,
      description: d.description, proofUrl: d.proofUrl,
    });
    await refresh();
    return res.donation as DonationRecord;
  };

  const verifyDonation = async (id: string) => {
    await api.put(`/donations/${id}/verify`);
    await refresh();
  };

  const rejectDonation = async (id: string, reason: string) => {
    await api.put(`/donations/${id}/reject`, { reason });
    await refresh();
  };

  const addCampaign = async (c: Omit<Campaign, 'id' | 'current'>) => {
    await api.post('/campaigns', c);
    await refresh();
  };

  return (
    <Ctx.Provider value={{ donations, campaigns, loading, refresh, submitDonation, verifyDonation, rejectDonation, addCampaign }}>
      {children}
    </Ctx.Provider>
  );
}

export const useDonations = () => useContext(Ctx);
