"use client"

import AuthLayout from "@/components/auth/AuthLayout"
import RegisterEmployeeForm from "@/components/auth/RegisterEmployeeForm"

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Use your work email to join your company workspace."
    >
      <RegisterEmployeeForm />
    </AuthLayout>
  )
}
