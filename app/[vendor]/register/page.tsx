"use client"

import AuthLayout from "@/components/auth/AuthLayout"
import RegisterForm from "@/components/auth/RegisterForm"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"

export default function VendorRegisterPage({
  params,
}: {
  params: { vendor: string }
}) {
  const vendor = params.vendor
  const branding = useBrandingConfig(vendor)

  return (
    <AuthLayout
      vendorName={branding.vendorName}
      title={`Join ${branding.vendorName}`}
      subtitle="Finish creating your admin account."
      copyrightText={branding.copyrightText}
    >
      <RegisterForm vendor={vendor} />
    </AuthLayout>
  )
}
