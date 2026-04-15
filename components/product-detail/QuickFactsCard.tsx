"use client"

import { Info } from "lucide-react"

const fmtCurrency = (v?: string | number, currency = "USD") => {
  if (v === undefined || v === null || v === "") return "—"
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n) }
  catch { return String(n) }
}

export default function QuickFactsCard({ product }: { product: any }) {
  const items = [
    { label: "Serving Size", value: product?.servingSize ?? "—" },
    { label: "Package Weight", value: product?.packageWeight ?? "—" },
    { label: "Current Price", value: fmtCurrency(product?.price, product?.currency || "USD") || "—", highlight: true },
    { label: "GTIN Type", value: product?.gtinType ?? "—" },
  ]
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-[#0f172a]" />
        <h3 className="font-bold text-[18px] text-[#0f172a]">Quick Facts</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map(({ label, value, highlight }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{label}</span>
            <span className={`text-base font-semibold ${highlight ? "text-primary" : "text-[#0f172a]"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
