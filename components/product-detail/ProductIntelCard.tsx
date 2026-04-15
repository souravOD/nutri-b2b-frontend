"use client"

import { useEffect, useState } from "react"
import { Sparkles, TrendingUp, Loader2, Globe, SmilePlus, MessageSquareQuote } from "lucide-react"
import { getProductIntelligence, type ProductIntelResponse } from "@/lib/api-product-intel"

export default function ProductIntelCard({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ProductIntelResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getProductIntelligence(productId)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((err) => { if (!cancelled) setError(err?.message ?? "Failed to load intelligence") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [productId])

  const hasData =
    data &&
    (data.summary ||
      data.market_position ||
      data.demand_signals?.length ||
      data.insights?.length ||
      data.similar_products?.length ||
      data.market_demand_index != null ||
      data.regional_popularity ||
      data.sentiment)

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] flex flex-col min-h-[400px]">
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <div className="h-16 w-16 rounded-[16px] bg-[#f1f5f9] flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-[#64748b]" />
          </div>
          <Loader2 className="h-4 w-4 animate-spin text-[#94a3b8] mt-2" />
        </div>
      )}

      {!loading && (error || !hasData) && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
          <div className="h-16 w-16 rounded-[16px] bg-[#f1f5f9] flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-[#64748b]" />
          </div>
          <h3 className="text-[18px] font-bold text-[#0f172a] mb-2">Product Intelligence</h3>
          <p className="text-sm text-[#64748b] leading-relaxed max-w-[320px]">
            No intelligence data available for this product yet. Run a safety check or update specifications to generate AI insights.
          </p>
        </div>
      )}

      {!loading && hasData && (
        <div className="space-y-4">
          {/* Header: title + subtitle + market demand index */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-[#0f172a]" />
                <h3 className="font-bold text-[18px] text-[#0f172a]">Product Intelligence</h3>
              </div>
              <p className="text-xs text-[#94a3b8]">AI-driven market performance and sentiment overview</p>
            </div>
            {data!.market_demand_index != null && (
              <div className="text-right shrink-0 ml-4">
                <div className="leading-none">
                  <span className="text-[40px] font-bold text-[#0f172a]">{data!.market_demand_index}</span>
                  <span className="text-lg text-[#94a3b8]">/10</span>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#94a3b8] mt-0.5">Market Demand Index</p>
              </div>
            )}
          </div>

          {data!.fallback && (
            <p className="text-xs text-[#94a3b8] italic">AI engine offline — showing cached data.</p>
          )}

          {/* Regional Popularity + Sentiment Analysis mini-cards */}
          {(data!.regional_popularity || data!.sentiment) && (
            <div className="grid grid-cols-2 gap-3">
              {data!.regional_popularity && (
                <div className="bg-[#f8fafc] rounded-[12px] p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe className="h-3.5 w-3.5 text-[#94a3b8]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Regional Popularity</span>
                  </div>
                  <p className="text-sm font-bold text-[#0f172a] mb-1.5">{data!.regional_popularity.label}</p>
                  <div className="h-1.5 bg-[#e2e8f0] rounded-full mb-2">
                    <div
                      className="h-1.5 bg-primary rounded-full"
                      style={{ width: `${Math.min(100, data!.regional_popularity.value)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#64748b]">{data!.regional_popularity.description}</p>
                </div>
              )}
              {data!.sentiment && (
                <div className="bg-[#f8fafc] rounded-[12px] p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <SmilePlus className="h-3.5 w-3.5 text-[#94a3b8]" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Sentiment Analysis</span>
                  </div>
                  <p className="text-sm font-bold text-[#0f172a] mb-1.5">{data!.sentiment.label}</p>
                  <div className="h-1.5 bg-[#e2e8f0] rounded-full mb-2">
                    <div
                      className="h-1.5 bg-primary rounded-full"
                      style={{ width: `${Math.min(100, data!.sentiment.value)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#64748b]">{data!.sentiment.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Intelligence Summary box */}
          {data!.summary && (
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[12px] p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquareQuote className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Intelligence Summary</span>
              </div>
              <p className="text-sm text-[#334155] leading-relaxed">"{data!.summary}"</p>
            </div>
          )}

          {/* Fallback sections when new fields are absent */}
          {data!.market_position && !data!.regional_popularity && !data!.sentiment && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Market Position</span>
              <p className="text-sm text-[#334155] mt-1">{data!.market_position}</p>
            </div>
          )}

          {Array.isArray(data!.demand_signals) && data!.demand_signals.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Demand Signals</span>
              </div>
              <ul className="space-y-1">
                {data!.demand_signals.map((s, i) => (
                  <li key={i} className="text-sm text-[#334155] flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(data!.insights) && data!.insights.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Insights</span>
              <ul className="space-y-1 mt-1.5">
                {data!.insights.map((insight, i) => (
                  <li key={i} className="text-sm text-[#334155] flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(data!.similar_products) && data!.similar_products.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">Similar Products</span>
              <ul className="space-y-1 mt-1.5">
                {data!.similar_products.map((p) => (
                  <li key={p.id}>
                    <a href={`/products/${p.id}`} className="text-sm text-primary hover:underline">
                      {p.name}
                      {p.similarity !== undefined && (
                        <span className="text-[#94a3b8] ml-1">({Math.round(p.similarity * 100)}% match)</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
