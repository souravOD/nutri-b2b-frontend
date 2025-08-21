"use client"

import AuthLayout from "@/components/auth/AuthLayout"
import RegisterForm from "@/components/auth/RegisterForm"

export default function VendorRegisterPage({
  params,
}: {
  params: { vendor: string }
}) {
  const vendor = params.vendor

  return (
    <AuthLayout title={`Join ${vendor}`} subtitle="Finish creating your admin account.">
      <RegisterForm vendor={vendor} />
    </AuthLayout>
  )
}
