"use client"

import * as React from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import AppShell from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, History, Pencil, Users, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { apiFetch } from "@/lib/backend"
import ProductForm from "@/components/product-form"
import QuickFactsCard from "@/components/product-detail/QuickFactsCard"
import NutritionFactsCard from "@/components/product-detail/NutritionFactsCard"
import ComplianceCard from "@/components/product-detail/ComplianceCard"
import VendorNotesCard from "@/components/product-detail/VendorNotesCard"
import ProductInternalNotesCard from "@/components/product-detail/ProductInternalNotesCard"
import ProductImageCard from "@/components/product-detail/ProductImageCard"
import SafetyCheckCard from "@/components/product-detail/SafetyCheckCard"
import ProductIntelCard from "@/components/product-detail/ProductIntelCard"
import SubstitutionsCard from "@/components/product-detail/SubstitutionsCard"
import PriceSensitivityCard from "@/components/product-detail/PriceSensitivityCard"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter(Boolean).map(String)
  if (typeof tags === "string") return tags.split(/[,\u2022|]/).map((s) => s.trim()).filter(Boolean)
  return []
}

function toProduct(raw: any) {
  const id = raw?.id ?? raw?.fid ?? raw?.sku ?? ""
  const dietaryTags = normalizeTags(raw?.dietaryTags)
  const tags = [...normalizeTags(raw?.tags ?? raw?.tagList), ...dietaryTags].filter(Boolean)
  const allergens = Array.isArray(raw?.allergens) ? raw.allergens.map(String) : normalizeTags(raw?.allergens)
  const ingredients = Array.isArray(raw?.ingredients) ? raw.ingredients.map(String) : normalizeTags(raw?.ingredients)
  const n = raw?.nutrition ?? {}
  const nutrition = n && typeof n === "object" ? {
    calories: toNum(n.calories ?? n.cal),
    protein_g: toNum(n.protein_g ?? n.protein),
    carbs_g: toNum(n.carbs_g ?? n.carbs),
    fat_g: toNum(n.fat_g ?? n.fat),
    sugar_g: toNum(n.sugar_g ?? n.sugar),
    sodium_mg: toNum(n.sodium_mg ?? n.sodium),
    added_sugar_g: toNum(n.added_sugar_g),
    saturated_fat_g: toNum(n.saturated_fat_g ?? n.saturated_fat),
    potassium_mg: toNum(n.potassium_mg),
    phosphorus_mg: toNum(n.phosphorus_mg),
  } : undefined
  return {
    id: String(id),
    name: String(raw?.name ?? raw?.productName ?? ""),
    sku: String(raw?.externalId ?? raw?.external_id ?? raw?.sku ?? id ?? ""),
    status: raw?.status === "inactive" ? "inactive" : "active",
    category: String(raw?.category ?? raw?.categoryId ?? ""),
    brand: raw?.brand,
    barcode: raw?.barcode,
    gtinType: raw?.gtinType ?? raw?.gtin_type,
    price: raw?.price,
    currency: raw?.currency ?? "USD",
    servingSize: raw?.servingSize ?? raw?.serving_size,
    packageWeight: raw?.packageWeight ?? raw?.package_weight,
    description: raw?.description,
    sourceUrl: raw?.sourceUrl ?? raw?.source_url,
    imageUrl: raw?.imageUrl ?? raw?.image_url ?? raw?.image,
    nutrition,
    ingredients,
    allergens,
    certifications: raw?.certifications ?? [],
    regulatoryCodes: raw?.regulatoryCodes ?? [],
    dietaryTags: raw?.dietaryTags ?? [],
    tags,
    categoryId: raw?.categoryId ?? raw?.category_id,
    diets: raw?.diets,
  }
}

function toNum(x: any): number | undefined {
  const n = Number(x)
  return Number.isFinite(n) ? n : undefined
}

