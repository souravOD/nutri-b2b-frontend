"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronRight, ArrowLeft, Activity, Package, AlertTriangle, Eye, X, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/backend"
import { getMatches } from "@/lib/api-matching"
import type { UICustomer } from "@/types/customer"

const MATCHING_ENABLED = process.env.NEXT_PUBLIC_B2B_ENABLE_MATCHING === "1"

type Product = {
  id: string
  name: string
  sku: string
  category: string
  brand: string
  imageUrl: string
  matchScore: number
  diets: string[]
  certifications: string[]
  allergens: string[]
  barcode: string
  servingSize: string
  packageSize: string
  description?: string
  nutrition?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    sugar?: number
    sodium?: number
  }
  ingredients: string
}

function cmToFeetInches(cm: number | null | undefined): string {
  if (cm == null || !Number.isFinite(Number(cm))) return "—"
  const inches = Number(cm) / 2.54
  const ft = Math.floor(inches / 12)
  const inRem = Math.round(inches % 12)
  return `${ft}'${inRem}"`
}

function kgToLbs(kg: number | null | undefined): string {
  if (kg == null || !Number.isFinite(Number(kg))) return "—"
  const lbs = Math.round(Number(kg) * 2.205)
  return `${lbs} lbs`
}

function formatMacroRatio(macro: {
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  calories?: number
}): string {
  const p = macro?.protein_g ?? 0
  const c = macro?.carbs_g ?? 0
  const f = macro?.fat_g ?? 0
  if (p === 0 && c === 0 && f === 0) return "—"
  const pCals = p * 4
  const cCals = c * 4
  const fCals = f * 9
  const total = pCals + cCals + fCals
  if (total <= 0) return "—"
  const pPct = Math.round((pCals / total) * 100)
  const cPct = Math.round((cCals / total) * 100)
  const fPct = Math.round((fCals / total) * 100)
  return `${pPct}P / ${cPct}C / ${fPct}F`
}

type Props = {
  customer: UICustomer
  onDeleted?: (id: string) => void
  onSaved?: (c: UICustomer) => void
}

