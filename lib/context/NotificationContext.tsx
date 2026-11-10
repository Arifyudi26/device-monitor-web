import { createContext, useContext, useState, ReactNode } from "react";

export interface UploadNotification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  fileName?: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationContextValue {
  notifications: UploadNotification[];
  unreadCount: number;
  addNotification: (n: Omit<UploadNotification, "id" | "read" | "createdAt">) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<UploadNotification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (n: Omit<UploadNotification, "id" | "read" | "createdAt">) => {
    setNotifications((prev) => [
      {
        ...n,
        id: Math.random().toString(36).slice(2),
        read: false,
        createdAt: new Date(),
      },
      ...prev,
    ]);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => setNotifications([]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
