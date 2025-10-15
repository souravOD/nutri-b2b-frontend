"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X } from "lucide-react"
import { listDiets, listAllergens, listConditions } from "@/lib/api-taxonomy";
import { apiFetch } from "@/lib/backend"

export type DietarySelection = {
  required: string[]
  preferred: string[]
  allergens: string[]
  conditions: string[]
}

type Props = {
  value: DietarySelection
  onChange: (next: DietarySelection) => void
  options?: {
    diet?: string[]
    allergens?: string[]
    conditions?: string[]
  }
}

const defaultOptions = {
  diet: ["Vegan", "Vegetarian", "Keto", "Paleo", "Halal", "Kosher", "Low-FODMAP"],
  allergens: ["Peanuts", "Tree Nuts", "Dairy", "Gluten", "Soy", "Eggs", "Shellfish", "Sesame"],
  conditions: ["Diabetes", "Celiac", "Hypertension"],
}

export default function DietaryRestrictionSelector({ value, onChange, options = defaultOptions }: Props) {
  const [customInput, setCustomInput] = React.useState("")
  const [addToSection, setAddToSection] = React.useState<"preferred" | "required">("preferred")
  const [dbDiets, setDbDiets] = React.useState<string[]>([])
  const [dbAllergens, setDbAllergens] = React.useState<string[]>([])
  const [dbConds, setDbConds] = React.useState<string[]>([])
  const [showAllDiets, setShowAllDiets] = React.useState(false)
  const [showAllAllergens, setShowAllAllergens] = React.useState(false)
  const [showAllConds, setShowAllConds] = React.useState(false)
  React.useEffect(() => {
    (async () => {
      const j1 = await (await apiFetch("/taxonomy/diets?top=10")).json()
      const j2 = await (await apiFetch("/taxonomy/allergens?top=10")).json()
      const j3 = await (await apiFetch("/taxonomy/conditions?top=10")).json()
      const diets      = (j1?.data ?? j1 ?? []).map((x: any) => x.code ?? x.label ?? x)
      const allergens  = (j2?.data ?? j2 ?? []).map((x: any) => x.code ?? x.label ?? x)
      const conditions = (j3?.data ?? j3 ?? []).map((x: any) => x.conditionCode ?? x)
      setDbDiets(diets)
      setDbAllergens(allergens)
      setDbConds(conditions)
    })()
  }, [])
  const toggle = (bucket: keyof DietarySelection, item: string) => {
    const set = new Set(value[bucket])
    if (set.has(item)) {
      set.delete(item)
    } else {
      set.add(item)
    }
    onChange({ ...value, [bucket]: Array.from(set) })
  }

  const remove = (bucket: keyof DietarySelection, item: string) => {
    onChange({
      ...value,
      [bucket]: value[bucket].filter((i) => i !== item),
    })
  }

  const addCustom = () => {
    if (!customInput.trim()) return

    const item = addToSection === "required" ? `No ${customInput.trim()}` : customInput.trim()
    const bucket = addToSection

    const set = new Set(value[bucket])
    set.add(item)
    onChange({ ...value, [bucket]: Array.from(set) })
    setCustomInput("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addCustom()
    }
  }

  return (
    <div className="space-y-6">
      {/* Selected sections */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-sm font-medium mb-2 block">Required (must-avoid)</Label>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {value.required.length === 0 ? (
              <span className="text-sm text-muted-foreground">None selected</span>
            ) : (
              value.required.map((item) => (
                <Badge key={item} variant="destructive" className="gap-1">
                  {item}
                  <button
                    onClick={() => remove("required", item)}
                    aria-label={`Remove ${item}`}
                    className="hover:bg-red-700 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Preferred</Label>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {value.preferred.length === 0 ? (
              <span className="text-sm text-muted-foreground">None selected</span>
            ) : (
              value.preferred.map((item) => (
                <Badge key={item} variant="secondary" className="bg-green-100 text-green-700 gap-1">
                  {item}
                  <button
                    onClick={() => remove("preferred", item)}
                    aria-label={`Remove ${item}`}
                    className="hover:bg-green-200 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Allergens</Label>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {value.allergens.length === 0 ? (
              <span className="text-sm text-muted-foreground">None selected</span>
            ) : (
              value.allergens.map((item) => (
                <Badge key={item} variant="outline" className="bg-yellow-100 text-yellow-700 gap-1">
                  {item}
                  <button
                    onClick={() => remove("allergens", item)}
                    aria-label={`Remove ${item}`}
                    className="hover:bg-yellow-200 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Health Conditions</Label>
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {value.conditions.length === 0 ? (
              <span className="text-sm text-muted-foreground">None selected</span>
            ) : (
              value.conditions.map((item) => (
                <Badge key={item} variant="secondary" className="bg-blue-100 text-blue-700 gap-1">
                  {item}
                  <button
                    onClick={() => remove("conditions", item)}
                    aria-label={`Remove ${item}`}
                    className="hover:bg-blue-200 rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Clickable option lists */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Diet</Label>
          <div className="flex flex-wrap gap-2">
            {(showAllDiets ? dbDiets : dbDiets.slice(0, 10)).concat(dbDiets.length ? [] : (options.diet ?? [])).map((diet) => {
              const isSelected = value.preferred.includes(diet)
              return (
                <Button
                  key={diet}
                  variant={isSelected ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggle("preferred", diet)}
                  aria-pressed={isSelected}
                  role="button"
                  className="justify-start"
                >
                  {diet}
                </Button>
              )
            })}
            {dbDiets.length > 10 && !showAllDiets && (
              <Button size="sm" variant="ghost" onClick={async () => {
                setShowAllDiets(true)
                const full = await (await apiFetch("/taxonomy/diets?top=10&all=1")).json()
                setDbDiets((full?.data ?? full ?? []).map((x: any) => x.code ?? x.label ?? x))
              }}>Show all</Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Allergens</Label>
          <div className="flex flex-wrap gap-2">
            {(showAllAllergens ? dbAllergens : dbAllergens.slice(0, 10)).concat(dbAllergens.length ? [] : (options.allergens ?? [])).map((allergen) => {
              const isSelected = value.allergens.includes(allergen)
              return (
                <Button
                  key={allergen}
                  variant={isSelected ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggle("allergens", allergen)}
                  aria-pressed={isSelected}
                  role="button"
                  className="justify-start"
                >
                  {allergen}
                </Button>
              )
            })}
            {dbAllergens.length > 10 && !showAllAllergens && (
              <Button size="sm" variant="ghost" onClick={async () => {
                setShowAllAllergens(true)
                const full = await (await apiFetch("/taxonomy/allergens?top=10&all=1")).json()
                setDbAllergens((full?.data ?? full ?? []).map((x: any) => x.code ?? x.label ?? x))
              }}>Show all</Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Conditions</Label>
          <div className="flex flex-wrap gap-2">
            {(showAllConds ? dbConds : dbConds.slice(0, 10)).concat(dbConds.length ? [] : (options.conditions ?? [])).map((condition) => {
              const isSelected = value.conditions.includes(condition)
              return (
                <Button
                  key={condition}
                  variant={isSelected ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => toggle("conditions", condition)}
                  aria-pressed={isSelected}
                  role="button"
                  className="justify-start"
                >
                  {condition}
                </Button>
              )
            })}
            {dbConds.length > 10 && !showAllConds && (
              <Button size="sm" variant="ghost" onClick={async () => {
                setShowAllConds(true)
                const full = await (await apiFetch("/taxonomy/conditions?top=10&all=1")).json()
                setDbConds((full?.data ?? full ?? []).map((x: any) => x.conditionCode ?? x))
              }}>Show all</Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Add custom restriction */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Add custom restriction</Label>
        <div className="flex items-center gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter custom restriction"
            className="flex-1"
          />
          <Tabs value={addToSection} onValueChange={(v) => setAddToSection(v as "preferred" | "required")}>
            <TabsList className="grid w-32 grid-cols-2">
              <TabsTrigger value="preferred" className="text-xs">
                Preferred
              </TabsTrigger>
              <TabsTrigger value="required" className="text-xs">
                Required
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={addCustom} disabled={!customInput.trim()}>
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {addToSection === "required"
            ? 'Will be added as "No [restriction]" to Required section'
            : "Will be added to Preferred section"}
        </p>
      </div>
    </div>
  )
}