export default function CustomerProductMatchingView({ customer, onDeleted, onSaved }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const hp = customer.healthProfile
  const restrictions = customer.restrictions ?? { required: [], preferred: [], allergens: [], conditions: [] }
  const allergens = restrictions.allergens ?? hp?.avoidAllergens ?? []
  const conditions = restrictions.conditions ?? hp?.conditions ?? []
  const dietGoals = hp?.dietGoals ?? restrictions.preferred ?? []
  const healthGoal = hp?.healthGoal
  const macro = hp?.macroTargets ?? {}

  const [products, setProducts] = React.useState<Product[]>([])
  const [allProducts, setAllProducts] = React.useState<Product[]>([])
  const [filter, setFilter] = React.useState("all")
  const [matching, setMatching] = React.useState(false)
  const [limit, setLimit] = React.useState<number>(25)
  const [excluded, setExcluded] = React.useState<Set<string>>(new Set())

  const runMatch = React.useCallback(async () => {
    if (!MATCHING_ENABLED) {
      toast({
        title: "Matching disconnected",
        description: "Matching will be enabled in a later integration phase.",
      })
      return
    }
    if (!customer?.id) return
    setMatching(true)
    try {
      const items = await getMatches(String(customer.id), limit)
      const mapped: Product[] = items.map((p: any) => {
        const raw01 =
          typeof p._score === "number"
            ? p._score
            : typeof p.score === "number"
              ? p.score
              : typeof p.score_pct === "number"
                ? p.score_pct / 100
                : undefined
        const scorePct = raw01 != null ? Math.round(raw01 * 100) : 0
        return {
          id: String(p.id ?? p.productId ?? p.product_id),
          name: p.name ?? "",
          sku: p.externalId ?? p.barcode ?? p.sku ?? "",
          category: p.category ?? p.categoryName ?? "",
          brand: p.brand ?? "",
          imageUrl: p.imageUrl ?? "/placeholder.svg?height=192&width=300",
          matchScore: scorePct,
          diets: p.dietaryTags ?? p.diets ?? [],
          certifications: p.certifications ?? [],
          allergens: p.allergens ?? [],
          barcode: p.barcode ?? "",
          servingSize: p.servingSize ?? p.serving_size ?? "",
          packageSize: p.packageSize ?? p.package_weight ?? "",
          description: p.description,
          nutrition: p.nutrition
            ? {
                calories: p.nutrition.calories ?? p.nutrition.cal,
                protein: p.nutrition.protein_g ?? p.nutrition.protein,
                carbs: p.nutrition.carbs_g ?? p.nutrition.carbs,
                fat: p.nutrition.fat_g ?? p.nutrition.fat,
                sugar: p.nutrition.sugar_g ?? p.nutrition.sugar,
                sodium: p.nutrition.sodium_mg ?? p.nutrition.sodium,
              }
            : undefined,
          ingredients: Array.isArray(p.ingredients) ? p.ingredients.join(", ") : p.ingredients ?? "",
        }
      })
      const sorted = mapped.sort((a, b) => b.matchScore - a.matchScore)
      setAllProducts(sorted)
      const sliced = Number.isFinite(limit) ? sorted.slice(0, limit) : sorted
      setProducts(sliced)
      toast({ title: "Match completed", description: `${sliced.length} products matched.` })
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Match failed",
        description: String(e?.message ?? e),
      })
    } finally {
      setMatching(false)
    }
  }, [customer?.id, toast, limit])

  React.useEffect(() => {
    if (MATCHING_ENABLED && customer?.id) runMatch()
  }, [customer?.id, runMatch])

  React.useEffect(() => {
    setProducts(allProducts.slice(0, limit))
  }, [limit, allProducts])

  const filteredProducts = products.filter((p) => {
    if (excluded.has(p.id)) return false
    switch (filter) {
      case ">=80%":
        return p.matchScore >= 80
      case ">=60%":
        return p.matchScore >= 60
      case ">=40%":
        return p.matchScore >= 40
      default:
        return true
    }
  })

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"

  const openProductDetails = (product: Product) => {
    router.push(`/products/${product.id}?customerId=${customer.id}&from=/customers/${customer.id}/matches`)
  }

  return (
    <div className="bg-[#f8fafc] min-h-full">
      {/* Header: Back + Breadcrumbs + Actions */}
      <div className="border-b border-[#e2e8f0] bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
              asChild
            >
              <Link href="/customers" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Customers
              </Link>
            </Button>
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="text-[#64748b] hover:text-[#0f172a]">
                Portal
              </Link>
              <ChevronRight className="h-4 w-4 text-[#64748b]" />
              <Link href="/customers" className="text-[#64748b] hover:text-[#0f172a]">
                Customers
              </Link>
              <ChevronRight className="h-4 w-4 text-[#64748b]" />
              <Link href={`/customers/${customer.id}`} className="text-[#64748b] hover:text-[#0f172a]">
                {customer.name}
              </Link>
              <ChevronRight className="h-4 w-4 text-[#64748b]" />
              <span className="font-medium text-[#0f172a]">Product Matching</span>
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
              asChild
            >
              <Link href={`/customers/${customer.id}/edit`}>Edit Profile</Link>
            </Button>
            <Button
              className="bg-primary hover:bg-[#003366] text-white"
              asChild
            >
              <Link href={`/customers/${customer.id}`}>View Profile</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Summary Card */}
      <div className="px-6 -mt-6">
        <Card className="border-[#e2e8f0] shadow-sm overflow-hidden rounded-xl">
          <div className="flex items-center gap-6 p-6">
            <div className="relative shrink-0">
              <Avatar className="h-24 w-24 rounded-full border-4 border-white">
                <AvatarImage src={customer.avatar} alt={customer.name} />
                <AvatarFallback className="bg-[#f1f5f9] text-primary text-2xl font-bold">
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white ${
                  customer.status === "active" ? "bg-[#22c55e]" : "bg-slate-400"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[#0f172a]">{customer.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-1">
                <span className="text-sm text-[#64748b]">{customer.email}</span>
                {customer.phone && (
                  <span className="text-sm text-[#64748b]">{customer.phone}</span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    customer.status === "active"
                      ? "bg-[#f0fdf4] text-[#16a34a]"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {customer.status === "active" ? "Active Member" : "Archived"}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Two-column: Customer Info + Product Matches */}
      <div className="p-6 max-w-[1280px] mx-auto">
        <div className="flex gap-8">
          {/* Left: Customer Info Panel (~300px) */}
          <div className="w-[300px] shrink-0">
            <Card className="border-[#e2e8f0] shadow-sm overflow-hidden rounded-xl">
              <div className="bg-[rgba(248,250,252,0.5)] border-b border-[#e2e8f0] px-6 py-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-[18px] w-[18px] text-primary" />
                  <h2 className="text-base font-bold text-[#0f172a]">Customer Info</h2>
                </div>
              </div>
              <div className="divide-y divide-[#f1f5f9]">
                {[
                  { label: "Age", value: hp?.age ?? "—" },
                  { label: "Gender", value: hp?.gender ?? "—" },
                  { label: "Height", value: hp?.heightCm != null ? cmToFeetInches(hp.heightCm) : "—" },
                  { label: "Weight", value: hp?.weightKg != null ? kgToLbs(hp.weightKg) : "—" },
                  { label: "BMI", value: hp?.bmi ?? "—" },
                  { label: "BMR", value: hp?.bmr != null ? `${hp.bmr} kcal` : "—" },
                  { label: "Macro Targets", value: formatMacroRatio(macro) },
                  { label: "Diet Goals", value: healthGoal ?? (dietGoals.length > 0 ? dietGoals.join(", ") : "—") },
                  { label: "Conditions", value: conditions.length > 0 ? conditions.join(", ") : "None Reported" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 px-6 py-3"
                  >
                    <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider shrink-0">{label}</span>
                    <span className="text-[20px] font-semibold text-primary text-right min-w-0 truncate">{String(value)}</span>
                  </div>
                ))}
                <div className="px-6 py-4">
                  <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">AVOID ALLERGENS</p>
                  <div className="flex flex-wrap gap-2">
                    {allergens.length > 0 ? (
                      allergens.map((a) => (
                        <span
                          key={a}
                          className="px-2 py-1 rounded text-xs font-bold text-[#dc2626] bg-[#fef2f2] border border-[#fee2e2]"
                        >
                          {a}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#94a3b8]">None</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Product Matches */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Product Matches header + Refresh */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-[#0f172a]">Product Matches</h2>
              </div>
              <Button
                variant="ghost"
                className="text-primary hover:text-[#003366] hover:bg-primary/5 shrink-0"
                onClick={runMatch}
                disabled={!MATCHING_ENABLED || matching}
              >
                {matching ? "Running..." : "Refresh Matches"}
              </Button>
            </div>

            {/* Filters + Show - cohesive horizontal control bar */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-[#f1f5f9] p-1 rounded-xl flex gap-0">
                  {(["all", ">=80%", ">=60%", ">=40%"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filter === f
                          ? "bg-white text-[#0f172a] shadow-sm"
                          : "text-[#64748b] hover:text-[#0f172a]"
                      }`}
                    >
                      {f === "all" ? "All" : f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[#64748b]">Show</span>
                <Select
                  value={String(limit)}
                  onValueChange={(v) => setLimit(Number(v))}
                >
                  <SelectTrigger className="h-9 w-[110px] border-[#e2e8f0]">
                    <SelectValue placeholder="Top N" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">Top 25</SelectItem>
                    <SelectItem value="50">Top 50</SelectItem>
                    <SelectItem value="100">Top 100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Grid */}
            {!MATCHING_ENABLED ? (
              <Card className="p-12 text-center">
                <p className="text-[#64748b]">Product matching is not enabled. Set NEXT_PUBLIC_B2B_ENABLE_MATCHING=1 to enable.</p>
              </Card>
            ) : filteredProducts.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-[#94a3b8] mb-4" />
                <p className="text-[#64748b]">
                  {matching ? "Loading matches..." : "No products match this customer profile."}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden border-[#e2e8f0] shadow-sm rounded-xl"
                  >
                    <div className="bg-[#f8fafc] h-48 relative overflow-hidden rounded-t-lg">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={300}
                        height={192}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border border-[rgba(0,67,143,0.1)] px-2 py-1 rounded-lg">
                        <span className="text-xs font-bold text-primary">
                          {product.matchScore}% Match
                        </span>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <h3 className="font-bold text-[#0f172a] text-base">{product.name}</h3>
                        <p className="text-xs text-[#64748b] mt-1 line-clamp-2">
                          {product.category && product.brand
                            ? `${product.brand} • ${product.category}`
                            : product.category || product.brand || "—"}
                        </p>
                      </div>
                      {product.diets.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {product.diets.slice(0, 4).map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded bg-[rgba(0,67,143,0.05)] text-primary text-[10px] font-bold uppercase tracking-wider"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-[#64748b]">
                          <FileText className="h-3 w-3 flex-shrink-0" />
                          <span>Vendor notes available in details</span>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-[#003366] text-white"
                            onClick={() => openProductDetails(product)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#e2e8f0] text-[#475569]"
                            onClick={() => setExcluded((prev) => new Set(prev).add(product.id))}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
