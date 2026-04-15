"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronRight, Mail, Phone, Activity, Apple, AlertTriangle, Stethoscope, ArrowLeft, FileText, Sparkles, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/backend"
import type { UICustomer } from "@/types/customer"
import CustomerNotesDialog from "./CustomerNotesDialog"

type Props = {
  customer: UICustomer
  onDeleted?: (id: string) => void
  onSaved?: (c: UICustomer) => void
}

const activityLabels: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Light",
  moderate: "Moderate",
  very: "Very Active",
  extra: "Extra Active",
}

export default function CustomerProfileDetailView({ customer, onDeleted, onSaved }: Props) {
  const router = useRouter()
  const [notesOpen, setNotesOpen] = React.useState(false)

  // Recommended Products (lazy-loaded on demand)
  const [recData, setRecData] = React.useState<any>(null)
  const [recLoading, setRecLoading] = React.useState(false)
  const [recLoaded, setRecLoaded] = React.useState(false)

  const fetchRecommendations = React.useCallback(async () => {
    if (recLoaded) return
    setRecLoading(true)
    try {
      const res = await apiFetch(`/api/v1/customers/${customer.id}/recommendations?limit=20`)
      const data = await res.json()
      setRecData(data)
    } catch {
      setRecData({ error: true })
    } finally {
      setRecLoading(false)
      setRecLoaded(true)
    }
  }, [customer.id, recLoaded])

  const hp = customer.healthProfile
  const restrictions = customer.restrictions ?? { required: [], preferred: [], allergens: [], conditions: [] }
  const allergens = restrictions.allergens ?? hp?.avoidAllergens ?? []
  const conditions = restrictions.conditions ?? hp?.conditions ?? []
  const dietGoals = hp?.dietGoals ?? restrictions.preferred ?? []
  const healthGoal = hp?.healthGoal
  const macro = hp?.macroTargets ?? {}

  const activityDisplay = hp?.activityLevel
    ? activityLabels[hp.activityLevel] ?? hp.activityLevel
    : "—"

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"

  return (
    <div className="bg-[#f5f7f8] min-h-full">
      {/* Header: Back + Breadcrumbs + Actions */}
      <div className="border-b border-[#e2e8f0] bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
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
              <span className="font-medium text-[#0f172a]">{customer.name}</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
              onClick={() => setNotesOpen(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </Button>
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
              asChild
            >
              <Link href={`/customers/${customer.id}/edit`}>
                Edit Profile
              </Link>
            </Button>
            <Button
              className="bg-primary hover:bg-[#003366] text-white"
              onClick={() => router.push(`/customers/${customer.id}/matches`)}
            >
              Match Products
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Summary Card - 96px avatar, 24px name per Figma */}
      <div className="px-6 -mt-6">
        <Card className="border-[#e2e8f0] shadow-sm overflow-hidden bg-white">
          <div className="flex items-center gap-6 p-6">
            <div className="relative shrink-0">
              <Avatar className="h-[96px] w-[96px] rounded-full border-4 border-white ring-2 ring-[#e2e8f0]">
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
              <h1 className="text-2xl font-bold text-[#0f172a] leading-tight">{customer.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-1">
                <span className="flex items-center gap-1.5 text-sm text-[#64748b]">
                  <Mail className="h-4 w-4" />
                  {customer.email}
                </span>
                {customer.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-[#64748b]">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </span>
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

      {/* Main Content */}
      <div className="p-6 space-y-8 w-full">
        {/* Health Profile section - cards (Age, Weight, Height, etc.) per Figma */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-[#0f172a]">Health Profile</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-4">
            {[
              { label: "Age", value: hp?.age ?? "—" },
              { label: "Gender", value: hp?.gender ?? "—" },
              { label: "Activity", value: activityDisplay },
              { label: "Height", value: hp?.heightCm != null ? `${hp.heightCm} cm` : "—" },
              { label: "Weight", value: hp?.weightKg != null ? `${hp.weightKg} kg` : "—" },
              { label: "BMI", value: hp?.bmi ?? "—" },
              { label: "BMR", value: hp?.bmr ?? "—" },
            ].map(({ label, value }) => (
              <Card
                key={label}
                className="p-4 border-[#e2e8f0] rounded-xl bg-white shadow-sm min-h-0 overflow-hidden"
              >
                <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider truncate">
                  {label}
                </p>
                <p className="text-[20px] font-semibold text-primary mt-1 truncate">{String(value)}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Diet & Macros + Restrictions */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Diet & Macros */}
          <div className="lg:col-span-2">
            <Card className="p-6 border-[rgba(0,67,143,0.1)] rounded-xl shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Apple className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-[#0f172a]">Diet & Macros</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">
                    Dietary Goals
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {healthGoal && (
                      <span
                        className="px-3 py-1.5 rounded-lg bg-[rgba(0,67,143,0.15)] text-primary text-sm font-semibold"
                      >
                        {healthGoal}
                      </span>
                    )}
                    {dietGoals.length > 0 ? (
                      dietGoals.map((g) => (
                        <span
                          key={g}
                          className="px-3 py-1.5 rounded-lg bg-[rgba(0,67,143,0.1)] text-primary text-sm font-medium"
                        >
                          {g}
                        </span>
                      ))
                    ) : !healthGoal && (
                      <span className="text-sm text-[#94a3b8]">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">
                    Macro Targets
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Calories", value: macro.calories, unit: "kcal", color: "var(--primary)" },
                      { label: "Protein", value: macro.protein_g, unit: "g", color: "#3b82f6" },
                      { label: "Carbs", value: macro.carbs_g, unit: "g", color: "#22c55e" },
                      { label: "Fat", value: macro.fat_g, unit: "g", color: "#f97316" },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#94a3b8]">{label}</span>
                          <span className="font-bold text-[#0f172a]">
                            {value != null ? `${value} ${unit}` : "—"}
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#f1f5f9] rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: value != null && value > 0 ? "75%" : "0%",
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Restrictions & Conditions */}
          <div>
            <Card className="p-6 border-[rgba(0,67,143,0.1)] rounded-xl shadow-sm h-fit">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-[#0f172a]">Dietary Restrictions</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
                    AVOID ALLERGENS
                  </p>
                  {allergens.length > 0 ? (
                    <div className="space-y-2">
                      {allergens.map((a) => (
                        <div
                          key={a}
                          className="flex items-center gap-2 p-3 rounded-lg bg-[#fff7ed] border border-[#fed7aa]"
                        >
                          <AlertTriangle className="h-4 w-4 text-[#c2410c] shrink-0" />
                          <span className="font-bold text-[#c2410c]">{a}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#94a3b8]">None</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                      Medical Conditions
                    </p>
                  </div>
                  {conditions.length > 0 ? (
                    <div className="space-y-3">
                      {conditions.map((c) => (
                        <div
                          key={c}
                          className="p-4 rounded-lg border border-[#e2e8f0]"
                        >
                          <p className="font-bold text-[#0f172a]">{c}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#94a3b8]">None</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Recommended Products Section */}
      <div className="px-6 pb-6">
        <Card className="p-6 border-[rgba(0,67,143,0.1)] rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-[#0f172a]">Recommended Products</h2>
            </div>
            {!recLoaded && (
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/10"
                onClick={fetchRecommendations}
                disabled={recLoading}
              >
                {recLoading ? "Loading..." : "Load Recommendations"}
              </Button>
            )}
          </div>

          {!recLoaded && !recLoading && (
            <p className="text-sm text-[#94a3b8]">Click to load AI-powered product recommendations for this customer.</p>
          )}

          {recLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          )}

          {recLoaded && recData?.error && (
            <div className="flex items-center gap-3 text-[#64748b] py-4">
              <Package className="h-8 w-8 opacity-30" />
              <div>
                <p className="font-medium">Recommendation engine unavailable</p>
                <p className="text-sm">The AI service is offline or not configured.</p>
              </div>
            </div>
          )}

          {recLoaded && !recData?.error && (!recData?.products || recData.products.length === 0) && (
            <p className="text-sm text-[#94a3b8] py-4">No recommendations available for this customer.</p>
          )}

          {recLoaded && !recData?.error && recData?.products?.length > 0 && (
            <div className="space-y-3">
              {recData.products.map((p: any) => (
                <div key={p.id} className="flex items-start gap-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4">
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#0f172a] truncate">{p.name ?? "—"}</p>
                    <p className="text-sm text-[#64748b]">{p.brand ?? ""}</p>
                    {p.reasons && p.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.reasons.slice(0, 3).map((r: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {p.score !== undefined && (
                      <span className="text-sm font-bold text-primary">{Math.round((p.score ?? 0) * 100)}%</span>
                    )}
                    {p.calories !== undefined && (
                      <p className="text-xs text-[#94a3b8] mt-0.5">{p.calories} kcal</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <CustomerNotesDialog
        open={notesOpen}
        customerId={customer.id}
        customerName={customer.name}
        onOpenChange={setNotesOpen}
      />
    </div>
  )
}
