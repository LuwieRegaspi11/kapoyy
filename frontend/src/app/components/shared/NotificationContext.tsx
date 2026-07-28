import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  targetRole?: string; // undefined = all
  targetDept?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationCtx {
  notifications: Notification[];
  unreadCount: (role?: string, dept?: string) => number;
  trigger: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (role?: string, dept?: string) => Promise<void>;
  getFor: (role?: string, dept?: string) => Notification[];
  refresh: () => Promise<void>;
}

const Ctx = createContext<NotificationCtx>({
  notifications: [], unreadCount: () => 0,
  trigger: async () => {}, markRead: async () => {}, markAllRead: async () => {},
  getFor: () => [], refresh: async () => {},
});

// The backend already scopes /api/notifications to the authenticated user's
// role/department/id, so `getFor`/`unreadCount` here just return the fetched
// list. The (role, dept) parameters are kept for backward compatibility with
// existing call sites but are no longer needed to filter client-side.
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(async () => {
    if (!user) { setNotifications([]); return; }
    const res = await api.get('/notifications');
    setNotifications(res.notifications);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Light polling so notifications (e.g. donation verified) show up without
  // requiring a full page refresh.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [user, refresh]);

  const getFor = useCallback((_role?: string, _dept?: string) => notifications, [notifications]);
  const unreadCount = useCallback((_role?: string, _dept?: string) => notifications.filter(n => !n.read).length, [notifications]);

  const trigger = async (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    await api.post('/notifications', n);
    await refresh();
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await api.put(`/notifications/${id}/read`);
  };

  const markAllRead = async (_role?: string, _dept?: string) => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await api.put('/notifications/read-all');
  };

  return (
    <Ctx.Provider value={{ notifications, unreadCount, trigger, markRead, markAllRead, getFor, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useNotifications = () => useContext(Ctx);
