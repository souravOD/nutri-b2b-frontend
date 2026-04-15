"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCustomerWithHealth } from "@/lib/api-customers"
import { listDiets, listAllergens, listConditions, listHealthGoals } from "@/lib/api-taxonomy"
import { useToast } from "@/hooks/use-toast"
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react"

type DietOption = { code: string; label: string }
type ConditionOption = { conditionCode: string; label: string }
type AllergenOption = { code: string; label: string }

type Props = {
  onClose?: () => void
  onCreated?: (result: any) => void
}

const labelClass = "text-[14px] font-semibold text-[#334155]"
const secondaryLabelClass = "text-[12px] font-semibold text-[#64748b] uppercase"
const inputClass = "border border-[#e2e8f0] rounded-[8px] h-[42px] px-3 text-[16px] text-[#0f172a] placeholder:text-[#6b7280]"

export default function CustomerForm({ onClose, onCreated }: Props) {
  const { toast } = useToast()

  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState("")
  const [city, setCity] = React.useState("")
  const [state, setState] = React.useState("")
  const [postal, setPostal] = React.useState("")
  const [country, setCountry] = React.useState("")

  const [preferred, setPreferred] = React.useState<string[]>([])
  const [avoid, setAvoid] = React.useState<string[]>([])
  const [preferredSelect, setPreferredSelect] = React.useState("")
  const [preferredCustomInput, setPreferredCustomInput] = React.useState("")
  const [avoidSelect, setAvoidSelect] = React.useState("")
  const [avoidCustomInput, setAvoidCustomInput] = React.useState("")

  const [showHealth, setShowHealth] = React.useState(false)
  const [showLocation, setShowLocation] = React.useState(false)
  const [age, setAge] = React.useState<number | "">("")
  const [gender, setGender] = React.useState<"male"|"female"|"other"|"unspecified"|"">("")
  const [activity, setActivity] = React.useState<"sedentary"|"light"|"moderate"|"very"|"extra"|"">("")
  const [height, setHeight] = React.useState<number | "">("")
  const [weight, setWeight] = React.useState<number | "">("")
  const [conditions, setConditions] = React.useState<string[]>([])
  const [conditionSelect, setConditionSelect] = React.useState("")
  const [conditionCustomInput, setConditionCustomInput] = React.useState("")
  const [protein, setProtein] = React.useState<number | "">("")
  const [carbs, setCarbs] = React.useState<number | "">("")
  const [fat, setFat] = React.useState<number | "">("")
  const [calories, setCalories] = React.useState<number | "">("")
  const [saving, setSaving] = React.useState(false)

  const [dietOptions, setDietOptions] = React.useState<DietOption[]>([])
  const [allergenOptions, setAllergenOptions] = React.useState<AllergenOption[]>([])
  const [conditionOptions, setConditionOptions] = React.useState<ConditionOption[]>([])
  const [healthGoalOptions, setHealthGoalOptions] = React.useState<{ code: string; label: string }[]>([])
  const [healthGoal, setHealthGoal] = React.useState("")

  React.useEffect(() => {
    Promise.all([
      listDiets(5000, true),
      listAllergens(5000, true),
      listConditions(5000, true),
      listHealthGoals(),
    ]).then(([diets, allergens, conds, goals]) => {
      setDietOptions((diets as any[]) ?? [])
      setAllergenOptions((allergens as any[]) ?? [])
      setConditionOptions((conds as any[]) ?? [])
      setHealthGoalOptions((goals as any[]) ?? [])
    }).catch((e) => {
      toast({ variant: "destructive", title: "Could not load dietary options", description: String(e?.message ?? e) })
    })
  }, [toast])

  const addTag = () => {
    const v = tagInput.trim()
    if (!v) return
    setTags((prev) => Array.from(new Set([...prev, v])))
    setTagInput("")
  }

  const addPreferred = () => {
    const v = preferredSelect.trim() || preferredCustomInput.trim()
    if (!v) return
    setPreferred((p) => Array.from(new Set([...p, v])))
    setPreferredSelect("")
    setPreferredCustomInput("")
  }

  const addAvoid = () => {
    const v = avoidSelect.trim() || avoidCustomInput.trim()
    if (!v) return
    setAvoid((p) => Array.from(new Set([...p, v])))
    setAvoidSelect("")
    setAvoidCustomInput("")
  }

  const addCondition = () => {
    const v = conditionSelect.trim() || conditionCustomInput.trim()
    if (!v) return
    setConditions((p) => Array.from(new Set([...p, v])))
    setConditionSelect("")
    setConditionCustomInput("")
  }

  const num = (v: number | "") => (v === "" ? undefined : Number(v))

  const handleSubmit = async () => {
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
    const phoneStr = phone.trim()
    if (phoneStr) {
      const phoneRe = /^[+]?([0-9][\s-]?){7,15}$/
      if (!phoneRe.test(phoneStr)) {
        toast({ variant: "destructive", title: "Invalid phone number" })
        return
      }
    }
    if (saving) return
    setSaving(true)

    const healthProvided =
      age !== "" || gender || activity || height !== "" || weight !== "" ||
      preferred.length || avoid.length || conditions.length ||
      healthGoal || protein !== "" || carbs !== "" || fat !== "" || calories !== ""

    const payload: any = {
      fullName: nameStr,
      email: emailStr,
      phone: phoneStr || undefined,
      customTags: tags,
      location: (city.trim() || state.trim() || postal.trim() || country.trim())
        ? { city: city.trim() || undefined, state: state.trim() || undefined, postal: postal.trim() || undefined, country: country.trim()?.toUpperCase() || undefined }
        : undefined,
      health: healthProvided ? {
        age: age === "" ? undefined : Number(age),
        gender: gender || undefined,
        activityLevel: activity || undefined,
        heightCm: height === "" ? undefined : Number(height),
        weightKg: weight === "" ? undefined : Number(weight),
        healthGoal: healthGoal.trim() || undefined,
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
    }

    try {
      const created = await createCustomerWithHealth(payload)
      toast({ title: "Customer created" })
      onCreated?.(created)
      onClose?.()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Create failed", description: String(e?.message ?? e) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-[24px] border border-[#e2e8f0] rounded-xl bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <div className="flex flex-col gap-6">
        {/* Basic Info - 2x2 grid per Figma */}
        <div className="space-y-4">
          <h3 className={`${labelClass} border-b border-[#e2e8f0] pb-2`}>General Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-[6px]">
              <Label className={labelClass}>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputClass} />
            </div>
            <div className="flex flex-col gap-[6px]">
              <Label className={labelClass}>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={inputClass} />
            </div>
            <div className="flex flex-col gap-[6px]">
              <Label className={labelClass}>Phone</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputClass} />
            </div>
            <div className="flex flex-col gap-[6px]">
              <Label className={labelClass}>Tags</Label>
              <div className="bg-white border border-[#e2e8f0] rounded-[8px] min-h-[46px] px-2 py-2 flex flex-wrap items-center gap-2">
                {tags.map((t) => (
                  <span key={t} className="bg-[rgba(0,67,143,0.1)] rounded px-2 py-1 text-primary text-[12px] font-semibold flex items-center gap-1">
                    {t}
                    <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:opacity-70" aria-label={`Remove ${t}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add a tag" className="border-0 h-8 px-2 py-1 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
                  <Button type="button" onClick={addTag} size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full text-primary hover:bg-[rgba(0,67,143,0.1)]">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location - Collapsible */}
        <div className="border border-[#f1f5f9] rounded-xl overflow-hidden">
          <button
            type="button"
            className="w-full bg-[#f8fafc] flex items-center justify-between px-4 py-3 text-left"
            onClick={() => setShowLocation((s) => !s)}
          >
            <span className="text-[16px] font-bold text-[#1e293b]">Location (Optional)</span>
            {showLocation ? <ChevronUp className="h-5 w-5 text-[#64748b]" /> : <ChevronDown className="h-5 w-5 text-[#64748b]" />}
          </button>
          {showLocation && (
            <div className="bg-white p-4 border-t border-[#f1f5f9]">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-[6px]">
                  <Label className={secondaryLabelClass}>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={inputClass} />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label className={secondaryLabelClass}>State / Region</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className={inputClass} />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label className={secondaryLabelClass}>Postal Code</Label>
                  <Input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="Postal" className={inputClass} />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label className={secondaryLabelClass}>Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className={inputClass} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dietary Section - Goals, Preferred, Must-avoid */}
        <div className="space-y-4">
          <h3 className={`${labelClass} border-b border-[#e2e8f0] pb-2`}>Dietary Restrictions</h3>

          <div className="flex flex-col gap-[6px]">
            <Label className={labelClass}>Dietary Goals</Label>
            <select className={`${inputClass} w-full`} value={healthGoal} onChange={(e) => setHealthGoal(e.target.value)}>
              <option value="">Choose a dietary goal…</option>
              {healthGoalOptions.map((g) => (
                <option key={g.code} value={g.label}>{g.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-[6px]">
            <Label className={labelClass}>Preferred (diet preferences)</Label>
            <div className="flex gap-2">
              <select className={`${inputClass} w-[208px] shrink-0`} value={preferredSelect} onChange={(e) => setPreferredSelect(e.target.value)}>
                <option value="">Choose preference…</option>
                {dietOptions.map((d) => (
                  <option key={d.code} value={d.code}>{d.label}</option>
                ))}
              </select>
              <Input value={preferredCustomInput} onChange={(e) => setPreferredCustomInput(e.target.value)} placeholder="e.g. Keto, Mediterranean" className={`${inputClass} flex-1`} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPreferred())} />
              <Button type="button" onClick={addPreferred} size="icon" className="h-[42px] w-[42px] shrink-0 bg-[#f1f5f9] border border-[#e2e8f0] hover:bg-[#e2e8f0] rounded-[8px]">
                <Plus className="h-4 w-4 text-[#0f172a]" />
              </Button>
            </div>
            {preferred.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {preferred.map((code) => (
                  <span key={code} className="bg-[rgba(0,67,143,0.1)] rounded px-2 py-1 text-primary text-[12px] font-semibold flex items-center gap-1">
                    {dietOptions.find((d) => d.code === code)?.label ?? code}
                    <button type="button" onClick={() => setPreferred(preferred.filter((x) => x !== code))} className="hover:opacity-70" aria-label={`Remove ${code}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[6px]">
            <Label className={labelClass}>Must-avoid (allergens)</Label>
            <div className="flex gap-2">
              <select className={`${inputClass} w-[208px] shrink-0`} value={avoidSelect} onChange={(e) => setAvoidSelect(e.target.value)}>
                <option value="">Must-avoid</option>
                {allergenOptions.map((a) => (
                  <option key={a.code} value={a.code}>{a.label}</option>
                ))}
              </select>
              <Input value={avoidCustomInput} onChange={(e) => setAvoidCustomInput(e.target.value)} placeholder="e.g. Peanuts" className={`${inputClass} flex-1`} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAvoid())} />
              <Button type="button" onClick={addAvoid} size="icon" className="h-[42px] w-[42px] shrink-0 bg-[#f1f5f9] border border-[#e2e8f0] hover:bg-[#e2e8f0] rounded-[8px]">
                <Plus className="h-4 w-4 text-[#0f172a]" />
              </Button>
            </div>
            {avoid.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {avoid.map((code) => (
                  <span key={code} className="bg-[#fff7ed] border border-[#fed7aa] rounded px-2 py-1 text-[#c2410c] text-[12px] font-semibold flex items-center gap-1">
                    {allergenOptions.find((a) => a.code === code)?.label ?? code}
                    <button type="button" onClick={() => setAvoid(avoid.filter((x) => x !== code))} className="hover:opacity-70" aria-label={`Remove ${code}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Health Profile - Collapsible */}
        <div className="border border-[#f1f5f9] rounded-xl overflow-hidden">
          <button
            type="button"
            className="w-full bg-[#f8fafc] flex items-center gap-2 px-4 py-3 text-left"
            onClick={() => setShowHealth((s) => !s)}
          >
            <span className="text-[16px] font-bold text-[#1e293b]">Health Profile</span>
            <span className="text-[12px] font-medium text-[#94a3b8]">(Optional)</span>
            {showHealth ? <ChevronUp className="h-5 w-5 text-[#64748b] ml-auto" /> : <ChevronDown className="h-5 w-5 text-[#64748b] ml-auto" />}
          </button>
          {showHealth && (
            <div className="bg-white p-4 border-t border-[#f1f5f9] space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-[6px]">
                  <Label className={secondaryLabelClass}>Age</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} placeholder="25" className={inputClass} />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label className={secondaryLabelClass}>Gender</Label>
                  <select className={`${inputClass} w-full`} value={gender} onChange={(e) => setGender(e.target.value as any)}>
                    <option value="">—</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                    <option value="unspecified">Unspecified</option>
                  </select>
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label className={secondaryLabelClass}>Activity Level</Label>
                  <select className={`${inputClass} w-full`} value={activity} onChange={(e) => setActivity(e.target.value as any)}>
                    <option value="">—</option>
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="very">Very Active</option>
                    <option value="extra">Extra Active</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-[6px]">
                  <Label className={secondaryLabelClass}>Height (cm)</Label>
                  <Input type="number" value={height} onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="175" className={inputClass} />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <Label className={secondaryLabelClass}>Weight (kg)</Label>
                  <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="70" className={inputClass} />
                </div>
              </div>
              <div className="flex flex-col gap-[6px]">
                <Label className={secondaryLabelClass}>Conditions</Label>
                <div className="flex gap-2">
                  <select className={`${inputClass} flex-1 min-w-0`} value={conditionSelect} onChange={(e) => setConditionSelect(e.target.value)}>
                    <option value="">Choose condition…</option>
                    {conditionOptions.map((c) => (
                      <option key={c.conditionCode} value={c.conditionCode}>{c.label}</option>
                    ))}
                  </select>
                  <Input value={conditionCustomInput} onChange={(e) => setConditionCustomInput(e.target.value)} placeholder="Add health condition" className={`${inputClass} flex-1`} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCondition())} />
                  <Button type="button" onClick={addCondition} size="icon" className="h-[42px] w-[42px] shrink-0 bg-[rgba(0,67,143,0.05)] border border-[rgba(0,67,143,0.2)] hover:bg-[rgba(0,67,143,0.1)] rounded-[8px]">
                    <Plus className="h-4 w-4 text-primary" />
                  </Button>
                </div>
                {conditions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {conditions.map((code) => (
                      <span key={code} className="bg-[rgba(0,67,143,0.1)] rounded px-2 py-1 text-primary text-[12px] font-semibold flex items-center gap-1">
                        {conditionOptions.find((c) => c.conditionCode === code)?.label ?? code}
                        <button type="button" onClick={() => setConditions(conditions.filter((x) => x !== code))} className="hover:opacity-70" aria-label={`Remove ${code}`}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-[#f1f5f9] pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[14px] font-bold text-[#1e293b]">Macro Targets</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex flex-col gap-[6px]">
                    <Label className={secondaryLabelClass}>Protein (g)</Label>
                    <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value === "" ? "" : Number(e.target.value))} placeholder="150" className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    <Label className={secondaryLabelClass}>Carbs (g)</Label>
                    <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value === "" ? "" : Number(e.target.value))} placeholder="200" className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    <Label className={secondaryLabelClass}>Fat (g)</Label>
                    <Input type="number" value={fat} onChange={(e) => setFat(e.target.value === "" ? "" : Number(e.target.value))} placeholder="70" className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    <Label className={secondaryLabelClass}>Calories</Label>
                    <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value === "" ? "" : Number(e.target.value))} placeholder="2000" className={inputClass} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[#e2e8f0]">
          <Button variant="outline" onClick={onClose} className="border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9] rounded-[8px]">Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-[#003366] text-white rounded-[8px]">
            {saving ? "Adding…" : "Add Customer"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
