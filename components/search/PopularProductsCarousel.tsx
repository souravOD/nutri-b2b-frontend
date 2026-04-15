"use client"

import { useEffect, useState, useRef } from "react"
import { ChevronLeft, ChevronRight, Package, Star } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { getPopularProducts, type PopularProduct } from "@/lib/api-search"
import Link from "next/link"

const VISIBLE = 3

function formatPrice(price?: number | null, currency?: string | null) {
  if (price == null) return null
  const sym = currency === "USD" || !currency ? "$" : currency + " "
  return `${sym}${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / unit`
}

export default function PopularProductsCarousel() {
  const [products, setProducts] = useState<PopularProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const maxOffset = Math.max(0, products.length - VISIBLE)

  useEffect(() => {
    getPopularProducts(10)
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-bold text-[#0f172a]">Most Popular Products</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(o => Math.max(0, o - 1))}
            disabled={offset === 0}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#64748b] hover:border-primary/40 disabled:opacity-30 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOffset(o => Math.min(maxOffset, o + 1))}
            disabled={offset >= maxOffset}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-[#64748b] hover:border-primary/40 disabled:opacity-30 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[8px] border border-[#e2e8f0] overflow-hidden">
              <Skeleton className="h-[192px] w-full rounded-none" />
              <div className="p-5 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-24 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? null : (
        <div className="grid grid-cols-3 gap-6 overflow-hidden">
          {products.slice(offset, offset + VISIBLE).map((product, idx) => {
            const isNew = idx === 2 // last card gets "New Arrival" if no match score
            const price = formatPrice(product.price, product.currency)

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="flex flex-col rounded-[8px] border border-[#e2e8f0] bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="relative h-[192px] bg-[#f8fafc] flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-16 w-16 text-[#cbd5e1]" strokeWidth={1} />
                  )}
                  {/* Badge */}
                  <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                    isNew
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {isNew ? "New Arrival" : "Popular"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex flex-col p-5 gap-1">
                  {product.category && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                      {product.category}
                    </p>
                  )}
                  <p className="text-[16px] font-semibold text-[#0f172a] leading-snug line-clamp-2">
                    {product.name}
                  </p>
                  {product.brand && (
                    <p className="flex items-center gap-1 text-[13px] text-[#64748b]">
                      <Star className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                      {product.brand}
                    </p>
                  )}
                  {price && (
                    <p className="mt-1 text-[18px] font-bold text-[#0f172a]">{price}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
