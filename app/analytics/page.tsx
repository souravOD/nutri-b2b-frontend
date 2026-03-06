"use client";

import AppShell from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <Card className="p-8 text-center text-muted-foreground">
          Analytics dashboard coming soon.
        </Card>
      </div>
    </AppShell>
  );
}
