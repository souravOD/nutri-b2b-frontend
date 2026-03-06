"use client"

import type React from "react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface AuthLayoutProps {
  vendorName: string
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  copyrightText?: string
  cardWidth?: "default" | "wide"
  footerVariant?: "full" | "copyrightOnly"
  mainPadding?: "default" | "compact"
}

export default function AuthLayout({
  vendorName,
  title,
  subtitle,
  children,
  footer,
  copyrightText = "© 2024. All rights reserved.",
  cardWidth = "default",
  footerVariant = "full",
  mainPadding = "default",
}: AuthLayoutProps) {
  const initial = vendorName.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f7f8]">
      {/* Header */}
      <header className="bg-white border-b border-[#e2e8f0] shrink-0">
        <div className="max-w-[1280px] mx-auto h-[52px] flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#002c5d] flex items-center justify-center text-white font-bold text-lg shrink-0">
              {initial}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[16px] text-[#0f172a] tracking-[0.8px] uppercase leading-5">
                {vendorName}
              </span>
              <span className="font-medium text-[12px] text-[#64748b] leading-4">
                Vendor Portal
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        className={`flex-1 flex items-center justify-center px-6 ${
          mainPadding === "compact" ? "py-[74px] pb-[74px]" : "py-[134px] pb-[160px]"
        }`}
      >
        <div className={cardWidth === "wide" ? "w-full max-w-[520px]" : "w-full max-w-[440px]"}>
          <Card
            className={`border border-[#e2e8f0] rounded-xl overflow-hidden ${
              cardWidth === "wide"
                ? "shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]"
                : "shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
            }`}
          >
            <CardHeader
              className={`text-center ${
                cardWidth === "wide" ? "pt-10 pb-2 px-10" : "p-8 pb-4"
              }`}
            >
              <h1 className="text-2xl font-bold text-[#0067a0]">{title}</h1>
              {subtitle && (
                <p className={cardWidth === "wide" ? "text-base text-[#64748b] mt-2 leading-6" : "text-sm text-[#64748b] mt-2"}>
                  {subtitle}
                </p>
              )}
            </CardHeader>
            <CardContent
              className={cardWidth === "wide" ? "pt-0 px-10 pb-10" : "pt-0 px-8 pb-8"}
            >
              {children}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 px-6 py-8">
        {footerVariant === "full" && (
          <div className="flex items-center justify-center gap-6 text-[12px] text-[#64748b] mb-4">
            <a href="/privacy" className="hover:text-[#0f172a] transition-colors">
              Privacy Policy
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a href="/terms" className="hover:text-[#0f172a] transition-colors">
              Terms of Service
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a href="/help" className="hover:text-[#0f172a] transition-colors">
              Help Center
            </a>
          </div>
        )}
        <p className="text-center text-[10px] font-semibold text-[#94a3b8] tracking-widest uppercase">
          {copyrightText}
        </p>
        {footer}
      </footer>
    </div>
  )
}
