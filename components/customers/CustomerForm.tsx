"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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

export default function CustomerForm({ onClose, onCreated }: Props) {
  const { toast } = useToast()

  // Basic customer
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState("")

  // Dietary restrictions (your modal already has these)
  const [preferred, setPreferred] = React.useState<string[]>([])        // -> dietGoals (codes)
  const [avoid, setAvoid] = React.useState<string[]>([])               // -> avoidAllergens (codes)
  const [preferredSelect, setPreferredSelect] = React.useState("")     // selected diet code
  const [avoidSelect, setAvoidSelect] = React.useState("")              // selected allergen code

  // Health (optional)
  const [showHealth, setShowHealth] = React.useState(false)
  const [age, setAge] = React.useState<number | "">("")
  const [gender, setGender] = React.useState<"male"|"female"|"other"|"unspecified"|"">("")
  const [activity, setActivity] = React.useState<"sedentary"|"light"|"moderate"|"very"|"extra"|"">("")
  const [height, setHeight] = React.useState<number | "">("")
  const [weight, setWeight] = React.useState<number | "">("")
  const [conditions, setConditions] = React.useState<string[]>([])  // condition codes
  const [conditionSelect, setConditionSelect] = React.useState("")
  const [conditionCustomInput, setConditionCustomInput] = React.useState("")  // for adding new condition not in list
  // const [bmi, setBmi] = React.useState<number | "">("")
  // const [bmr, setBmr] = React.useState<number | "">("")
  // const [tdee, setTdee] = React.useState<number | "">("")
  const [protein, setProtein] = React.useState<number | "">("")
  const [carbs, setCarbs] = React.useState<number | "">("")
  const [fat, setFat] = React.useState<number | "">("")
  const [calories, setCalories] = React.useState<number | "">("")
  const [saving, setSaving] = React.useState(false);

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
    ]).then(([diets, allergens, conditions, goals]) => {
      setDietOptions((diets as any[]) ?? [])
      setAllergenOptions((allergens as any[]) ?? [])
      setConditionOptions((conditions as any[]) ?? [])
      setHealthGoalOptions((goals as any[]) ?? [])
    }).catch((e) => {
      toast({ variant: "destructive", title: "Could not load dietary options", description: String(e?.message ?? e) });
      console.warn("[CustomerForm] Taxonomy fetch failed:", e);
    })
  }, [toast])

  const addTag = () => {
    const v = tagInput.trim()
    if (!v) return
    setTags((prev) => Array.from(new Set([...prev, v])))
    setTagInput("")
  }

  const addPreferred = () => {
    const v = preferredSelect.trim()
    if (!v) return
    setPreferred((p) => Array.from(new Set([...p, v])))
    setPreferredSelect("")
  }

  const addAvoid = () => {
    const v = avoidSelect.trim()
    if (!v) return
    setAvoid((p) => Array.from(new Set([...p, v])))
    setAvoidSelect("")
  }

  const addCondition = () => {
    const fromSelect = conditionSelect.trim()
    const fromCustom = conditionCustomInput.trim()
    const v = fromSelect || fromCustom
    if (!v) return
    setConditions((p) => Array.from(new Set([...p, v])))
    setConditionSelect("")
    setConditionCustomInput("")
  }

  const num = (v: number | "" ) => (v === "" ? undefined : Number(v))

  const handleSubmit = async () => {
    const nameStr = name.trim();
    const emailStr = email.trim();
    if (!nameStr) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    if (!emailStr) {
      toast({ variant: "destructive", title: "Email is required" });
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!emailRe.test(emailStr)) {
      toast({ variant: "destructive", title: "Invalid email address" });
      return;
    }
    const phoneStr = phone.trim();
    if (phoneStr) {
      const phoneRe = /^[+]?([0-9][\s-]?){7,15}$/; // allows +, spaces and dashes
      if (!phoneRe.test(phoneStr)) {
        toast({ variant: "destructive", title: "Invalid phone number" });
        return;
      }
    }
    if (saving) return;                    // 🔒 guard against double fire
    setSaving(true);

    // decide if any health fields were provided
    const healthProvided =
      age !== "" || gender || activity || height !== "" || weight !== "" ||
      preferred.length || avoid.length || conditions.length ||
      healthGoal || protein !== "" || carbs !== "" || fat !== "" || calories !== "";

    // build payload ONCE with backend field names
    const payload: any = {
      fullName: name.trim(),               // ⬅️ was "name"
      email: email.trim(),
      phone: phone.trim() || undefined,
      customTags: tags,                    // ⬅️ was "tags"
      health: healthProvided ? {
        age:        (age === "" ? undefined : Number(age)),
        gender:     (gender || undefined),
        activityLevel: (activity || undefined),  // ⬅️ activityLevel key
        heightCm:   (height === "" ? undefined : Number(height)),
        weightKg:   (weight === "" ? undefined : Number(weight)),
        healthGoal: healthGoal.trim() || undefined,
        conditions,
        dietGoals:      preferred,
        avoidAllergens: avoid,
        macroTargets: {
          protein_g: (protein === "" ? undefined : Number(protein)),
          carbs_g:   (carbs   === "" ? undefined : Number(carbs)),
          fat_g:     (fat     === "" ? undefined : Number(fat)),
          calories:  (calories=== "" ? undefined : Number(calories)),
        },
      } : undefined,
    };

    try {
      const created = await createCustomerWithHealth(payload);   // ✅ exactly ONE call
      toast({ title: "Customer created" });
      onCreated?.(created);
      onClose?.();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Create failed", description: String(e?.message ?? e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 space-y-6 border-[#e2e8f0] bg-white">
      {/* Two-column layout: General Information | Health Profile per Figma */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: General Information */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-[#0f172a] border-b border-[#e2e8f0] pb-2">General Information</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-[#0f172a]">Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter customer name" className="border-[#e2e8f0] mt-1" />
            </div>
            <div>
              <Label className="text-[#0f172a]">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email address" className="border-[#e2e8f0] mt-1" />
            </div>
            <div>
              <Label className="text-[#0f172a]">Phone</Label>
              <Input type="tel" inputMode="tel" pattern="^[+]?([0-9][\\s-]?){7,15}$" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" className="border-[#e2e8f0] mt-1" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="text-[#0f172a]">Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add a tag" className="border-[#e2e8f0]" />
              <Button type="button" onClick={addTag} className="bg-[#00438f] hover:bg-[#003366] text-white"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1 bg-[#f1f5f9] text-[#00438f]">
                  {t}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    className="inline-flex items-center justify-center rounded-sm hover:bg-[#e2e8f0]/50"
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Health Profile */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-[#0f172a] border-b border-[#e2e8f0] pb-2">Health Profile</h3>
          {/* Dietary Goals (health_goal) + Dietary Preferences (Preferred / Avoid) */}
          <div>
        <Label className="text-[#0f172a]">Dietary Goals</Label>
        <select
          className="border border-[#e2e8f0] rounded px-2 h-9 w-full mt-1"
          value={healthGoal}
          onChange={(e) => setHealthGoal(e.target.value)}
        >
          <option value="">Choose a dietary goal…</option>
          {healthGoalOptions.map((g) => (
            <option key={g.code} value={g.label}>{g.label}</option>
          ))}
        </select>
      </div>
      <div>
        <Label className="text-[#0f172a]">Dietary Preferences</Label>
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-[#64748b] w-20 shrink-0">Preferred</span>
            <select
              className="border rounded px-2 h-9 flex-1 min-w-0"
              value={preferredSelect}
              onChange={(e) => setPreferredSelect(e.target.value)}
            >
              <option value="">Choose a preference…</option>
              {dietOptions.map((d) => (
                <option key={d.code} value={d.code}>{d.label}</option>
              ))}
            </select>
            <Button type="button" onClick={addPreferred} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-[#64748b] w-20 shrink-0">Avoid</span>
            <select
              className="border rounded px-2 h-9 flex-1 min-w-0"
              value={avoidSelect}
              onChange={(e) => setAvoidSelect(e.target.value)}
            >
              <option value="">Choose allergen to avoid…</option>
              {allergenOptions.map((a) => (
                <option key={a.code} value={a.code}>{a.label}</option>
              ))}
            </select>
            <Button type="button" onClick={addAvoid} size="icon" variant="secondary"><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm text-[#64748b] w-20 shrink-0">Conditions</span>
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
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {preferred.map((code) => (
            <Badge key={`p-${code}`} variant="secondary" className="gap-1">
              {dietOptions.find((d) => d.code === code)?.label ?? code}
              <button
                type="button"
                onClick={() => setPreferred(preferred.filter((x) => x !== code))}
                className="inline-flex items-center justify-center rounded-sm hover:bg-muted/50"
                aria-label={`Remove ${code}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {avoid.map((code) => (
            <Badge key={`a-${code}`} variant="destructive" className="gap-1">
              {allergenOptions.find((a) => a.code === code)?.label ?? code}
              <button
                type="button"
                onClick={() => setAvoid(avoid.filter((x) => x !== code))}
                className="inline-flex items-center justify-center rounded-sm hover:bg-muted/50"
                aria-label={`Remove ${code}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {conditions.map((code) => (
            <Badge key={`c-${code}`} variant="secondary" className="gap-1">
              {conditionOptions.find((c) => c.conditionCode === code)?.label ?? code}
              <button
                type="button"
                onClick={() => setConditions(conditions.filter((x) => x !== code))}
                className="inline-flex items-center justify-center rounded-sm hover:bg-muted/50"
                aria-label={`Remove ${code}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Health Profile (optional) - Age, Gender, Activity, etc. */}
      <div className="mt-4">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-[#0f172a] hover:text-[#00438f]"
          onClick={() => setShowHealth((s) => !s)}
        >
          {showHealth ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Additional Health Details (optional)
        </button>

        {showHealth && (
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-[#0f172a]">Age</Label>
                <Input type="number" value={age} onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))} className="border-[#e2e8f0]" />
              </div>
              <div>
                <Label className="text-[#0f172a]">Gender</Label>
                <select className="border border-[#e2e8f0] rounded h-9 w-full px-2" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                  <option value="">—</option>
                  <option value="female">female</option>
                  <option value="male">male</option>
                  <option value="other">other</option>
                  <option value="unspecified">unspecified</option>
                </select>
              </div>
              <div>
                <Label className="text-[#0f172a]">Activity Level</Label>
                <select className="border border-[#e2e8f0] rounded h-9 w-full px-2" value={activity} onChange={(e) => setActivity(e.target.value as any)}>
                  <option value="">—</option>
                  <option value="sedentary">sedentary</option>
                  <option value="light">light</option>
                  <option value="moderate">moderate</option>
                  <option value="very">very</option>
                  <option value="extra">extra</option>
                </select>
              </div>
              <div>
                <Label className="text-[#0f172a]">Height (cm)</Label>
                <Input type="number" value={height} onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))} className="border-[#e2e8f0]" />
              </div>
              <div>
                <Label className="text-[#0f172a]">Weight (kg)</Label>
                <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} className="border-[#e2e8f0]" />
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
              <Label className="mb-2 block text-[#0f172a]">Macro Targets</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-[#0f172a]">Protein (g)</Label>
                  <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value === "" ? "" : Number(e.target.value))} className="border-[#e2e8f0]" />
                </div>
                <div>
                  <Label className="text-[#0f172a]">Carbs (g)</Label>
                  <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value === "" ? "" : Number(e.target.value))} className="border-[#e2e8f0]" />
                </div>
                <div>
                  <Label className="text-[#0f172a]">Fat (g)</Label>
                  <Input type="number" value={fat} onChange={(e) => setFat(e.target.value === "" ? "" : Number(e.target.value))} className="border-[#e2e8f0]" />
                </div>
                <div>
                  <Label className="text-[#0f172a]">Calories</Label>
                  <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value === "" ? "" : Number(e.target.value))} className="border-[#e2e8f0]" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>

      {/* Footer - Cancel + Add Customer */}
      <div className="flex justify-end gap-2 pt-4 border-t border-[#e2e8f0]">
        <Button variant="outline" onClick={onClose} className="border-[#e2e8f0] text-[#64748b] hover:bg-[#f1f5f9]">Cancel</Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="bg-[#00438f] hover:bg-[#003366] text-white"
        >
          {saving ? "Adding…" : "Add Customer"}
        </Button>
      </div>
    </Card>
  )
}
