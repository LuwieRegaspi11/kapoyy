import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../AuthContext';

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  department: string; // 'All' | 'CSE' | 'CTHM' | 'BAA'
  createdBy: string;  // role: 'admin' | 'faculty'
  registeredCount: number;
  maxCapacity?: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
  imageUrl?: string;
  registeredByMe?: boolean;
}

interface EventsCtx {
  events: AppEvent[];
  loading: boolean;
  refresh: () => Promise<void>;
  addEvent: (e: Omit<AppEvent, 'id' | 'registeredCount' | 'status'>) => Promise<void>;
  registerForEvent: (id: string) => Promise<void>;
}

const Ctx = createContext<EventsCtx>({
  events: [], loading: false, refresh: async () => {}, addEvent: async () => {}, registerForEvent: async () => {},
});

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/events');
      setEvents(res.events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, user]);

  const addEvent = async (e: Omit<AppEvent, 'id' | 'registeredCount' | 'status'>) => {
    await api.post('/events', {
      title: e.title, description: e.description, date: e.date, time: e.time,
      location: e.location, department: e.department, maxCapacity: e.maxCapacity, imageUrl: e.imageUrl,
    });
    await refresh();
  };

  const registerForEvent = async (id: string) => {
    await api.post(`/events/${id}/register`);
    await refresh();
  };

  return (
    <Ctx.Provider value={{ events, loading, refresh, addEvent, registerForEvent }}>
      {children}
    </Ctx.Provider>
  );
}

export const useEvents = () => useContext(Ctx);
