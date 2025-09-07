"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { createCustomerWithHealth } from "@/lib/api-customers"
import { useToast } from "@/hooks/use-toast"
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react"

type Props = {
  onClose?: () => void
  onCreated?: (result: any) => void
}

export default function CustomerForm({ onClose, onCreated }: Props) {
  const { toast } = useToast()

  // Basic customer
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState("")

  // Dietary restrictions (your modal already has these)
  const [preferred, setPreferred] = React.useState<string[]>([])        // -> dietGoals
  const [avoid, setAvoid] = React.useState<string[]>([])                // -> avoidAllergens
  const [restrictionInput, setRestrictionInput] = React.useState("")
  const [restrictionType, setRestrictionType] = React.useState<"Preferred"|"Avoid">("Preferred")

  // Health (optional)
  const [showHealth, setShowHealth] = React.useState(false)
  const [age, setAge] = React.useState<number | "">("")
  const [gender, setGender] = React.useState<"male"|"female"|"other"|"unspecified"|"">("")
  const [activity, setActivity] = React.useState<"sedentary"|"light"|"moderate"|"very"|"extra"|"">("")
  const [height, setHeight] = React.useState<number | "">("")
  const [weight, setWeight] = React.useState<number | "">("")
  const [conditions, setConditions] = React.useState<string[]>([])
  const [conditionInput, setConditionInput] = React.useState("")
  // const [bmi, setBmi] = React.useState<number | "">("")
  // const [bmr, setBmr] = React.useState<number | "">("")
  // const [tdee, setTdee] = React.useState<number | "">("")
  const [protein, setProtein] = React.useState<number | "">("")
  const [carbs, setCarbs] = React.useState<number | "">("")
  const [fat, setFat] = React.useState<number | "">("")
  const [calories, setCalories] = React.useState<number | "">("")

  const addTag = () => {
    const v = tagInput.trim()
    if (!v) return
    setTags((prev) => Array.from(new Set([...prev, v])))
    setTagInput("")
  }

  const addRestriction = () => {
    const v = restrictionInput.trim()
    if (!v) return
    if (restrictionType === "Preferred") {
      setPreferred((p) => Array.from(new Set([...p, v])))
    } else {
      setAvoid((p) => Array.from(new Set([...p, v])))
    }
    setRestrictionInput("")
  }

  const addCondition = () => {
    const v = conditionInput.trim()
    if (!v) return
    setConditions((p) => Array.from(new Set([...p, v])))
    setConditionInput("")
  }

  const num = (v: number | "" ) => (v === "" ? undefined : Number(v))

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      toast({ variant: "destructive", title: "Name and email are required" })
      return
    }

    const healthProvided =
      age !== "" || gender || activity || height !== "" || weight !== "" ||
      preferred.length || avoid.length || conditions.length ||
      protein !== "" || carbs !== "" || fat !== "" || calories !== ""

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      tags,
      // store “Preferred” in dietGoals and “Avoid” in avoidAllergens
      health: healthProvided ? {
        age: num(age),
        gender: gender || undefined,
        activityLevel: activity || undefined,
        heightCm: num(height),
        weightKg: num(weight),
        conditions,
        dietGoals: preferred,
        avoidAllergens: avoid,
        macroTargets: {
          protein_g: num(protein),
          carbs_g: num(carbs),
          fat_g: num(fat),
          calories: num(calories),
        },
      } : undefined,
    };
    await createCustomerWithHealth(payload);

    if (healthProvided) {
      payload.health = {
        age: num(age),
        gender: (gender || undefined) as any,
        activityLevel: (activity || undefined) as any,
        heightCm: num(height),
        weightKg: num(weight),
        conditions,
        dietGoals: preferred,
        avoidAllergens: avoid,
        macroTargets: {
          protein_g: num(protein),
          carbs_g: num(carbs),
          fat_g: num(fat),
          calories: num(calories),
        },
      }
    }

    try {
      const created = await createCustomerWithHealth(payload)
      toast({ title: "Customer created" })
      onCreated?.(created)
      onClose?.()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Create failed", description: String(e?.message ?? e) })
    }
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Basic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter customer name" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email address" />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" />
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mt-1">
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add a tag" />
          <Button type="button" onClick={addTag}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(tags.filter((x) => x !== t))} />
            </Badge>
          ))}
        </div>
      </div>

      {/* Dietary Restrictions (Preferred / Avoid) */}
      <div>
        <Label>Dietary Restrictions</Label>
        <div className="flex gap-2 items-center mt-1">
          <select
            className="border rounded px-2 h-9"
            value={restrictionType}
            onChange={(e) => setRestrictionType(e.target.value as any)}
          >
            <option>Preferred</option>
            <option>Avoid</option>
          </select>
          <Input
            value={restrictionInput}
            onChange={(e) => setRestrictionInput(e.target.value)}
            placeholder="Add restriction"
          />
          <Button type="button" onClick={addRestriction}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {preferred.map((v) => (
            <Badge key={`p-${v}`} variant="secondary" className="gap-1">
              {v}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setPreferred(preferred.filter((x) => x !== v))} />
            </Badge>
          ))}
          {avoid.map((v) => (
            <Badge key={`a-${v}`} variant="destructive" className="gap-1">
              {v}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setAvoid(avoid.filter((x) => x !== v))} />
            </Badge>
          ))}
        </div>
      </div>

      {/* Health Profile (optional) */}
      <div className="mt-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm"
          onClick={() => setShowHealth((s) => !s)}
        >
          {showHealth ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Health Profile (optional)
        </button>

        {showHealth && (
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Age</Label>
                <Input type="number" value={age} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <Label>Gender</Label>
                <select className="border rounded h-9 w-full px-2" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                  <option value="">—</option>
                  <option value="female">female</option>
                  <option value="male">male</option>
                  <option value="other">other</option>
                  <option value="unspecified">unspecified</option>
                </select>
              </div>
              <div>
                <Label>Activity Level</Label>
                <select className="border rounded h-9 w-full px-2" value={activity} onChange={(e) => setActivity(e.target.value as any)}>
                  <option value="">—</option>
                  <option value="sedentary">sedentary</option>
                  <option value="light">light</option>
                  <option value="moderate">moderate</option>
                  <option value="very">very</option>
                  <option value="extra">extra</option>
                </select>
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input type="number" value={height} onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              {/* <div>
                <Label>BMI</Label>
                <Input type="number" value={bmi} onChange={(e) => setBmi(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <Label>BMR</Label>
                <Input type="number" value={bmr} onChange={(e) => setBmr(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <Label>TDEE</Label>
                <Input type="number" value={tdee} onChange={(e) => setTdee(e.target.value === "" ? "" : Number(e.target.value))} />
              </div> */}
            </div>

            <div>
              <Label>Conditions</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="Add condition" value={conditionInput} onChange={(e) => setConditionInput(e.target.value)} />
                <Button type="button" onClick={addCondition}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {conditions.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1">
                    {c}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setConditions(conditions.filter((x) => x !== c))} />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Macro Targets</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Protein (g)</Label>
                  <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div>
                  <Label>Carbs (g)</Label>
                  <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div>
                  <Label>Fat (g)</Label>
                  <Input type="number" value={fat} onChange={(e) => setFat(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div>
                  <Label>Calories</Label>
                  <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} className="bg-black text-white hover:bg-gray-800">
          Add Customer
        </Button>
      </div>
    </Card>
  )
}