function productToFormValues(p: any) {
  if (!p) return undefined
  const n = p.nutrition ?? {}
  const join = (arr?: string[]) => (Array.isArray(arr) ? arr.filter(Boolean).join(", ") : "")
  const toStr = (v: any) => (v === null || v === undefined ? "" : String(v))
  return {
    name: toStr(p.name),
    sku: toStr(p.externalId ?? p.sku ?? ""),
    status: p.status === "inactive" ? "inactive" : "active",
    category: toStr(p.categoryId ?? p.category ?? ""),
    sub_category_id: toStr(p.subCategoryId ?? p.sub_category_id ?? ""),
    cuisine_id: toStr(p.cuisineId ?? p.cuisine_id ?? ""),
    market_id: toStr(p.marketId ?? p.market_id ?? ""),
    description: toStr(p.description ?? ""),
    brand: toStr(p.brand ?? ""),
    barcode: toStr(p.barcode ?? ""),
    gtin_type: toStr(p.gtinType ?? ""),
    price: toStr(p.price ?? ""),
    currency: toStr(p.currency ?? "USD"),
    serving_size: toStr(p.servingSize ?? ""),
    package_weight: toStr(p.packageWeight ?? ""),
    source_url: toStr(p.sourceUrl ?? ""),
    ingredients_csv: join(p.ingredients),
    allergens_csv: join(p.allergens),
    certifications_csv: join(p.certifications),
    regulatory_codes_csv: join(p.regulatoryCodes),
    tags: Array.isArray(p.dietaryTags) ? p.dietaryTags : Array.isArray(p.tags) ? p.tags : [],
    n_calories: toStr(n.calories ?? ""),
    n_protein_g: toStr(n.protein_g ?? ""),
    n_fat_g: toStr(n.fat_g ?? ""),
    n_carbs_g: toStr(n.carbs_g ?? ""),
    n_sugar_g: toStr(n.sugar_g ?? ""),
    n_added_sugar_g: toStr(n.added_sugar_g ?? ""),
    n_saturated_fat_g: toStr(n.saturated_fat_g ?? ""),
    n_sodium_mg: toStr(n.sodium_mg ?? ""),
    n_potassium_mg: toStr(n.potassium_mg ?? ""),
    n_phosphorus_mg: toStr(n.phosphorus_mg ?? ""),
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = params?.id as string | undefined
  const customerId = searchParams.get("customerId") ?? undefined
  const rawFrom = searchParams.get("from") ?? "/products"
  const from = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/products"

  const [product, setProduct] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)

  // Matching Customers tab (lazy-loaded)
  const [matchData, setMatchData] = React.useState<any>(null)
  const [matchLoading, setMatchLoading] = React.useState(false)
  const [matchLoaded, setMatchLoaded] = React.useState(false)

  const fetchMatchingCustomers = React.useCallback(async () => {
    if (matchLoaded || !id) return
    setMatchLoading(true)
    try {
      const res = await apiFetch(`/api/v1/products/${id}/matching-customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20, include_reasons: true, include_warnings: true }),
      })
      const data = await res.json()
      setMatchData(data)
    } catch {
      setMatchData({ error: true })
    } finally {
      setMatchLoading(false)
      setMatchLoaded(true)
    }
  }, [id, matchLoaded])

  React.useEffect(() => {
    if (!id) {
      router.replace("/products")
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setProduct(toProduct(data))
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load product")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, router])

  const handleSaved = () => {
    setEditOpen(false)
    apiFetch(`/products/${id}`)
      .then((res) => res.json())
      .then((data) => setProduct(toProduct(data)))
      .catch(() => {})
  }

  if (!id) return null

  if (loading) {
    return (
      <AppShell title="Product">
        <div className="space-y-6 p-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (error || !product) {
    return (
      <AppShell title="Product">
        <div className="p-8 space-y-4">
          <p className="text-[#64748b]">Product not found.</p>
          <Button asChild variant="outline" className="border-[#00438f] text-[#00438f]">
            <Link href={from}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={product.name}>
      <div className="bg-[#f5f7f8] min-h-screen">
        <div className="border-b border-[#e2e8f0] bg-white px-8 py-4">
          <div className="flex flex-col gap-4">
            <Button asChild variant="outline" size="sm" className="w-fit border-[#00438f] text-[#00438f] hover:bg-[#00438f]/10">
              <Link href={from} className="flex items-center gap-2">
                <ChevronLeft className="h-3 w-3" />
                Back to Products
              </Link>
            </Button>
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="text-[#64748b] hover:text-[#0f172a]">Portal</Link>
              <ChevronRight className="h-4 w-4 text-[#64748b]" />
              <Link href="/products" className="text-[#64748b] hover:text-[#0f172a]">Products</Link>
              <ChevronRight className="h-4 w-4 text-[#64748b]" />
              <span className="font-medium text-[#0f172a]">{product.name}</span>
            </nav>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    product.status === "active" ? "bg-[#dcfce7] text-[#15803d]" : "bg-slate-100 text-slate-600"
                  }`}>
                    {product.status}
                  </span>
                  <span className="text-sm text-[#94a3b8]">SKU: {product.sku}</span>
                </div>
                <h1 className="text-[30px] font-bold text-[#0f172a] tracking-tight">{product.name}</h1>
                {product.brand && (
                  <p className="text-base text-[#64748b] mt-1">
                    Brand: <span className="font-medium text-[#00438f]">{product.brand}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="border-[#e2e8f0] text-[#0f172a] rounded-xl hover:bg-[#f8fafc]"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button
                  className="bg-[#00438f] hover:bg-[#003366] text-white rounded-xl shadow-[0px_10px_15px_-3px_rgba(0,67,143,0.2)]"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Product
                </Button>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full" onValueChange={(v) => { if (v === "matching") fetchMatchingCustomers() }}>
            <TabsList className="bg-transparent border-b-2 border-transparent gap-8 px-0 h-auto">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] rounded-none pb-4 pt-4 font-bold text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="specifications" className="data-[state=active]:border-b-2 data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] rounded-none pb-4 pt-4 font-medium text-sm text-[#64748b]">
                Specifications
              </TabsTrigger>
              <TabsTrigger value="compliance" className="data-[state=active]:border-b-2 data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] rounded-none pb-4 pt-4 font-medium text-sm text-[#64748b]">
                Compliance & Diet
              </TabsTrigger>
              <TabsTrigger value="nutrition" className="data-[state=active]:border-b-2 data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] rounded-none pb-4 pt-4 font-medium text-sm text-[#64748b]">
                Nutrition
              </TabsTrigger>
              <TabsTrigger value="matching" className="data-[state=active]:border-b-2 data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] rounded-none pb-4 pt-4 font-medium text-sm text-[#64748b] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Matching Customers
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="data-[state=active]:border-b-2 data-[state=active]:border-[#00438f] data-[state=active]:text-[#00438f] rounded-none pb-4 pt-4 font-medium text-sm text-[#64748b] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Intelligence
              </TabsTrigger>
            </TabsList>

            <div className="bg-[#f5f7f8] border border-[#e2e8f0] rounded-2xl p-8 mt-6">
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <QuickFactsCard product={product} />
                    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                      <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Product Description</h3>
                      <p className="text-base text-[#334155] leading-relaxed">
                        {product.description || "—"}
                      </p>
                      <div className="border-t border-[#f1f5f9] mt-6 pt-6">
                        <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2">Ingredients List</h3>
                        <p className="text-base font-medium text-[#334155]">
                          {Array.isArray(product.ingredients) && product.ingredients.length > 0
                            ? product.ingredients.join(", ")
                            : typeof product.ingredients === "string" && product.ingredients
                              ? product.ingredients
                              : "—"}
                        </p>
                      </div>
                    </div>
                    <ComplianceCard product={product} />
                  </div>
                  <div className="space-y-6">
                    <ProductImageCard product={product} />
                    <NutritionFactsCard product={product} />
                    <ProductInternalNotesCard product={product} />
                    {customerId && <VendorNotesCard product={product} customerId={customerId} />}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="mt-0">
                <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] max-w-2xl">
                  <h3 className="font-bold text-lg text-[#0f172a] mb-4">Specifications</h3>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div><dt className="text-[#94a3b8] font-medium">Barcode</dt><dd className="font-mono">{product.barcode || "—"}</dd></div>
                    <div><dt className="text-[#94a3b8] font-medium">GTIN Type</dt><dd>{product.gtinType || "—"}</dd></div>
                    <div><dt className="text-[#94a3b8] font-medium">Category ID</dt><dd>{product.categoryId || "—"}</dd></div>
                    {product.sourceUrl && (
                      <div className="col-span-2">
                        <dt className="text-[#94a3b8] font-medium">Source URL</dt>
                        <dd><a href={product.sourceUrl} target="_blank" rel="noreferrer" className="text-[#00438f] hover:underline break-all">{product.sourceUrl}</a></dd>
                      </div>
                    )}
                  </dl>
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="mt-0">
                <ComplianceCard product={product} />
                {(product.regulatoryCodes?.length > 0 || product.diets?.length > 0) && (
                  <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] mt-6">
                    <h3 className="font-bold text-lg text-[#0f172a] mb-4">Regulatory Codes</h3>
                    <div className="flex flex-wrap gap-2">
                      {(product.regulatoryCodes ?? []).map((c: string) => (
                        <span key={c} className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">{c}</span>
                      ))}
                    </div>
                    {product.diets?.length > 0 && (
                      <>
                        <h3 className="font-bold text-lg text-[#0f172a] mt-4 mb-2">Diets</h3>
                        <div className="flex flex-wrap gap-2">
                          {product.diets.map((d: string) => (
                            <span key={d} className="px-3 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium">{d}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="nutrition" className="mt-0">
                <div className="max-w-md">
                  <NutritionFactsCard product={product} />
                </div>
              </TabsContent>

              <TabsContent value="matching" className="mt-0">
                {matchLoading && (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                  </div>
                )}
                {!matchLoading && matchData?.error && (
                  <div className="text-center py-10 text-[#64748b]">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Customer matching unavailable</p>
                    <p className="text-sm mt-1">The matching service is offline or not configured.</p>
                  </div>
                )}
                {!matchLoading && matchData && !matchData.error && (
                  <div className="space-y-4">
                    {matchData.summary && (
                      <div className="flex gap-4 flex-wrap mb-4">
                        <span className="text-sm text-[#64748b]">Total: <strong>{matchData.summary.total_customers ?? 0}</strong></span>
                        <span className="text-sm text-emerald-700">Safe: <strong>{matchData.summary.safe_count ?? 0}</strong></span>
                        <span className="text-sm text-amber-700">Warning: <strong>{matchData.summary.warning_count ?? 0}</strong></span>
                        <span className="text-sm text-rose-700">Excluded: <strong>{matchData.summary.excluded_count ?? 0}</strong></span>
                      </div>
                    )}
                    {(!matchData.customers || matchData.customers.length === 0) && (
                      <p className="text-[#64748b] text-sm py-6 text-center">No matching customer data found.</p>
                    )}
                    {(matchData.customers ?? []).map((c: any) => (
                      <div key={c.customer_id ?? c.id} className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#0f172a] truncate">{c.customer_name ?? c.name ?? "—"}</p>
                          <p className="text-sm text-[#64748b] truncate">{c.email ?? ""}</p>
                          {c.reasons && c.reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {c.reasons.slice(0, 3).map((r: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                              ))}
                            </div>
                          )}
                          {c.warnings && c.warnings.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.warnings.slice(0, 2).map((w: string, i: number) => (
                                <Badge key={i} className="text-xs bg-amber-100 text-amber-700 border-0">{w}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {c.safety_status === "safe" && <Badge className="bg-emerald-100 text-emerald-700 border-0">Safe</Badge>}
                          {c.safety_status === "warning" && <Badge className="bg-amber-100 text-amber-700 border-0">Warning</Badge>}
                          {c.safety_status === "excluded" && <Badge className="bg-rose-100 text-rose-700 border-0">Excluded</Badge>}
                          {c.match_score !== undefined && (
                            <p className="text-xs text-[#94a3b8] mt-1">{Math.round((c.match_score ?? 0) * 100)}% match</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="intelligence" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
                  <div className="space-y-6">
                    <SafetyCheckCard productId={id ?? ""} allergens={product.allergens ?? []} />
                    <SubstitutionsCard productId={id ?? ""} customerId={customerId} />
                  </div>
                  <div className="space-y-6">
                    <ProductIntelCard productId={id ?? ""} />
                    <PriceSensitivityCard />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <ProductForm
        mode="edit"
        productId={product.id}
        initialValues={productToFormValues(product)}
        open={editOpen}
        onOpenChange={setEditOpen}
        renderTrigger={false}
        onSaved={handleSaved}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product History</DialogTitle>
          </DialogHeader>
          <p className="text-[#64748b] py-4">Coming soon. Product change history will be available here.</p>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
