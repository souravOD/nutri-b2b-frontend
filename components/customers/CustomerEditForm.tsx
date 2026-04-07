"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateCustomer, updateCustomerHealth, getCustomer, deleteCustomer } from "@/lib/api-customers"
import { listDiets, listAllergens, listConditions, listHealthGoals } from "@/lib/api-taxonomy"
import { useToast } from "@/hooks/use-toast"
import { Plus, X, Trash2, User, Activity, Apple, AlertTriangle, Stethoscope, FileText } from "lucide-react"
import type { UICustomer } from "@/types/customer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DietOption = { code: string; label: string }
type ConditionOption = { conditionCode: string; label: string }
type AllergenOption = { code: string; label: string }

const normalizeHealth = (r: any | null | undefined) => ({
  heightCm: r?.heightCm ?? r?.height_cm ?? undefined,
  weightKg: r?.weightKg ?? r?.weight_kg ?? undefined,
  age: r?.age ?? undefined,
  gender: r?.gender ?? undefined,
  activityLevel: r?.activityLevel ?? r?.activity_level ?? undefined,
  healthGoal: r?.healthGoal ?? r?.health_goal ?? undefined,
  conditions: r?.conditions ?? [],
  dietGoals: r?.dietGoals ?? r?.diet_goals ?? [],
  macroTargets: r?.macroTargets ?? r?.macro_targets ?? { protein_g: undefined, carbs_g: undefined, fat_g: undefined, calories: undefined },
  avoidAllergens: r?.avoidAllergens ?? r?.avoid_allergens ?? [],
})

const num = (v: any) => (v === "" || v === null || v === undefined ? undefined : Number(v))

const labelClass = "text-[14px] font-bold text-[#334155]"
const secondaryLabelClass = "text-[12px] font-bold text-[#64748b] uppercase"
const inputClass = "bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] h-[42px] px-3 text-[16px] text-[#0f172a] placeholder:text-[#6b7280]"
const cardClass = "bg-white border border-[#e2e8f0] rounded-[12px] p-[25px]"

type Props = {
  customer: UICustomer
  onCancel: () => void
  onSaved: (updated: UICustomer) => void
  onDeleted?: () => void
}

/** Location display: "City, State" for single input */
function formatLocation(city?: string, state?: string) {
  const parts = [city?.trim(), state?.trim()].filter(Boolean)
  return parts.join(", ") || ""
}

function parseLocation(str: string): { city: string; state: string } {
  const s = str.trim()
  const comma = s.indexOf(",")
  if (comma >= 0) {
    return { city: s.slice(0, comma).trim(), state: s.slice(comma + 1).trim() }
  }
  return { city: s, state: "" }
}

