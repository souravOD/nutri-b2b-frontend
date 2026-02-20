"use client";

import AppShell from "@/components/app-shell";
import VendorRegistrationForm from "@/components/vendors/VendorRegistrationForm";

export default function NewVendorPage() {
  return (
    <AppShell title="Register Vendor">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold">Register Vendor</h1>
        <p className="text-sm text-muted-foreground">
          Superadmin only. This creates the vendor in Appwrite and Supabase.
        </p>
      </div>
      <VendorRegistrationForm />
    </AppShell>
  );
}
