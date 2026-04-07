"use client"

import { useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
// TODO: Uncomment when db:push is run to create user_searches table
// import { getRecentSearches, saveRecentSearch } from "@/lib/api-search"
import TrendingCategoriesSection from "./TrendingCategoriesSection"
import PopularProductsCarousel from "./PopularProductsCarousel"
import SuggestedVendorsSection from "./SuggestedVendorsSection"

type Props = {
  onSearch: (query: string) => void
}

export default function SearchLandingView({ onSearch }: Props) {
  const [inputValue, setInputValue] = useState("")
  // TODO: Uncomment when db:push is run to create user_searches table
  // const [recentSearches, setRecentSearches] = useState<string[]>([])
  // useEffect(() => { getRecentSearches().then(setRecentSearches) }, [])
  const inputRef = useRef<HTMLInputElement>(null)

  // '/' keyboard shortcut to focus
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  function handleSubmit(query: string) {
    const q = query.trim()
    if (!q) return
    // TODO: Uncomment when db:push is run to create user_searches table
    // saveRecentSearch(q) // fire-and-forget
    onSearch(q)
  }

  return (
    <div className="space-y-10 w-full">
      {/* Hero search bar */}
      <div className="space-y-4">
        <h1 className="text-[32px] font-bold text-[#0f172a]">Search</h1>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8] pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit(inputValue)
            }}
            placeholder="Search products, customers, jobs... (Press '/' to focus)"
            className="h-14 pl-12 pr-4 text-[16px] border-[#e2e8f0] bg-white rounded-[8px] shadow-sm focus-visible:ring-[#00438f]/30"
          />
        </div>

        {/* TODO: Uncomment when db:push is run to create user_searches table */}
        {/* {recentSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-[#64748b]">Recent searches:</span>
            {recentSearches.map((q) => (
              <button
                key={q}
                onClick={() => handleSubmit(q)}
                className="flex items-center gap-1.5 rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-[13px] text-[#475569] hover:border-[#00438f]/40 hover:text-[#00438f] transition-colors"
              >
                <Clock className="h-[10.5px] w-[10.5px] shrink-0 text-[#94a3b8]" />
                {q}
              </button>
            ))}
          </div>
        )} */}
      </div>

      {/* Trending Categories */}
      <TrendingCategoriesSection />

      {/* Most Popular Products */}
      <PopularProductsCarousel />

      {/* Suggested Vendors */}
      <SuggestedVendorsSection />
    </div>
  )
}