export default function CustomerEditForm({ customer, onCancel, onSaved, onDeleted }: Props) {
  const { toast } = useToast()

  const [name, setName] = React.useState(customer.name ?? "")
  const [email, setEmail] = React.useState(customer.email ?? "")
  const [phone, setPhone] = React.useState(customer.phone ?? "")
  const [tags, setTags] = React.useState<string[]>(Array.isArray(customer.tags) ? customer.tags : [])

  const [city, setCity] = React.useState(customer.location?.city ?? "")
  const [state, setState] = React.useState(customer.location?.state ?? "")
  const [postal, setPostal] = React.useState(customer.location?.postal ?? "")
  const [country, setCountry] = React.useState(customer.location?.country ?? "")
  const [locationInput, setLocationInput] = React.useState(formatLocation(customer.location?.city, customer.location?.state))

  const [notes, setNotes] = React.useState(customer.notes ?? "")

  const [health, setHealth] = React.useState(() => normalizeHealth(customer.healthProfile))
  const [saving, setSaving] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const [dietSelect, setDietSelect] = React.useState("")
  const [avoidSelect, setAvoidSelect] = React.useState("")
  const [avoidCustomInput, setAvoidCustomInput] = React.useState("")
  const [conditionSelect, setConditionSelect] = React.useState("")
  const [conditionCustomInput, setConditionCustomInput] = React.useState("")

  const [dietOptions, setDietOptions] = React.useState<DietOption[]>([])
  const [allergenOptions, setAllergenOptions] = React.useState<AllergenOption[]>([])
  const [conditionOptions, setConditionOptions] = React.useState<ConditionOption[]>([])
  const [healthGoalOptions, setHealthGoalOptions] = React.useState<{ code: string; label: string }[]>([])

  React.useEffect(() => {
    setHealth(normalizeHealth(customer.healthProfile))
    setName(customer.name ?? "")
    setEmail(customer.email ?? "")
    setPhone(customer.phone ?? "")
    setTags(Array.isArray(customer.tags) ? customer.tags : [])
    setCity(customer.location?.city ?? "")
    setState(customer.location?.state ?? "")
    setPostal(customer.location?.postal ?? "")
    setCountry(customer.location?.country ?? "")
    setLocationInput(formatLocation(customer.location?.city, customer.location?.state))
    setNotes(customer.notes ?? "")
  }, [customer.id])

  React.useEffect(() => {
    Promise.all([
      listDiets(5000, true),
      listAllergens(5000, true),
      listConditions(5000, true),
      listHealthGoals(),
    ]).then(([diets, allergens, conditions, goals]) => {
      setDietOptions((diets as any[]) ?? [])
      setAllergenOptions((allergens as any[]) ?? [])
      setConditionOptions((conditions as any[]) ?? [])
      setHealthGoalOptions((goals as any[]) ?? [])
    }).catch((e) => {
      toast({ variant: "destructive", title: "Could not load options", description: String(e?.message ?? e) })
    })
  }, [toast])

  const addDietGoal = () => {
    if (!dietSelect.trim()) return
    setHealth((prev) => ({
      ...prev,
      dietGoals: Array.from(new Set([...(prev.dietGoals ?? []), dietSelect.trim()])),
    }))
    setDietSelect("")
  }

  const addAvoid = () => {
    const v = avoidSelect.trim() || avoidCustomInput.trim()
    if (!v) return
    setHealth((prev) => ({
      ...prev,
      avoidAllergens: Array.from(new Set([...(prev.avoidAllergens ?? []), v])),
    }))
    setAvoidSelect("")
    setAvoidCustomInput("")
  }

  const addCondition = () => {
    const v = conditionSelect.trim() || conditionCustomInput.trim()
    if (!v) return
    setHealth((prev) => ({
      ...prev,
      conditions: Array.from(new Set([...(prev.conditions ?? []), v])),
    }))
    setConditionSelect("")
    setConditionCustomInput("")
  }

  const removeFromArray = (key: "dietGoals" | "avoidAllergens" | "conditions", item: string) => {
    setHealth((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((x: string) => x !== item),
    }))
  }

  const handleHealthChange = (key: string, value: any) =>
    setHealth((prev: any) => ({ ...prev, [key]: value }))

  const getDietLabel = (code: string) => dietOptions.find((d) => d.code === code || d.label === code)?.label ?? code
  const getAllergenLabel = (code: string) => allergenOptions.find((a) => a.code === code || a.label === code)?.label ?? code
  const getConditionLabel = (code: string) => conditionOptions.find((c) => c.conditionCode === code || c.label === code)?.label ?? code

  const handleSave = async () => {
    const nameStr = name.trim()
    const emailStr = email.trim()
    if (!nameStr) {
      toast({ variant: "destructive", title: "Name is required" })
      return
    }
    if (!emailStr) {
      toast({ variant: "destructive", title: "Email is required" })
      return
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
    if (!emailRe.test(emailStr)) {
      toast({ variant: "destructive", title: "Invalid email address" })
      return
    }
    if (saving) return
    setSaving(true)

    const loc = parseLocation(locationInput)

    try {
      await updateCustomer(customer.id, {
        name: nameStr,
        email: emailStr,
        phone: phone.trim() || undefined,
        tags,
        notes: notes.trim() || undefined,
        location: {
          city: loc.city || undefined,
          state: loc.state || undefined,
          postal: postal.trim() || undefined,
          country: country.trim()?.toUpperCase() || undefined,
        },
      })

      const healthPayload = {
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
      }
      await updateCustomerHealth(customer.id, healthPayload)

      const updated = await getCustomer(customer.id)
      toast({ title: "Profile updated" })
      onSaved(updated)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: String(e?.message ?? e) })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDeleted) return
    setDeleting(true)
    try {
      await deleteCustomer(customer.id)
      setDeleteOpen(false)
      toast({ title: "Customer deleted" })
      onDeleted()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: String(e?.message ?? e) })
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async () => {
    const next = customer.status === "active" ? "archived" : "active"
    if (saving) return
    setSaving(true)
    try {
      await updateCustomer(customer.id, { status: next })
      const updated = await getCustomer(customer.id)
      onSaved(updated)
      toast({ title: `Status set to ${next}` })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: String(e?.message ?? e) })
    } finally {
      setSaving(false)
    }
  }

  const calories = num(health.macroTargets?.calories) ?? 0
  const protein = num(health.macroTargets?.protein_g) ?? 0
  const carbs = num(health.macroTargets?.carbs_g) ?? 0
  const fat = num(health.macroTargets?.fat_g) ?? 0
  const totalMacro = protein * 4 + carbs * 4 + fat * 9
  const proteinPct = totalMacro > 0 ? Math.round((protein * 4 / totalMacro) * 100) : 0
  const carbsPct = totalMacro > 0 ? Math.round((carbs * 4 / totalMacro) * 100) : 0
  const fatPct = totalMacro > 0 ? Math.round((fat * 9 / totalMacro) * 100) : 0

  const getInitials = (n: string) => n.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2) || "?"

  return (
    <>
      {/* Header actions: Cancel + Save */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div />
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9] rounded-[8px]">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#00438f] hover:bg-[#003366] text-white rounded-[8px]">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-8">
        {/* Left column */}
        <div className="flex flex-col gap-8">
          {/* General Information */}
          <Card className={cardClass}>
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-[#64748b]" />
              <h2 className="text-[20px] font-bold text-[#0f172a]">General Information</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className={labelClass}>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <Label className={labelClass}>Email Address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <Label className={labelClass}>Phone</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <Label className={labelClass}>Location</Label>
                <Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="New York, NY" className={inputClass} />
              </div>
            </div>
          </Card>

          {/* Health Profile - always visible */}
          <Card className={cardClass}>
            <div className="flex items-center gap-2 mb-6">
              <Activity className="h-5 w-5 text-[#64748b]" />
              <h2 className="text-[20px] font-bold text-[#0f172a]">Health Profile</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col gap-2 p-4 bg-[#f8fafc] border border-[#f1f5f9] rounded-[12px]">
                <Label className={secondaryLabelClass}>Age</Label>
                <Input type="number" value={health.age ?? ""} onChange={(e) => handleHealthChange("age", e.target.value ? Number(e.target.value) : undefined)} placeholder="32" className="bg-transparent border-0 h-auto py-0 text-[20px] font-bold text-[#0f172a]" />
              </div>
              <div className="flex flex-col gap-2 p-4 bg-[#f8fafc] border border-[#f1f5f9] rounded-[12px]">
                <Label className={secondaryLabelClass}>Gender</Label>
                <select className="bg-transparent border-0 text-[20px] font-bold text-[#0f172a] w-full outline-none" value={health.gender ?? ""} onChange={(e) => handleHealthChange("gender", e.target.value || undefined)}>
                  <option value="">—</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="unspecified">Unspecified</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 p-4 bg-[#f8fafc] border border-[#f1f5f9] rounded-[12px]">
                <Label className={secondaryLabelClass}>Weight (kg)</Label>
                <Input type="number" value={health.weightKg ?? ""} onChange={(e) => handleHealthChange("weightKg", e.target.value ? Number(e.target.value) : undefined)} placeholder="68" className="bg-transparent border-0 h-auto py-0 text-[20px] font-bold text-[#0f172a]" />
              </div>
              <div className="flex flex-col gap-2 p-4 bg-[#f8fafc] border border-[#f1f5f9] rounded-[12px]">
                <Label className={secondaryLabelClass}>Height (cm)</Label>
                <Input type="number" value={health.heightCm ?? ""} onChange={(e) => handleHealthChange("heightCm", e.target.value ? Number(e.target.value) : undefined)} placeholder="172" className="bg-transparent border-0 h-auto py-0 text-[20px] font-bold text-[#0f172a]" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className={secondaryLabelClass}>Activity Level</Label>
                <select className={inputClass} value={health.activityLevel ?? ""} onChange={(e) => handleHealthChange("activityLevel", e.target.value || undefined)}>
                  <option value="">—</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="very">Very Active</option>
                  <option value="extra">Extra Active</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className={secondaryLabelClass}>Primary Goal</Label>
                <select className={inputClass} value={health.healthGoal ?? ""} onChange={(e) => handleHealthChange("healthGoal", e.target.value || undefined)}>
                  <option value="">—</option>
                  {healthGoalOptions.map((g) => (
                    <option key={g.code} value={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Diet & Macro Targets */}
          <Card className={cardClass}>
            <div className="flex items-center gap-2 mb-6">
              <Apple className="h-5 w-5 text-[#64748b]" />
              <h2 className="text-[20px] font-bold text-[#0f172a]">Diet & Macro Targets</h2>
            </div>
            <div className="space-y-6">
              <div>
                <Label className={labelClass} style={{ marginBottom: 8 }}>Dietary Approach</Label>
                <div className="flex flex-wrap gap-2">
                  {(health.dietGoals ?? []).map((code) => (
                    <span key={code} className="bg-[#00438f] text-white rounded-full px-3 py-1.5 text-[14px] font-medium flex items-center gap-1">
                      {getDietLabel(code)}
                      <button type="button" onClick={() => removeFromArray("dietGoals", code)} className="hover:opacity-80" aria-label={`Remove ${code}`}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  <select className="border border-[#e2e8f0] rounded-full px-3 py-1.5 text-[14px] text-[#64748b] bg-transparent" value={dietSelect} onChange={(e) => setDietSelect(e.target.value)}>
                    <option value="">Add preference…</option>
                    {dietOptions.map((d) => (
                      <option key={d.code} value={d.code}>{d.label}</option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={addDietGoal} className="border-dashed border-[#cbd5e1] text-[#64748b] rounded-full hover:bg-[#f8fafc]">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Tag
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className={secondaryLabelClass}>Protein (g)</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="number" value={health.macroTargets?.protein_g ?? ""} onChange={(e) => handleHealthChange("macroTargets", { ...(health.macroTargets || {}), protein_g: e.target.value ? Number(e.target.value) : undefined })} placeholder="140" className={inputClass} />
                    <span className="text-[16px] text-[#94a3b8]">{proteinPct}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className={secondaryLabelClass}>Carbohydrates (g)</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="number" value={health.macroTargets?.carbs_g ?? ""} onChange={(e) => handleHealthChange("macroTargets", { ...(health.macroTargets || {}), carbs_g: e.target.value ? Number(e.target.value) : undefined })} placeholder="45" className={inputClass} />
                    <span className="text-[16px] text-[#94a3b8]">{carbsPct}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className={secondaryLabelClass}>Fats (g)</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="number" value={health.macroTargets?.fat_g ?? ""} onChange={(e) => handleHealthChange("macroTargets", { ...(health.macroTargets || {}), fat_g: e.target.value ? Number(e.target.value) : undefined })} placeholder="120" className={inputClass} />
                    <span className="text-[16px] text-[#94a3b8]">{fatPct}%</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-[#f1f5f9] pt-6 flex items-center justify-between">
                <Label className={labelClass}>Daily Calorie Target</Label>
                <div className="flex gap-2 items-center">
                  <Input type="number" value={health.macroTargets?.calories ?? ""} onChange={(e) => handleHealthChange("macroTargets", { ...(health.macroTargets || {}), calories: e.target.value ? Number(e.target.value) : undefined })} placeholder="1820" className={`${inputClass} w-[128px] text-right font-black text-[#00438f]`} />
                  <span className="text-[16px] font-bold text-[#64748b]">kcal</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Profile Image */}
          <Card className={cardClass}>
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-[128px] w-[128px] rounded-full border-4 border-[#f8fafc] shadow-md">
                <AvatarImage src={customer.avatar} alt={customer.name} />
                <AvatarFallback className="bg-[#f1f5f9] text-[#00438f] text-3xl font-bold">
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-[12px] text-[#94a3b8] text-center">Click to upload new photo</p>
              <Button variant="link" className="text-[#00438f] font-bold text-[14px] h-auto p-0" onClick={handleStatusChange}>
                Change Member Status
              </Button>
            </div>
          </Card>

          {/* Restrictions */}
          <Card className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[#00438f]" />
                <h3 className="text-[18px] font-bold text-[#0f172a]">Restrictions</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAvoidSelect(allergenOptions[0]?.code ?? ""); addAvoid(); }}>
                <Plus className="h-5 w-5 text-[#00438f]" />
              </Button>
            </div>
            <div className="space-y-2 mb-4">
              <Select value={avoidSelect || undefined} onValueChange={setAvoidSelect}>
                <SelectTrigger className={`${inputClass} w-full justify-between`}>
                  <SelectValue placeholder="Add allergen…" />
                </SelectTrigger>
                <SelectContent side="bottom" align="start" className="max-h-[200px]">
                  {allergenOptions.map((a) => (
                    <SelectItem key={a.code} value={a.code}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={avoidCustomInput} onChange={(e) => setAvoidCustomInput(e.target.value)} placeholder="e.g. Peanuts" className={inputClass} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAvoid())} />
              <Button type="button" variant="outline" size="sm" onClick={addAvoid} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {(health.avoidAllergens ?? []).map((code) => (
                <div key={code} className="bg-[#fef2f2] text-[#991b1b] rounded-[8px] px-3 py-3 flex items-center justify-between">
                  <span className="font-medium text-[14px]">{getAllergenLabel(code)}</span>
                  <button type="button" onClick={() => removeFromArray("avoidAllergens", code)} className="hover:opacity-70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Conditions */}
          <Card className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-[#00438f]" />
                <h3 className="text-[18px] font-bold text-[#0f172a]">Conditions</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={addCondition}>
                <Plus className="h-5 w-5 text-[#00438f]" />
              </Button>
            </div>
            <div className="space-y-2 mb-4">
              <Select value={conditionSelect || undefined} onValueChange={setConditionSelect}>
                <SelectTrigger className={`${inputClass} w-full justify-between`}>
                  <SelectValue placeholder="Add condition…" />
                </SelectTrigger>
                <SelectContent side="bottom" align="start" className="max-h-[200px]">
                  {conditionOptions.map((c) => (
                    <SelectItem key={c.conditionCode} value={c.conditionCode}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={conditionCustomInput} onChange={(e) => setConditionCustomInput(e.target.value)} placeholder="Or type custom condition" className={inputClass} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCondition())} />
            </div>
            <div className="space-y-2">
              {(health.conditions ?? []).map((code) => (
                <div key={code} className="bg-[#fffbeb] text-[#92400e] rounded-[8px] px-3 py-3 flex items-center justify-between">
                  <span className="font-medium text-[14px]">{getConditionLabel(code)}</span>
                  <button type="button" onClick={() => removeFromArray("conditions", code)} className="hover:opacity-70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Internal Notes */}
          <Card className={cardClass}>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-[#64748b]" />
              <h3 className="text-[18px] font-bold text-[#0f172a]">Internal Notes</h3>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add internal notes..." className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] px-3 py-2 text-[14px] text-[#0f172a] placeholder:text-[#6b7280] w-full min-h-[99px] resize-y" />
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-8 mt-8 border-t border-[#e2e8f0]">
        <div>
          {onDeleted && (
            <Button variant="outline" onClick={() => setDeleteOpen(true)} className="border-red-600 text-red-600 hover:bg-red-50 rounded-[8px]">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9] rounded-[8px]">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#00438f] hover:bg-[#003366] text-white rounded-[8px]">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The customer and related data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={deleting}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" className="bg-red-600 hover:bg-red-700" disabled={deleting} onClick={handleDelete}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
