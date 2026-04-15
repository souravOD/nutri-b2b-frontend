"use client";
// Thin client wrapper that activates push notification registration.
// Must be a separate "use client" component because app/layout.tsx is a
// server component and can't call hooks directly.
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  useNotifications();
  return <>{children}</>;
}
