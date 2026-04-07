"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { getTrendingCategories, type TrendingCategory } from "@/lib/api-search"
import {
  Droplets,
  Cookie,
  Package,
  Coffee,
  Wheat,
  Beef,
  Apple,
  Fish,
  ShoppingBasket,
} from "lucide-react"

// Map category labels to lucide icons (best-effort by keyword)
function getCategoryIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes("dairy") || l.includes("egg") || l.includes("milk")) return Droplets
  if (l.includes("snack") || l.includes("sweet") || l.includes("confect") || l.includes("candy")) return Cookie
  if (l.includes("beverage") || l.includes("drink") || l.includes("coffee") || l.includes("tea")) return Coffee
  if (l.includes("grain") || l.includes("bread") || l.includes("bakery") || l.includes("cereal")) return Wheat
  if (l.includes("meat") || l.includes("beef") || l.includes("poultry") || l.includes("pork")) return Beef
  if (l.includes("fruit") || l.includes("produce") || l.includes("vegetable")) return Apple
  if (l.includes("seafood") || l.includes("fish")) return Fish
  return Package
}

export default function TrendingCategoriesSection() {
  const [categories, setCategories] = useState<TrendingCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTrendingCategories()
      .then(setCategories)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-bold text-[#0f172a]">Trending Categories</h2>
        <Link
          href="/products"
          className="text-[14px] font-medium text-[#00438f] hover:underline"
        >
          View all categories
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[162px] rounded-[8px]" />
          ))}
        </div>
      ) : categories.length === 0 ? null : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.slice(0, 4).map((cat) => {
            const Icon = getCategoryIcon(cat.label)
            const count = Number(cat.product_count)
            const countLabel = count >= 1000
              ? `${(count / 1000).toFixed(1)}k Products listed`
              : count > 0
              ? `${count} Products listed`
              : "No products yet"

            return (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.code ?? cat.id)}`}
                className="flex flex-col border border-[#e2e8f0] rounded-[8px] p-6 bg-white hover:border-[#00438f]/40 hover:shadow-sm transition-all"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#e8f0fb]">
                  <Icon className="h-5 w-5 text-[#00438f]" strokeWidth={1.5} />
                </div>
                <p className="text-[16px] font-semibold text-[#0f172a] mb-1">{cat.label}</p>
                <p className="text-[14px] text-[#64748b]">{countLabel}</p>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
