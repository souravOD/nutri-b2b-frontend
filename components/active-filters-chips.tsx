"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export type ProductFilters = {
  status: string
  categories: string[]
  brands: string[]
  tags: string[]
  diets: string[]
  allergens: string[]
  certifications: string[]
  hasImage: boolean | null
  missingImage: boolean
  missingNutrition: boolean
  missingAllergens: boolean
  missingBarcode: boolean
  proteinMin: string
  sugarMax: string
  sodiumMax: string
  caloriesMax: string
  country: string
}

interface ActiveFiltersChipsProps {
  filters: ProductFilters
  onRemove: (key: keyof ProductFilters, value?: string) => void
  onClear: () => void
}

export default function ActiveFiltersChips({ filters, onRemove, onClear }: ActiveFiltersChipsProps) {
  const chips: Array<{ key: keyof ProductFilters; label: string; value?: string }> = []

  if (filters.status !== "all") {
    chips.push({ key: "status", label: `Status: ${filters.status}` })
  }

  filters.categories.forEach((cat) => {
    chips.push({ key: "categories", label: `Category: ${cat}`, value: cat })
  })

  filters.brands.forEach((brand) => {
    chips.push({ key: "brands", label: `Brand: ${brand}`, value: brand })
  })

  filters.diets.forEach((diet) => {
    chips.push({ key: "diets", label: `Diet: ${diet}`, value: diet })
  })

  if (filters.missingImage) {
    chips.push({ key: "missingImage", label: "Missing Image" })
  }

  if (filters.proteinMin) {
    chips.push({ key: "proteinMin", label: `Protein ≥ ${filters.proteinMin}g` })
  }

  if (filters.sugarMax) {
    chips.push({ key: "sugarMax", label: `Sugar ≤ ${filters.sugarMax}g` })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {chips.map((chip, index) => (
        <Badge key={index} variant="secondary" className="flex items-center gap-1">
          {chip.label}
          <button
            onClick={() => onRemove(chip.key, chip.value)}
            className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {chips.length > 1 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-6 px-2 text-xs">
          Clear all
        </Button>
      )}
    </div>
  )
}
