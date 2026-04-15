"use client"

import { useEffect, useState } from "react"
import { Sparkles, Loader2, ExternalLink, SearchX, WifiOff } from "lucide-react"
import Link from "next/link"
import { getProductSubstitutions, type Substitute } from "@/lib/api-substitutions"

interface Props {
  productId: string
  customerId?: string
}

export default function SubstitutionsCard({ productId, customerId }: Props) {
  const [loading, setLoading] = useState(true)
  const [substitutes, setSubstitutes] = useState<Substitute[]>([])
  const [fallback, setFallback] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getProductSubstitutions(productId, { customerId })
      .then((d) => {
        if (!cancelled) {
          setSubstitutes(d.substitutes ?? [])
          setFallback(!!d.fallback)
        }
      })
      .catch((err) => { if (!cancelled) setError(err?.message ?? "Failed to load substitutions") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [productId, customerId])

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-0 pb-4 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#0f172a]" />
          <h3 className="font-bold text-[18px] text-[#0f172a]">Smart Substitutions</h3>
        </div>
        {fallback && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#92400e] bg-[#fef3c7] border border-[#fde68a] rounded-full px-2.5 py-1">
            <WifiOff className="h-3 w-3" /> AI Engine Offline
          </span>
        )}
      </div>

      <div className="pt-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding substitutes…
          </div>
        )}

        {error && (
          <p className="text-sm text-[#94a3b8] italic">Substitution engine unavailable.</p>
        )}

        {!loading && !error && (
          <>
            {substitutes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <SearchX className="h-10 w-10 text-[#cbd5e1] mb-3" />
                <p className="text-sm text-[#64748b]">
                  {fallback ? "AI engine offline — results may be limited." : "No substitutes found for this product."}
                </p>
                {fallback && (
                  <p className="text-sm text-[#94a3b8] mt-1">No substitutes found for this product.</p>
                )}
              </div>
            ) : (
              <>
                <ul className="divide-y divide-[#f1f5f9]">
                  {substitutes.map((s) => (
                    <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${s.id}`}
                            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                          >
                            {s.name}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </Link>
                          {s.reason && (
                            <p className="text-xs text-[#64748b] mt-0.5">{s.reason}</p>
                          )}
                        </div>
                        {s.score !== undefined && (
                          <span className="text-sm font-bold text-primary shrink-0">
                            {Math.round(s.score * 100)}%
                          </span>
                        )}
                      </div>
                      {s.score !== undefined && (
                        <div className="h-1 bg-[#e2e8f0] rounded-full">
                          <div
                            className="h-1 bg-primary rounded-full transition-all"
                            style={{ width: `${Math.round(s.score * 100)}%` }}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="pt-4 text-center border-t border-[#f1f5f9] mt-2">
                  <Link
                    href={`/products?substitute_for=${productId}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    View all alternatives
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
