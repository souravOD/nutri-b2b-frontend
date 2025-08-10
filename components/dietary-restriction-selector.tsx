"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { X } from "lucide-react"

type Category = {
  name: string
  options: string[]
}
type DietaryRestrictionSelectorProps = {
  value?: {
    required: string[]
    preferred: string[]
    allergens: string[]
    conditions: string[]
  }
  onChange?: (val: DietaryRestrictionSelectorProps["value"]) => void
}

const defaultCategories: Category[] = [
  { name: "Diet", options: ["Vegan", "Vegetarian", "Keto", "Paleo", "Halal", "Kosher", "Low-FODMAP"] },
  { name: "Allergens", options: ["Peanuts", "Tree Nuts", "Dairy", "Gluten", "Soy", "Eggs", "Shellfish", "Sesame"] },
  { name: "Conditions", options: ["Diabetes", "Celiac", "Hypertension"] },
]

export default function DietaryRestrictionSelector({
  value = { required: [], preferred: [], allergens: [], conditions: [] },
  onChange = () => {},
}: DietaryRestrictionSelectorProps) {
  const [custom, setCustom] = React.useState("")
  const add = (key: keyof typeof value, tag: string) => {
    const set = new Set(value[key])
    set.add(tag)
    onChange({ ...value, [key]: Array.from(set) })
  }
  const remove = (key: keyof typeof value, tag: string) => {
    onChange({ ...value, [key]: value[key].filter((t) => t !== tag) })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>{"Required (must-avoid)"}</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {value.required.map((t) => (
              <Badge key={t} className="bg-rose-100 text-rose-700 gap-1">
                {t}
                <button onClick={() => remove("required", t)} aria-label={`Remove ${t}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <Label>{"Preferred"}</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {value.preferred.map((t) => (
              <Badge key={t} className="bg-emerald-100 text-emerald-700 gap-1">
                {t}
                <button onClick={() => remove("preferred", t)} aria-label={`Remove ${t}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <Label>{"Allergens"}</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {value.allergens.map((t) => (
              <Badge key={t} className="bg-amber-100 text-amber-700 gap-1">
                {t}
                <button onClick={() => remove("allergens", t)} aria-label={`Remove ${t}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <Label>{"Health Conditions"}</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {value.conditions.map((t) => (
              <Badge key={t} className="bg-slate-100 text-slate-700 gap-1">
                {t}
                <button onClick={() => remove("conditions", t)} aria-label={`Remove ${t}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Separator />
      <div className="grid gap-4 md:grid-cols-3">
        {defaultCategories.map((cat) => (
          <div key={cat.name} className="space-y-2">
            <Label>{cat.name}</Label>
            <div className="flex flex-wrap gap-2">
              {cat.options.map((opt) => (
                <Button
                  key={opt}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const key =
                      cat.name === "Allergens" ? "allergens" : cat.name === "Conditions" ? "conditions" : "preferred"
                    add(key as any, opt)
                  }}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Add custom restriction"
          aria-label="Add custom restriction"
        />
        <Button
          onClick={() => {
            if (!custom.trim()) return
            add("preferred", custom.trim())
            setCustom("")
          }}
        >
          {"Add"}
        </Button>
      </div>
    </div>
  )
}
