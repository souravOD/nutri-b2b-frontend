"use client";

import AppShell from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export default function AuditPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <Card className="p-8 text-center text-muted-foreground">
          Full audit log view coming soon.
        </Card>
      </div>
    </AppShell>
  );
}
