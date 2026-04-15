"use client"

import { AlertTriangle } from "lucide-react"

export default function ComplianceCard({ product }: { product: any }) {
  const certifications = product?.certifications ?? []
  const dietaryTags = [...new Set([...(product?.dietaryTags ?? []), ...(product?.tags ?? [])].filter(Boolean))]
  const allergens = product?.allergens ?? []

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <h3 className="font-bold text-[18px] text-[#0f172a] mb-4">Compliance & Diet</h3>
      <div className="space-y-4">
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Certifications</h4>
          <div className="flex flex-wrap gap-2">
            {certifications.length > 0 ? (
              certifications.map((c: string) => (
                <span
                  key={c}
                  className="px-3 py-1 rounded-lg bg-[rgba(0,67,143,0.1)] border border-[rgba(0,67,143,0.2)] text-primary text-xs font-bold"
                >
                  {c}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#cbd5e1]">—</span>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Dietary Tags</h4>
          <div className="flex flex-wrap gap-2">
            {dietaryTags.length > 0 ? (
              dietaryTags.map((t: string) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] text-[#0f172a] text-xs font-bold"
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-sm text-[#cbd5e1]">—</span>
            )}
          </div>
        </div>
        <div className="pt-4 border-t border-[#f1f5f9]">
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Allergens</h4>
          {allergens.length > 0 ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#334155] shrink-0" />
              <span className="font-semibold text-[16px] text-[#334155]">Contains: {allergens.join(", ")}</span>
            </div>
          ) : (
            <span className="text-sm text-[#cbd5e1]">—</span>
          )}
        </div>
      </div>
    </div>
  )
}
