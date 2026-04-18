"use client"

import { useState } from "react"
import { ShieldCheck, AlertTriangle, CheckCircle2, Loader2, Zap, RefreshCw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { runSafetyCheck } from "@/lib/api-safety"

interface Conflict {
  customer_id?: string
  customer_name?: string
  allergen?: string
  condition?: string
  reason?: string
}

interface SafetyResult {
  conflicts: Conflict[]
  summary?: string
  fallback?: boolean
  checkedAt?: string
}

interface Props {
  productId: string
  allergens?: string[]
}

export default function SafetyCheckCard({ productId, allergens = [] }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SafetyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRun() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await runSafetyCheck({ product_ids: [productId] })
      const rawConflicts: any[] = Array.isArray((data as any).conflicts) ? (data as any).conflicts : []
      setResult({
        conflicts: rawConflicts.map((c: any) => ({
          customer_id: c.customer_id,
          customer_name: c.customer_name,
          allergen: c.conflict_allergen ?? c.allergen,
          condition: c.customer_severity,
          reason: c.conflict_allergen
            ? `Allergen conflict: ${c.conflict_allergen}${c.customer_severity ? ` (${c.customer_severity})` : ""}`
            : (c.reason ?? undefined),
        })),
        summary: (data as any).summary_str ?? (typeof (data as any).summary === "string" ? (data as any).summary : undefined),
        fallback: (data as any).fallback,
        checkedAt: new Date().toISOString(),
      })
    } catch (err: any) {
      setError(err?.message ?? "Safety check failed")
    } finally {
      setLoading(false)
    }
  }

  const conflicts: Conflict[] = result?.conflicts ?? []

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] flex flex-col min-h-[400px]">
      {!result && !error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
          <div className="h-16 w-16 rounded-[16px] bg-[#f1f5f9] flex items-center justify-center mb-4">
            <ShieldCheck className="h-7 w-7 text-[#64748b]" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0f172a] mb-2">Safety Check</h3>
          <p className="text-sm text-[#64748b] leading-relaxed max-w-[240px] mb-6">
            Validate ingredients and allergens against regional health guidelines and safety protocols.
          </p>
          <Button
            onClick={handleRun}
            disabled={loading}
            className="w-full bg-primary hover:bg-[#003070] text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Run Safety Check
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#0f172a]" />
              <h3 className="font-bold text-[18px] text-[#0f172a]">Safety Check</h3>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                conflicts.length === 0
                  ? <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-1">SAFE</span>
                  : <span className="text-xs font-bold uppercase tracking-wide text-red-700 bg-red-100 rounded-full px-2.5 py-1">{conflicts.length} CONFLICT{conflicts.length !== 1 ? "S" : ""}</span>
              )}
              <button
                onClick={handleRun}
                disabled={loading}
                className="text-[#94a3b8] hover:text-[#64748b] disabled:opacity-50"
              >
                {loading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <RefreshCw className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="flex-1 flex flex-col">
              {result.fallback && (
                <p className="text-xs text-[#94a3b8] italic mb-3">
                  Safety engine unavailable — results may be incomplete.
                </p>
              )}

              {result.summary && (
                <p className="text-sm text-[#334155] mb-3">{result.summary}</p>
              )}

              {allergens.length > 0 ? (
                <ul className="divide-y divide-[#f1f5f9]">
                  {allergens.map((allergen) => {
                    const isConflicted = conflicts.some(
                      (c) => c.allergen?.toLowerCase() === allergen.toLowerCase()
                    )
                    return (
                      <li key={allergen} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2">
                          {isConflicted
                            ? <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                            : <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          }
                          <span className="text-sm text-[#334155]">{allergen}</span>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wide ${isConflicted ? "text-red-600" : "text-emerald-600"}`}>
                          {isConflicted ? "FLAGGED" : "CLEARED"}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                conflicts.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    No conflicts detected across your customer base.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {conflicts.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          {c.customer_name && (
                            <span className="font-semibold text-[#0f172a]">{c.customer_name}: </span>
                          )}
                          <span className="text-[#334155]">
                            {c.reason ?? c.allergen ?? c.condition ?? "Conflict detected"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}

              <div className="flex items-center gap-1.5 mt-auto pt-4 border-t border-[#f1f5f9]">
                <Clock className="h-3.5 w-3.5 text-[#94a3b8]" />
                <span className="text-xs text-[#94a3b8]">Last updated just now via AI-Scanner</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
