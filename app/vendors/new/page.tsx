"use client";

import AppShell from "@/components/app-shell";
import VendorRegistrationForm from "@/components/vendors/VendorRegistrationForm";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function NewVendorPage() {
  return (
    <AppShell title="Register Vendor">
      {/* Full-width layout: break out of AppShell padding to match Figma 745-4655 */}
      <div className="-mx-4 md:-mx-6 -mt-4 min-h-screen bg-[#f8fafc] pt-4">
        <div className="flex flex-col gap-[32px] p-10 md:p-[40px]">
        <div className="space-y-4">
          <Breadcrumb>
            <BreadcrumbList className="text-[#64748b]">
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Portal</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/vendors">Vendors</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-[#0f172a]">Register Vendor</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-semibold text-[#0f172a]">Register New Vendor</h1>
        </div>
        <VendorRegistrationForm />
        </div>
      </div>
    </AppShell>
  );
}
