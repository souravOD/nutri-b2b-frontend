"use client"

import * as React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Eye, FileText, Grid, List, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import DietaryRestrictionSelector, {
  type DietarySelection,
} from "@/components/dietary-restriction-selector"
import ProductDetailsDrawer from "@/components/product-details-drawer"
import ProductNotesDialog from "@/components/product-notes-dialog"

import type { UICustomer } from "@/types/customer"
import { updateCustomerHealth } from "@/lib/api-customers"
import { getMatches } from "@/lib/api-matching"

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

  const handleArrayCSV = (key: string, csv: string) => {
    const arr = csv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    setHealth((prev: any) => ({ ...prev, [key]: arr }))
  }

  // ------------ Dietary mirror for the selector ------------
  const [dietary, setDietary] = React.useState<DietarySelection>(() => {
    const hp = customer.healthProfile
    return {
      required: (hp?.avoidAllergens ?? []).map((a: string) => `No ${a}`),
      preferred: hp?.dietGoals ?? [],
      allergens: hp?.avoidAllergens ?? [],
      conditions: hp?.conditions ?? [],
    }
  })
  React.useEffect(() => {
    const hp = customer.healthProfile
    setDietary({
      required: (hp?.avoidAllergens ?? []).map((a: string) => `No ${a}`),
      preferred: hp?.dietGoals ?? [],
      allergens: hp?.avoidAllergens ?? [],
      conditions: hp?.conditions ?? [],
    })
  }, [customer.id])

  // ------------ Save to backend ------------
  const handleSaveHealth = async () => {
    const fromRequired = (dietary.required ?? []).map((s) =>
      s.replace(/^No\s+/i, ""),
    )
    const mergedAllergens = Array.from(
      new Set([...(dietary.allergens ?? []), ...fromRequired]),
    )

    const payload = {
      heightCm: num(health.heightCm),
      weightKg: num(health.weightKg),
      age: num(health.age),
      gender: health.gender,
      activityLevel: health.activityLevel,
      conditions: health.conditions ?? [],
      dietGoals: health.dietGoals ?? [],
      macroTargets: {
        protein_g: num(health.macroTargets?.protein_g),
        carbs_g: num(health.macroTargets?.carbs_g),
        fat_g: num(health.macroTargets?.fat_g),
        calories: num(health.macroTargets?.calories),
      },
      avoidAllergens: mergedAllergens,
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
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [filter, setFilter] = React.useState("all")
  const [matching, setMatching] = React.useState(false)

  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [detailsProduct, setDetailsProduct] = React.useState<Product | null>(null)

  const [notesOpen, setNotesOpen] = React.useState(false)
  const [activeNotesId, setActiveNotesId] = React.useState<string | null>(null)
  const [notesMap, setNotesMap] = React.useState<Record<string, string>>({})

  const runMatch = React.useCallback(async () => {
    if (!customer?.id) return
    setMatching(true)
    try {
      const items = await getMatches(String(customer.id))
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
      setProducts(mapped.sort((a, b) => b.matchScore - a.matchScore))
      toast({
        title: "Match completed",
        description: `${mapped.length} products matched.`,
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
  }, [customer?.id, toast])

  React.useEffect(() => {
    if (showMatches && customer?.id) runMatch()
  }, [showMatches, customer?.id, runMatch])

  const filteredProducts = products.filter((p) => {
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
                          {g}
                        </Badge>
                      ))}
                      {(health.dietGoals ?? []).length === 0 && (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      value={(health.dietGoals ?? []).join(", ")}
                      onChange={(e) => handleArrayCSV("dietGoals", e.target.value)}
                      placeholder="comma, separated"
                    />
                  )}
                </div>

                <div>
                  <Label>Avoid Allergens</Label>
                  {!editing ? (
                    <div className="flex flex-wrap gap-2">
                      {(health.avoidAllergens ?? []).map((a: string) => (
                        <Badge key={a} variant="secondary">
                          {a}
                        </Badge>
                      ))}
                      {(health.avoidAllergens ?? []).length === 0 && (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      value={(health.avoidAllergens ?? []).join(", ")}
                      onChange={(e) => handleArrayCSV("avoidAllergens", e.target.value)}
                      placeholder="comma, separated"
                    />
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label>Conditions</Label>
                  {!editing ? (
                    <div className="flex flex-wrap gap-2">
                      {(health.conditions ?? []).map((c: string) => (
                        <Badge key={c} variant="secondary">
                          {c}
                        </Badge>
                      ))}
                      {(health.conditions ?? []).length === 0 && (
                        <div className="text-sm text-muted-foreground">—</div>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      value={(health.conditions ?? []).join(", ")}
                      onChange={(e) => handleArrayCSV("conditions", e.target.value)}
                      placeholder="comma, separated"
                    />
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
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setHealth(normalizeHealth(customer.healthProfile))
                        // reset dietary mirror too
                        const hp = customer.healthProfile
                        setDietary({
                          required: (hp?.avoidAllergens ?? []).map((a: string) => `No ${a}`),
                          preferred: hp?.dietGoals ?? [],
                          allergens: hp?.avoidAllergens ?? [],
                          conditions: hp?.conditions ?? [],
                        })
                        setEditing(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveHealth}>Save</Button>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Dietary Restrictions (optional) */}
          {showRestrictions && (
            <div>
              <h3 className="font-semibold mb-4">Dietary Restrictions</h3>
              <Card className="p-6">
                <DietaryRestrictionSelector value={dietary} onChange={setDietary} />
              </Card>
            </div>
          )}

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
            <div className="flex items-center justify-between">
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
                    <TabsTrigger value="grid">
                      <Grid className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <List className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Button onClick={runMatch} disabled={matching} className="bg-black text-white hover:bg-gray-800">
                {matching ? "Running..." : "Run New Match"}
              </Button>
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
                        onClick={() => {
                          setDetailsProduct(product)
                          setDetailsOpen(true)
                        }}
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
                        }}
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        Notes
                      </Button>

                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 ml-auto">
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
      <ProductDetailsDrawer
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        product={detailsProduct}
      />

      <ProductNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        initial={activeNotesId ? notesMap[activeNotesId] ?? "" : ""}
        onSave={(text) => {
          if (activeNotesId) {
            setNotesMap((prev: Record<string, string>) => ({
              ...prev,
              [activeNotesId]: text,
            }))
            toast({
              title: "Notes saved",
              description: "Product notes have been saved.",
            })
          }
        }}
      />
    </div>
  )
}
