"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Filter } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

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

interface ProductFiltersProps {
  filters: ProductFilters
  onChange: (filters: ProductFilters) => void
  onClear: () => void
  data: any[]
}

export const defaultFilters: ProductFilters = {
  status: "all",
  categories: [],
  brands: [],
  tags: [],
  diets: [],
  allergens: [],
  certifications: [],
  hasImage: null,
  missingImage: false,
  missingNutrition: false,
  missingAllergens: false,
  missingBarcode: false,
  proteinMin: "",
  sugarMax: "",
  sodiumMax: "",
  caloriesMax: "",
  country: "all",
}

export default function ProductFilters({ filters, onChange, onClear, data }: ProductFiltersProps) {
  const isMobile = useIsMobile()

  // Extract unique values from data
  const categories = React.useMemo(() => [...new Set(data.map((p) => p.category).filter(Boolean))], [data])
  const brands = React.useMemo(() => [...new Set(data.map((p) => p.brand).filter(Boolean))], [data])
  const tags = React.useMemo(() => [...new Set(data.flatMap((p) => p.tags || []))], [data])
  const diets = React.useMemo(() => [...new Set(data.flatMap((p) => p.diets || []))], [data])
  const allergens = React.useMemo(() => [...new Set(data.flatMap((p) => p.allergens || []))], [data])
  const certifications = React.useMemo(() => [...new Set(data.flatMap((p) => p.certifications || []))], [data])
  const countries = React.useMemo(() => [...new Set(data.map((p) => p.country).filter(Boolean))], [data])

  const updateFilter = (key: keyof ProductFilters, value: any) => {
    onChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = (key: keyof ProductFilters, value: string) => {
    const current = filters[key] as string[]
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    updateFilter(key, updated)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.status !== "all") count++
    if (filters.categories.length) count++
    if (filters.brands.length) count++
    if (filters.tags.length) count++
    if (filters.diets.length) count++
    if (filters.allergens.length) count++
    if (filters.certifications.length) count++
    if (filters.hasImage !== null) count++
    if (filters.missingImage) count++
    if (filters.missingNutrition) count++
    if (filters.missingAllergens) count++
    if (filters.missingBarcode) count++
    if (filters.proteinMin) count++
    if (filters.sugarMax) count++
    if (filters.sodiumMax) count++
    if (filters.caloriesMax) count++
    if (filters.country !== "all") count++
    return count
  }

  const FiltersContent = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium">Status</Label>
        <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium">Categories</Label>
        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={filters.categories.includes(category)}
                onCheckedChange={() => toggleArrayFilter("categories", category)}
              />
              <Label htmlFor={`category-${category}`} className="text-sm">
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Brands</Label>
        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
          {brands.slice(0, 10).map((brand) => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox
                id={`brand-${brand}`}
                checked={filters.brands.includes(brand)}
                onCheckedChange={() => toggleArrayFilter("brands", brand)}
              />
              <Label htmlFor={`brand-${brand}`} className="text-sm">
                {brand}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Diets</Label>
        <div className="mt-2 space-y-2">
          {diets.map((diet) => (
            <div key={diet} className="flex items-center space-x-2">
              <Checkbox
                id={`diet-${diet}`}
                checked={filters.diets.includes(diet)}
                onCheckedChange={() => toggleArrayFilter("diets", diet)}
              />
              <Label htmlFor={`diet-${diet}`} className="text-sm">
                {diet}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium">Missing Data</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="missing-image"
              checked={filters.missingImage}
              onCheckedChange={(checked) => updateFilter("missingImage", checked)}
            />
            <Label htmlFor="missing-image" className="text-sm">
              Missing Image
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="missing-nutrition"
              checked={filters.missingNutrition}
              onCheckedChange={(checked) => updateFilter("missingNutrition", checked)}
            />
            <Label htmlFor="missing-nutrition" className="text-sm">
              Missing Nutrition
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="missing-barcode"
              checked={filters.missingBarcode}
              onCheckedChange={(checked) => updateFilter("missingBarcode", checked)}
            />
            <Label htmlFor="missing-barcode" className="text-sm">
              Missing Barcode
            </Label>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Nutrition Bounds</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="protein-min" className="text-xs text-muted-foreground">
              Protein ≥
            </Label>
            <Input
              id="protein-min"
              type="number"
              placeholder="0"
              value={filters.proteinMin}
              onChange={(e) => updateFilter("proteinMin", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sugar-max" className="text-xs text-muted-foreground">
              Sugar ≤
            </Label>
            <Input
              id="sugar-max"
              type="number"
              placeholder="100"
              value={filters.sugarMax}
              onChange={(e) => updateFilter("sugarMax", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="sodium-max" className="text-xs text-muted-foreground">
              Sodium ≤
            </Label>
            <Input
              id="sodium-max"
              type="number"
              placeholder="2000"
              value={filters.sodiumMax}
              onChange={(e) => updateFilter("sodiumMax", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="calories-max" className="text-xs text-muted-foreground">
              Calories ≤
            </Label>
            <Input
              id="calories-max"
              type="number"
              placeholder="500"
              value={filters.caloriesMax}
              onChange={(e) => updateFilter("caloriesMax", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClear} className="flex-1 bg-transparent">
          Clear All
        </Button>
      </div>
    </div>
  )

  const activeCount = getActiveFiltersCount()

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="relative bg-transparent">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {activeCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <FiltersContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative bg-transparent">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
        <FiltersContent />
      </PopoverContent>
    </Popover>
  )
}
