"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Eye, FileText, Grid, List, Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import ProductNotesDialog from "@/components/product-notes-dialog"
import { getProductNotes, setProductNotes } from "@/lib/api-products"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { UICustomer } from "@/types/customer"
import { updateCustomerHealth } from "@/lib/api-customers"
import { getMatches } from "@/lib/api-matching"
import { apiFetch } from "@/lib/backend"
import { listDiets, listAllergens, listConditions, listHealthGoals } from "@/lib/api-taxonomy"

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

type CustomerDetailViewProps = {
  customer: UICustomer
  showMatches?: boolean
  showRestrictions?: boolean
  showNotes?: boolean
  onHealthSaved?: (row: any) => void
}

const normalizeHealth = (r: any | null | undefined) => ({
  heightCm: r?.heightCm ?? r?.height_cm ?? undefined,
  weightKg: r?.weightKg ?? r?.weight_kg ?? undefined,
  age: r?.age ?? undefined,
  gender: r?.gender ?? undefined,
  activityLevel: r?.activityLevel ?? r?.activity_level ?? undefined,
  healthGoal: r?.healthGoal ?? r?.health_goal ?? undefined,
  conditions: r?.conditions ?? [],
  dietGoals: r?.dietGoals ?? [],
  macroTargets:
    r?.macroTargets ??
    r?.macro_targets ?? {
      protein_g: undefined,
      carbs_g: undefined,
      fat_g: undefined,
      calories: undefined,
    },
  avoidAllergens: r?.avoidAllergens ?? r?.avoid_allergens ?? [],
  bmi: r?.bmi ?? undefined,
  bmr: r?.bmr ?? undefined,
  tdeeCached: r?.tdeeCached ?? r?.tdee_cached ?? undefined,
  derivedLimits: r?.derivedLimits ?? r?.derived_limits ?? undefined,
})

const num = (v: any) =>
  v === "" || v === null || v === undefined ? undefined : Number(v)

