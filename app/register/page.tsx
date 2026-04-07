"use client"

import AuthLayout from "@/components/auth/AuthLayout"
import RegisterEmployeeForm from "@/components/auth/RegisterEmployeeForm"
import { useBrandingConfig } from "@/hooks/useBrandingConfig"

export default function RegisterPage() {
  const branding = useBrandingConfig()
  const subtitle =
    branding.vendorName === "B2B Portal"
      ? "Join the B2B portal to manage your enterprise operations."
      : `Join the ${branding.vendorName} B2B portal to manage your enterprise operations.`

  return (
    <AuthLayout
      vendorName={branding.vendorName}
      title="Create your account"
      subtitle={subtitle}
      copyrightText={branding.copyrightText}
      cardWidth="wide"
      footerVariant="copyrightOnly"
      mainPadding="compact"
    >
      <RegisterEmployeeForm />
    </AuthLayout>
  )
}
