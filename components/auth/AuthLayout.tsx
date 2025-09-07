"use client"

import type React from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Brand/Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              O
            </div>
            <span className="ml-2 text-xl font-semibold text-gray-900">Odyssey B2B</span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600 mt-2">{subtitle}</p>}
          </CardHeader>
          <CardContent className="pt-0">{children}</CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <a href="/terms" className="hover:text-gray-700 transition-colors">
              Terms
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a href="/privacy" className="hover:text-gray-700 transition-colors">
              Privacy
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a href="/dpa" className="hover:text-gray-700 transition-colors">
              DPA
            </a>
          </div>
          {footer}
        </div>
      </div>
    </div>
  )
}