export default function CustomerDetailView({
  customer,
  showMatches = true,
  showRestrictions = true,
  showNotes = true,
  onHealthSaved,
}: CustomerDetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()

  // ------------ Health draft (init ONLY when customer id changes) ------------
  const [editing, setEditing] = React.useState(false)
  const [health, setHealth] = React.useState<any>(() =>
    normalizeHealth(customer.healthProfile),
  )
  React.useEffect(() => {
    setHealth(normalizeHealth(customer.healthProfile))
  }, [customer.id])

  const handleHealthChange = (key: string, value: any) =>
    setHealth((prev: any) => ({ ...prev, [key]: value }))

  // ------------ Taxonomy options for dropdowns ------------
  type DietOpt = { code: string; label: string }
  type AllergenOpt = { code: string; label: string }
  type ConditionOpt = { conditionCode: string; label: string }
  const [dietOptions, setDietOptions] = React.useState<DietOpt[]>([])
  const [allergenOptions, setAllergenOptions] = React.useState<AllergenOpt[]>([])
  const [conditionOptions, setConditionOptions] = React.useState<ConditionOpt[]>([])
  const [dietSelect, setDietSelect] = React.useState("")
  const [allergenSelect, setAllergenSelect] = React.useState("")
  const [conditionSelect, setConditionSelect] = React.useState("")
  const [conditionCustomInput, setConditionCustomInput] = React.useState("")

  React.useEffect(() => {
    Promise.all([
      listDiets(5000, true),
      listAllergens(5000, true),
      listConditions(5000, true),
    ]).then(([diets, allergens, conditions]) => {
      setDietOptions((diets as any[]) ?? [])
      setAllergenOptions((allergens as any[]) ?? [])
      setConditionOptions((conditions as any[]) ?? [])
    }).catch(() => {})
  }, [])

  const addDietGoal = () => {
    const v = dietSelect.trim()
    if (!v) return
    setHealth((prev: any) => ({
      ...prev,
      dietGoals: Array.from(new Set([...(prev.dietGoals ?? []), v])),
    }))
    setDietSelect("")
  }
  const addAllergen = () => {
    const v = allergenSelect.trim()
    if (!v) return
    setHealth((prev: any) => ({
      ...prev,
      avoidAllergens: Array.from(new Set([...(prev.avoidAllergens ?? []), v])),
    }))
    setAllergenSelect("")
  }
  const addCondition = () => {
    const v = (conditionSelect.trim() || conditionCustomInput.trim())
    if (!v) return
    setHealth((prev: any) => ({
      ...prev,
      conditions: Array.from(new Set([...(prev.conditions ?? []), v])),
    }))
    setConditionSelect("")
    setConditionCustomInput("")
  }
  const removeFromArray = (key: "dietGoals" | "avoidAllergens" | "conditions", item: string) => {
    setHealth((prev: any) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((x: string) => x !== item),
    }))
  }
  const getDietLabel = (codeOrLabel: string) =>
    dietOptions.find((o) => o.code === codeOrLabel || o.label === codeOrLabel)?.label ?? codeOrLabel
  const getAllergenLabel = (codeOrLabel: string) =>
    allergenOptions.find((o) => o.code === codeOrLabel || o.label === codeOrLabel)?.label ?? codeOrLabel
  const getConditionLabel = (codeOrLabel: string) =>
    conditionOptions.find((o) => o.conditionCode === codeOrLabel || o.label === codeOrLabel)?.label ?? codeOrLabel

  // ------------ Save to backend ------------
  const handleSaveHealth = async () => {
    const payload = {
      heightCm: num(health.heightCm),
      weightKg: num(health.weightKg),
      age: num(health.age),
      gender: health.gender,
      activityLevel: health.activityLevel,
      healthGoal: health.healthGoal ?? undefined,
      conditions: health.conditions ?? [],
      dietGoals: health.dietGoals ?? [],
      macroTargets: {
        protein_g: num(health.macroTargets?.protein_g),
        carbs_g: num(health.macroTargets?.carbs_g),
        fat_g: num(health.macroTargets?.fat_g),
        calories: num(health.macroTargets?.calories),
      },
      avoidAllergens: health.avoidAllergens ?? [],
      bmi: num(health.bmi),
      bmr: num(health.bmr),
      tdeeCached: num(health.tdeeCached),
      derivedLimits: health.derivedLimits ?? undefined,
    }

    try {
      const saved = await updateCustomerHealth(customer.id, payload) // must return JSON row
      setHealth(normalizeHealth(saved))
      setEditing(false)
      onHealthSaved?.(saved)
      toast({ title: "Saved", description: "Health profile updated." })
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: String(e?.message ?? e),
      })
    }
  }

  // ------------ Matches area state (and product dialogs) ------------
  const [products, setProducts] = React.useState<Product[]>([])
  const [allProducts, setAllProducts] = React.useState<Product[]>([])
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [filter, setFilter] = React.useState("all")
  const [matching, setMatching] = React.useState(false)
  const [limit, setLimit] = React.useState<number>(25)

  const [notesOpen, setNotesOpen] = React.useState(false)
  const [activeNotesId, setActiveNotesId] = React.useState<string | null>(null)
  const [notesMap, setNotesMap] = React.useState<Record<string, string>>({})
  const [excluded, setExcluded] = React.useState<Set<string>>(new Set())
  const [healthGoalOptions, setHealthGoalOptions] = React.useState<{ code: string; label: string }[]>([])
  React.useEffect(() => {
    listHealthGoals().then((g) => setHealthGoalOptions((g as any[]) ?? [])).catch(() => {})
  }, [])

  const runMatch = React.useCallback(async () => {
    if (!MATCHING_ENABLED) {
      toast({
        title: "Matching disconnected",
        description: "Matching will be enabled in a later Neo4j integration phase.",
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
          imageUrl: p.imageUrl ?? "/diverse-products-still-life.png",
          matchScore: scorePct,
          diets: p.dietaryTags ?? p.diets ?? [],
          certifications: p.certifications ?? [],
          allergens: p.allergens ?? [],
          barcode: p.barcode ?? "",
          servingSize: p.servingSize ?? p.serving_size ?? "",
          packageSize: p.packageSize ?? p.package_weight ?? "",
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
          ingredients: Array.isArray(p.ingredients)
            ? p.ingredients.join(", ")
            : p.ingredients ?? "",
        }
      })
      const sorted = mapped.sort((a, b) => b.matchScore - a.matchScore)
      setAllProducts(sorted)
      const sliced = Number.isFinite(limit) ? sorted.slice(0, limit) : sorted
      setProducts(sliced)
      toast({
        title: "Match completed",
        description: `${sliced.length} products matched.`,
      })
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

  const handlePreview = React.useCallback(async () => {
  if (!MATCHING_ENABLED) {
    toast({
      title: "Matching disconnected",
      description: "Matching preview will be enabled in a later Neo4j integration phase.",
    })
    return
  }
  if (!customer?.id) return
  setMatching(true)
  try {
    const body = {
      required: [] as string[],
      preferred: health.dietGoals ?? [],
      allergens: health.avoidAllergens ?? [],
      conditions: health.conditions ?? [],
      limit,
    }

    const res = await apiFetch(`/matching/${encodeURIComponent(String(customer.id))}/preview`, {
      method: "POST",
      body: JSON.stringify(body),
    })
    const json = await res.json()
    const items = (Array.isArray(json) ? json : (json?.data ?? json?.items ?? [])) as any[]

    // -- same mapping as runMatch() --
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
        imageUrl: p.imageUrl ?? "/diverse-products-still-life.png",
        matchScore: scorePct,
        diets: p.dietaryTags ?? p.diets ?? [],
        certifications: p.certifications ?? [],
        allergens: p.allergens ?? [],
        barcode: p.barcode ?? "",
        servingSize: p.servingSize ?? p.serving_size ?? "",
        packageSize: p.packageSize ?? p.package_weight ?? "",
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

    toast({ title: "Preview completed", description: `${sliced.length} products (not saved).` })
  } catch (e: any) {
    toast({ variant: "destructive", title: "Preview failed", description: String(e?.message ?? e) })
  } finally {
    setMatching(false)
  }
}, [customer?.id, health.dietGoals, health.avoidAllergens, health.conditions, limit, toast])

  React.useEffect(() => {
    if (MATCHING_ENABLED && showMatches && customer?.id) runMatch()
  }, [showMatches, customer?.id, runMatch])

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

  // ------------ Render ------------
  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Health Profile */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Health Profile</h2>
            <Card className="p-6 space-y-6">
              {/* Identity */}
              <div className="flex items-center gap-4">
                <Image
                  src={customer.avatar || "/diverse-avatars.png"}
                  alt={customer.name}
                  width={64}
                  height={64}
                  className="rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold">{customer.name}</h3>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                  {customer.phone ? (
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  ) : null}
                </div>
              </div>

              {/* Basics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={health.age ?? ""}
                    onChange={(e) =>
                      handleHealthChange("age", e.target.value ? Number(e.target.value) : undefined)
                    }
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Input
                    value={health.gender ?? ""}
                    onChange={(e) => handleHealthChange("gender", e.target.value)}
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <Label>Activity Level</Label>
                  <Input
                    value={health.activityLevel ?? ""}
                    onChange={(e) => handleHealthChange("activityLevel", e.target.value)}
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <Label>Dietary Goal (Health Goal)</Label>
                  {!editing ? (
                    <div className="text-sm py-2">{health.healthGoal ?? "—"}</div>
                  ) : (
                    <Select
                      value={health.healthGoal?.trim() ? health.healthGoal : "__none__"}
                      onValueChange={(v) => handleHealthChange("healthGoal", v === "__none__" ? undefined : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {healthGoalOptions.map((g) => (
                          <SelectItem key={g.code} value={g.label}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    value={health.heightCm ?? ""}
                    onChange={(e) =>
                      handleHealthChange(
                        "heightCm",
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={health.weightKg ?? ""}
                    onChange={(e) =>
                      handleHealthChange(
                        "weightKg",
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    readOnly={!editing}
                  />
                </div>
                <div>
                  <Label>BMI</Label>
                  <Input
                    type="number"
                    value={health.bmi ?? ""}
                    onChange={(e) =>
                      handleHealthChange("bmi", e.target.value ? Number(e.target.value) : undefined)
                    }
                    readOnly={!editing}
                  />
                </div>

                <div>
                  <Label>BMR</Label>
                  <Input
                    type="number"
                    value={health.bmr ?? ""}
                    onChange={(e) =>
                      handleHealthChange("bmr", e.target.value ? Number(e.target.value) : undefined)
                    }
                    readOnly={!editing}
                  />
                </div>
              </div>

              {/* Arrays */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Diet Goals</Label>
                  {!editing ? (
                    <div className="flex flex-wrap gap-2">
                      {(health.dietGoals ?? []).map((g: string) => (
                        <Badge key={g} variant="secondary">
                          {getDietLabel(g)}
                        </Badge>
                      ))}
                      {(health.dietGoals ?? []).length === 0 && (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <select
                          className="border rounded px-2 h-9 flex-1 min-w-0"
                          value={dietSelect}
                          onChange={(e) => setDietSelect(e.target.value)}
                        >
                          <option value="">Choose a preference…</option>
                          {dietOptions.map((d) => (
                            <option key={d.code} value={d.code}>{d.label}</option>
                          ))}
                        </select>
                        <Button type="button" onClick={addDietGoal} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(health.dietGoals ?? []).map((g: string) => (
                          <Badge key={g} variant="secondary" className="gap-1">
                            {getDietLabel(g)}
                            <button
                              type="button"
                              onClick={() => removeFromArray("dietGoals", g)}
                              className="inline-flex items-center justify-center rounded-sm hover:bg-muted/50"
                              aria-label={`Remove ${g}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Avoid Allergens</Label>
                  {!editing ? (
                    <div className="flex flex-wrap gap-2">
                      {(health.avoidAllergens ?? []).map((a: string) => (
                        <Badge key={a} variant="secondary">
                          {getAllergenLabel(a)}
                        </Badge>
                      ))}
                      {(health.avoidAllergens ?? []).length === 0 && (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <select
                          className="border rounded px-2 h-9 flex-1 min-w-0"
                          value={allergenSelect}
                          onChange={(e) => setAllergenSelect(e.target.value)}
                        >
                          <option value="">Choose allergen to avoid…</option>
                          {allergenOptions.map((a) => (
                            <option key={a.code} value={a.code}>{a.label}</option>
                          ))}
                        </select>
                        <Button type="button" onClick={addAllergen} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(health.avoidAllergens ?? []).map((a: string) => (
                          <Badge key={a} variant="destructive" className="gap-1">
                            {getAllergenLabel(a)}
                            <button
                              type="button"
                              onClick={() => removeFromArray("avoidAllergens", a)}
                              className="inline-flex items-center justify-center rounded-sm hover:bg-muted/50"
                              aria-label={`Remove ${a}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label>Conditions</Label>
                  {!editing ? (
                    <div className="flex flex-wrap gap-2">
                      {(health.conditions ?? []).map((c: string) => (
                        <Badge key={c} variant="secondary">
                          {getConditionLabel(c)}
                        </Badge>
                      ))}
                      {(health.conditions ?? []).length === 0 && (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center flex-wrap">
                        <select
                          className="border rounded px-2 h-9 flex-1 min-w-[140px]"
                          value={conditionSelect}
                          onChange={(e) => setConditionSelect(e.target.value)}
                        >
                          <option value="">Choose condition…</option>
                          {conditionOptions.map((c) => (
                            <option key={c.conditionCode} value={c.conditionCode}>{c.label}</option>
                          ))}
                        </select>
                        <Input
                          className="flex-1 min-w-[120px]"
                          placeholder="Or type custom"
                          value={conditionCustomInput}
                          onChange={(e) => setConditionCustomInput(e.target.value)}
                        />
                        <Button type="button" onClick={addCondition} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(health.conditions ?? []).map((c: string) => (
                          <Badge key={c} variant="secondary" className="gap-1">
                            {getConditionLabel(c)}
                            <button
                              type="button"
                              onClick={() => removeFromArray("conditions", c)}
                              className="inline-flex items-center justify-center rounded-sm hover:bg-muted/50"
                              aria-label={`Remove ${c}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Macro targets */}
              <div>
                <Label className="mb-2 block">Macro Targets</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      value={health.macroTargets?.protein_g ?? ""}
                      onChange={(e) =>
                        handleHealthChange("macroTargets", {
                          ...(health.macroTargets || {}),
                          protein_g: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      readOnly={!editing}
                    />
                  </div>
                  <div>
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      value={health.macroTargets?.carbs_g ?? ""}
                      onChange={(e) =>
                        handleHealthChange("macroTargets", {
                          ...(health.macroTargets || {}),
                          carbs_g: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      readOnly={!editing}
                    />
                  </div>
                  <div>
                    <Label>Fat (g)</Label>
                    <Input
                      type="number"
                      value={health.macroTargets?.fat_g ?? ""}
                      onChange={(e) =>
                        handleHealthChange("macroTargets", {
                          ...(health.macroTargets || {}),
                          fat_g: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      readOnly={!editing}
                    />
                  </div>
                  <div>
                    <Label>Calories</Label>
                    <Input
                      type="number"
                      value={health.macroTargets?.calories ?? ""}
                      onChange={(e) =>
                        handleHealthChange("macroTargets", {
                          ...(health.macroTargets || {}),
                          calories: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      readOnly={!editing}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                {!editing ? (
                  <Button
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="border-[#00438f] text-[#00438f] hover:bg-[#00438f]/10"
                  >
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setHealth(normalizeHealth(customer.healthProfile))
                        setEditing(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveHealth} className="bg-[#00438f] hover:bg-[#003366] text-white">Save</Button>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Notes (placeholder only; real Notes opens as its own dialog from the card list) */}
          {showNotes && (
            <div>
              <h3 className="font-semibold mb-4">Notes</h3>
              <Card className="p-4">
                <Textarea
                  value={"Notes are managed in the Notes dialog."}
                  readOnly
                  disabled
                  className="min-h-[80px]"
                />
              </Card>
            </div>
          )}
        </div>

        {/* RIGHT: Matches (optional) */}
        {showMatches && (
          <div className="space-y-6">
            {/* Toolbar / Controls row */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Left: filters + controls — can wrap/scroll */}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-x-auto">
                <div className="flex items-center gap-2">
                  <Tabs value={filter} onValueChange={setFilter}>
                    <TabsList>
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value=">=80%">≥ 80%</TabsTrigger>
                      <TabsTrigger value=">=60%">≥ 60%</TabsTrigger>
                      <TabsTrigger value=">=40%">≥ 40%</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")}>
                    <TabsList>
                      <TabsTrigger value="grid"><Grid className="h-4 w-4" /></TabsTrigger>
                      <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="flex items-center gap-2 pl-2">
                  <span className="text-sm text-muted-foreground">Show</span>
                  <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                    <SelectTrigger className="h-8 w-[110px]">
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

              {/* Right: actions — fixed, no clipping */}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  className="whitespace-nowrap"
                  disabled={!MATCHING_ENABLED || matching}
                >
                  {matching ? "Testing..." : "Test run (don’t save)"}
                </Button>

                <Button
                  onClick={runMatch}
                  disabled={!MATCHING_ENABLED || matching}
                  className="bg-[#00438f] hover:bg-[#003366] text-white whitespace-nowrap"
                >
                  {matching ? "Running..." : "Run New Match"}
                </Button>
              </div>
            </div>

            {/* products */}
            <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {product.category} • {product.sku}
                        </p>
                      </div>
                    </div>

                    <div className="relative mb-4">
                      <Image
                        src={product.imageUrl || "/placeholder.svg"}
                        alt={product.name}
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute bottom-2 left-2">
                        <div className="bg-orange-500 text-white px-2 py-1 rounded text-sm font-medium">
                          {product.matchScore}%
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {product.diets.map((diet) => (
                        <Badge key={diet} variant="secondary" className="bg-green-100 text-green-700 text-xs">
                          {diet}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/products/${product.id}?customerId=${customer.id}&from=/customers/${customer.id}`)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveNotesId(product.id)
                          setNotesOpen(true)
                          ;(async () => {
                            try {
                              const note = await getProductNotes(product.id)
                              setNotesMap((prev) => ({ ...prev, [product.id]: note ?? "" }))
                            } catch {}
                          })()
                        }}
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        Notes
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 ml-auto"
                        onClick={() => setExcluded(prev => new Set(prev).add(product.id))}
                      >
                        <X className="h-4 w-4" />
                        Exclude
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drawers/Dialogs */}
      <ProductNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        initial={activeNotesId ? notesMap[activeNotesId] ?? "" : ""}
        onSave={(text) => {
          if (activeNotesId) {
            ;(async () => {
              try {
                await setProductNotes(activeNotesId, text)
                setNotesMap((prev: Record<string, string>) => ({ ...prev, [activeNotesId]: text }))
                toast({ title: "Notes saved" })
              } catch (e: any) {
                toast({ variant: "destructive", title: "Save failed", description: String(e?.message ?? e) })
              }
            })()
          }
        }}
      />
    </div>
  )
}
