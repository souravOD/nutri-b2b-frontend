"use client"

import * as React from "react"
import AppShell from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/backend"
import { useToast } from "@/hooks/use-toast"
import { trackEvent } from "@/lib/analytics"
import {
  FlaskConical, GitBranch, Loader2, Megaphone, MinusCircle, Pencil, Plus,
  Send, SlidersHorizontal, Trash2, Users, X,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"

// ── Types ─────────────────────────────────────────────────────────────────────
type Campaign = {
  id: string
  name: string
  target_segment: string
  subject: string
  message: string
  status: "draft" | "active" | "sent"
  sent_at: string | null
  created_at: string
  recipient_count: number | null
  ab_test_enabled: boolean
  subject_b: string | null
  message_b: string | null
}

type SegmentRule = {
  field: string
  op: string
  value: string
}

type Segment = {
  id: string
  name: string
  description: string | null
  logic: "AND" | "OR"
  rules: SegmentRule[]
  member_count: number | null
  created_at: string
}

// ── Field definitions for the rule builder ────────────────────────────────────
type FieldDef = {
  label: string
  type: "string_enum" | "string" | "number" | "date" | "bool_enum"
  ops: { value: string; label: string }[]
  values?: { value: string; label: string }[]
}

const FIELD_DEFS: Record<string, FieldDef> = {
  account_status: {
    label: "Account Status",
    type: "string_enum",
    ops: [{ value: "eq", label: "is" }, { value: "neq", label: "is not" }],
    values: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
  },
  age: {
    label: "Age",
    type: "number",
    ops: [
      { value: "eq", label: "equals" },
      { value: "gte", label: "≥" },
      { value: "lte", label: "≤" },
    ],
  },
  gender: {
    label: "Gender",
    type: "string_enum",
    ops: [{ value: "eq", label: "is" }, { value: "neq", label: "is not" }],
    values: [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
    ],
  },
  location_country: {
    label: "Country",
    type: "string",
    ops: [{ value: "eq", label: "is" }, { value: "neq", label: "is not" }],
  },
  location_city: {
    label: "City",
    type: "string",
    ops: [{ value: "eq", label: "is" }, { value: "neq", label: "is not" }],
  },
  customer_tier: {
    label: "Customer Tier",
    type: "string",
    ops: [{ value: "eq", label: "is" }, { value: "neq", label: "is not" }],
  },
  has_health_profile: {
    label: "Has Health Profile",
    type: "bool_enum",
    ops: [{ value: "eq", label: "is" }],
    values: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
  },
  created_at: {
    label: "Joined Date",
    type: "date",
    ops: [{ value: "gte", label: "on or after" }, { value: "lte", label: "on or before" }],
  },
  custom_tags: {
    label: "Tag",
    type: "string",
    ops: [{ value: "contains", label: "contains" }],
  },
}

const FIELD_KEYS = Object.keys(FIELD_DEFS)

function defaultRule(): SegmentRule {
  return { field: "account_status", op: "eq", value: "active" }
}

// ── Static segment labels ─────────────────────────────────────────────────────
const BUILTIN_LABELS: Record<string, string> = {
  all: "All Members",
  active: "Active Members",
  with_profile: "With Health Profile",
  inactive: "Inactive Members",
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Campaign["status"] }) {
  const styles = {
    draft: "bg-[#f1f5f9] text-[#475569]",
    active: "bg-[#dbeafe] text-[#1d4ed8]",
    sent: "bg-[#dcfce7] text-[#15803d]",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Value input for a rule row ────────────────────────────────────────────────
function RuleValueInput({
  field,
  value,
  onChange,
}: {
  field: string
  value: string
  onChange: (v: string) => void
}) {
  const def = FIELD_DEFS[field]
  if (!def) return <Input value={value} onChange={(e) => onChange(e.target.value)} className="border-[#cbd5e1] h-8 text-[13px]" />

  if (def.type === "string_enum" || def.type === "bool_enum") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[#cbd5e1] px-2 py-1.5 text-[13px] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary h-8"
      >
        {def.values?.map((v) => (
          <option key={v.value} value={v.value}>{v.label}</option>
        ))}
      </select>
    )
  }

  if (def.type === "number") {
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-[#cbd5e1] h-8 text-[13px] w-24"
        placeholder="e.g. 30"
      />
    )
  }

  if (def.type === "date") {
    return (
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-[#cbd5e1] h-8 text-[13px]"
      />
    )
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-[#cbd5e1] h-8 text-[13px]"
      placeholder="value"
    />
  )
}

// ── Segment Builder Dialog ────────────────────────────────────────────────────
function SegmentBuilderDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: Segment | null
  onSaved: (segment: Segment) => void
}) {
  const { toast } = useToast()
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [logic, setLogic] = React.useState<"AND" | "OR">("AND")
  const [rules, setRules] = React.useState<SegmentRule[]>([defaultRule()])
  const [previewCount, setPreviewCount] = React.useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Populate from initial (edit mode)
  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setDescription(initial?.description ?? "")
      setLogic(initial?.logic ?? "AND")
      setRules(initial?.rules?.length ? initial.rules : [defaultRule()])
      setPreviewCount(initial?.member_count ?? null)
    }
  }, [open, initial])

  // Debounced preview fetch
  React.useEffect(() => {
    if (!open) return
    setPreviewCount(null)
    setPreviewLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch("/api/v1/segments/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules, logic }),
        })
        if (res.ok) {
          const json = await res.json()
          setPreviewCount(json.count ?? null)
        }
      } catch { /* non-critical */ } finally {
        setPreviewLoading(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [rules, logic, open])

  function updateRule(idx: number, patch: Partial<SegmentRule>) {
    setRules((prev) => prev.map((r, i) => {
      if (i !== idx) return r
      const updated = { ...r, ...patch }
      // Reset op and value when field changes
      if (patch.field && patch.field !== r.field) {
        const def = FIELD_DEFS[patch.field]
        updated.op = def?.ops[0]?.value ?? "eq"
        updated.value = def?.values?.[0]?.value ?? ""
      }
      return updated
    }))
  }

  function removeRule(idx: number) {
    setRules((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const isEdit = !!initial
      const res = await apiFetch(isEdit ? `/api/v1/segments/${initial!.id}` : "/api/v1/segments", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, logic, rules }),
      })
      if (res.ok) {
        const json = await res.json()
        onSaved(json.segment)
        onOpenChange(false)
        toast({ title: isEdit ? "Segment updated" : "Segment created" })
        trackEvent(isEdit ? "segment_updated" : "segment_created", { rule_count: rules.length })
      } else {
        const json = await res.json().catch(() => ({}))
        toast({ title: "Failed to save segment", description: json.detail, variant: "destructive" })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false) }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Segment" : "New Segment"}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[75vh] space-y-4 py-2 pr-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-[14px] font-semibold text-[#334155]">
              Segment Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High-value active members"
              className="border-[#cbd5e1]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[14px] font-semibold text-[#334155]">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Logic toggle + rule rows */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[#64748b]">Match</span>
              <select
                value={logic}
                onChange={(e) => setLogic(e.target.value as "AND" | "OR")}
                className="rounded-md border border-[#cbd5e1] px-2 py-1 text-[13px] text-[#1e293b] font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="AND">ALL</option>
                <option value="OR">ANY</option>
              </select>
              <span className="text-[13px] text-[#64748b]">of the following conditions:</span>
            </div>

            <div className="space-y-2">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] px-3 py-2">
                  {/* Field */}
                  <select
                    value={rule.field}
                    onChange={(e) => updateRule(idx, { field: e.target.value })}
                    className="rounded-md border border-[#cbd5e1] px-2 py-1.5 text-[13px] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary h-8"
                  >
                    {FIELD_KEYS.map((k) => (
                      <option key={k} value={k}>{FIELD_DEFS[k].label}</option>
                    ))}
                  </select>

                  {/* Op */}
                  <select
                    value={rule.op}
                    onChange={(e) => updateRule(idx, { op: e.target.value })}
                    className="rounded-md border border-[#cbd5e1] px-2 py-1.5 text-[13px] text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary h-8"
                  >
                    {(FIELD_DEFS[rule.field]?.ops ?? []).map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>

                  {/* Value */}
                  <RuleValueInput
                    field={rule.field}
                    value={rule.value}
                    onChange={(v) => updateRule(idx, { value: v })}
                  />

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    disabled={rules.length === 1}
                    className="ml-auto text-[#94a3b8] hover:text-[#ef4444] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <MinusCircle className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-[13px] gap-1.5 border-dashed"
              onClick={() => setRules((prev) => [...prev, defaultRule()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add condition
            </Button>
          </div>

          {/* Live preview */}
          <div className="flex items-center gap-1.5 text-[13px] text-[#64748b] min-h-[20px]">
            {previewLoading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Counting members…</>
            ) : previewCount !== null ? (
              <><Users className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-primary">{previewCount.toLocaleString()}</span>
                &nbsp;member{previewCount !== 1 ? "s" : ""} match this segment</>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            className="bg-primary hover:bg-[#003070] text-white"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {initial ? "Update Segment" : "Save Segment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const { toast } = useToast()

  // Campaigns state
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [sendingId, setSendingId] = React.useState<string | null>(null)
  const [segmentCount, setSegmentCount] = React.useState<number | null>(null)
  const [segmentLoading, setSegmentLoading] = React.useState(false)

  // Segments state
  const [segments, setSegments] = React.useState<Segment[]>([])
  const [segmentsLoading, setSegmentsLoading] = React.useState(true)
  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [editingSegment, setEditingSegment] = React.useState<Segment | null>(null)
  const [deletingSegmentId, setDeletingSegmentId] = React.useState<string | null>(null)

  // Tab
  const [tab, setTab] = React.useState<"campaigns" | "segments">("campaigns")

  // New campaign form
  const [form, setForm] = React.useState({
    name: "",
    target_segment: "all",
    subject: "",
    message: "",
  })
  const [abEnabled, setAbEnabled] = React.useState(false)
  const [subjectB, setSubjectB] = React.useState("")
  const [messageB, setMessageB] = React.useState("")

  // Segment name lookup map (UUID → name) for the campaign table
  const segmentNameMap = React.useMemo(() => {
    const map: Record<string, string> = { ...BUILTIN_LABELS }
    segments.forEach((s) => { map[s.id] = s.name })
    return map
  }, [segments])

  // Debounced segment preview for campaign create dialog
  React.useEffect(() => {
    if (!createOpen) return
    setSegmentCount(null)
    setSegmentLoading(true)
    const timer = setTimeout(async () => {
      try {
        const seg = form.target_segment
        let count: number | null = null
        if (UUID_RE.test(seg)) {
          // Saved segment — get count from segment record
          const found = segments.find((s) => s.id === seg)
          count = found?.member_count ?? null
          setSegmentCount(count)
          setSegmentLoading(false)
          return
        }
        const res = await apiFetch(`/api/v1/campaigns/segment-preview?segment=${seg}`)
        if (res.ok) {
          const json = await res.json()
          count = json.count ?? null
        }
        setSegmentCount(count)
      } catch { /* non-critical */ } finally {
        setSegmentLoading(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [form.target_segment, createOpen, segments])

  async function load() {
    setLoading(true)
    try {
      const res = await apiFetch("/api/v1/campaigns")
      if (res.ok) {
        const json = await res.json()
        setCampaigns(json.campaigns ?? [])
      }
    } catch { /* non-critical */ } finally {
      setLoading(false)
    }
  }

  async function loadSegments() {
    setSegmentsLoading(true)
    try {
      const res = await apiFetch("/api/v1/segments")
      if (res.ok) {
        const json = await res.json()
        setSegments(json.segments ?? [])
      }
    } catch { /* non-critical */ } finally {
      setSegmentsLoading(false)
    }
  }

  React.useEffect(() => { load(); loadSegments() }, [])
  React.useEffect(() => { trackEvent("page_view", { page: "campaigns" }) }, [])

  async function handleCreate() {
    if (!form.name.trim() || !form.subject.trim() || !form.message.trim()) return
    setCreating(true)
    try {
      const res = await apiFetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ab_test_enabled: abEnabled,
          subject_b: abEnabled ? subjectB.trim() || null : null,
          message_b: abEnabled ? messageB.trim() || null : null,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setCampaigns((prev) => [json.campaign, ...prev])
        setCreateOpen(false)
        setForm({ name: "", target_segment: "all", subject: "", message: "" })
        setAbEnabled(false)
        setSubjectB("")
        setMessageB("")
        toast({ title: "Campaign created" })
        trackEvent("campaign_created", { segment: form.target_segment, ab_test: abEnabled })
      } else {
        const json = await res.json().catch(() => ({}))
        toast({ title: "Failed to create campaign", description: json.detail, variant: "destructive" })
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(id: string, status: "active" | "sent") {
    setUpdatingId(id)
    try {
      const res = await apiFetch(`/api/v1/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const json = await res.json()
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, ...json.campaign } : c))
        toast({ title: status === "active" ? "Campaign activated" : "Campaign marked as sent" })
        trackEvent(status === "active" ? "campaign_activated" : "campaign_sent")
      }
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleSend(id: string) {
    setSendingId(id)
    try {
      const res = await apiFetch(`/api/v1/campaigns/${id}/send`, { method: "POST" })
      if (res.ok) {
        const json = await res.json()
        setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: "sent", sent_at: new Date().toISOString(), recipient_count: json.sent ?? c.recipient_count } : c))
        toast({ title: json.skipped ? "Campaign saved (email delivery skipped — no API key)" : `Campaign sent to ${json.sent?.toLocaleString()} recipient(s)` })
        trackEvent("campaign_sent_via_resend", { sent: json.sent, skipped: json.skipped })
      } else if (res.status === 409) {
        toast({ title: "Already sent", description: "This campaign has already been delivered.", variant: "destructive" })
      } else if (res.status === 422) {
        toast({ title: "No recipients", description: "No opted-in recipients found for this segment.", variant: "destructive" })
      } else {
        const json = await res.json().catch(() => ({}))
        toast({ title: "Failed to send campaign", description: json.detail, variant: "destructive" })
      }
    } finally {
      setSendingId(null)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await apiFetch(`/api/v1/campaigns/${id}`, { method: "DELETE" })
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id))
        toast({ title: "Campaign deleted" })
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteSegment(id: string) {
    setDeletingSegmentId(id)
    try {
      const res = await apiFetch(`/api/v1/segments/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSegments((prev) => prev.filter((s) => s.id !== id))
        toast({ title: "Segment deleted" })
        trackEvent("segment_deleted")
      } else {
        toast({ title: "Failed to delete segment", variant: "destructive" })
      }
    } finally {
      setDeletingSegmentId(null)
    }
  }

  function handleSegmentSaved(seg: Segment) {
    setSegments((prev) => {
      const exists = prev.find((s) => s.id === seg.id)
      return exists
        ? prev.map((s) => s.id === seg.id ? seg : s)
        : [seg, ...prev]
    })
  }

  return (
    <AppShell title="Campaigns">
      <div className="-mx-4 md:-mx-6 -my-4 bg-[#f8fafc] min-h-[calc(100vh-3.5rem)]">
        <div className="max-w-[1280px] mx-auto px-8 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px]">Campaigns</h1>
              <p className="text-[14px] text-[#64748b] mt-1">Manage outreach campaigns for your member segments</p>
            </div>
            <div className="flex items-center gap-2">
              {tab === "segments" && (
                <Button
                  onClick={() => { setEditingSegment(null); setBuilderOpen(true) }}
                  className="bg-primary hover:bg-[#003070] text-white gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Segment
                </Button>
              )}
              {tab === "campaigns" && (
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-primary hover:bg-[#003070] text-white gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Campaign
                </Button>
              )}
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center border-b border-[#e2e8f0] gap-6">
            <button
              onClick={() => setTab("campaigns")}
              className={`pb-2 text-[14px] font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === "campaigns"
                  ? "border-primary text-primary"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <Megaphone className="h-3.5 w-3.5" />
              Campaigns
            </button>
            <button
              onClick={() => setTab("segments")}
              className={`pb-2 text-[14px] font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === "segments"
                  ? "border-primary text-primary"
                  : "border-transparent text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Segments
              {segments.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {segments.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Campaigns Tab ── */}
          {tab === "campaigns" && (
            <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
              {loading ? (
                <CardContent className="py-16 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#64748b]" />
                </CardContent>
              ) : campaigns.length === 0 ? (
                <CardContent className="py-20 flex flex-col items-center gap-3 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Megaphone className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-[15px] font-semibold text-[#0f172a]">No campaigns yet</p>
                  <p className="text-[13px] text-[#64748b] max-w-xs">
                    Create your first campaign to start reaching out to member segments.
                  </p>
                  <Button
                    onClick={() => setCreateOpen(true)}
                    className="mt-2 bg-primary hover:bg-[#003070] text-white gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Campaign
                  </Button>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[#f1f5f9]">
                        <th className="text-left font-semibold text-[#64748b] uppercase text-[11px] tracking-wide py-3 px-6">Name</th>
                        <th className="text-left font-semibold text-[#64748b] uppercase text-[11px] tracking-wide py-3 px-4">Segment</th>
                        <th className="text-left font-semibold text-[#64748b] uppercase text-[11px] tracking-wide py-3 px-4">Status</th>
                        <th className="text-left font-semibold text-[#64748b] uppercase text-[11px] tracking-wide py-3 px-4">Created</th>
                        <th className="text-left font-semibold text-[#64748b] uppercase text-[11px] tracking-wide py-3 px-4">Sent</th>
                        <th className="text-right font-semibold text-[#64748b] uppercase text-[11px] tracking-wide py-3 px-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {campaigns.map((c) => (
                        <tr key={c.id} className="hover:bg-[#f8fafc]">
                          <td className="py-3.5 px-6">
                            <p className="font-semibold text-[#0f172a]">{c.name}</p>
                            <p className="text-[11px] text-[#64748b] truncate max-w-[200px]">{c.subject}</p>
                          </td>
                          <td className="py-3.5 px-4 text-[#334155]">
                            <span>{segmentNameMap[c.target_segment] ?? c.target_segment}</span>
                            {c.recipient_count !== null && c.recipient_count !== undefined && (
                              <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-[#64748b]">
                                <Users className="h-3 w-3" />{c.recipient_count.toLocaleString()}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="py-3.5 px-4 text-[#64748b]">{fmtDate(c.created_at)}</td>
                          <td className="py-3.5 px-4 text-[#64748b]">{fmtDate(c.sent_at)}</td>
                          <td className="py-3.5 px-6">
                            <div className="flex items-center justify-end gap-2">
                              {c.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[12px] h-7 px-2.5"
                                  disabled={updatingId === c.id}
                                  onClick={() => handleStatusChange(c.id, "active")}
                                >
                                  {updatingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Activate"}
                                </Button>
                              )}
                              {c.status === "active" && (
                                <Button
                                  size="sm"
                                  className="text-[12px] h-7 px-2.5 bg-primary hover:bg-[#003070] text-white gap-1.5"
                                  disabled={sendingId === c.id}
                                  onClick={() => handleSend(c.id)}
                                >
                                  {sendingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                  {sendingId === c.id ? "Sending…" : "Send Campaign"}
                                </Button>
                              )}
                              {c.status === "draft" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-[12px] h-7 px-2 text-[#ef4444] hover:text-[#ef4444] hover:bg-[#fef2f2]"
                                  disabled={deletingId === c.id}
                                  onClick={() => handleDelete(c.id)}
                                >
                                  {deletingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* ── Segments Tab ── */}
          {tab === "segments" && (
            <>
              {segmentsLoading ? (
                <div className="py-16 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[#64748b]" />
                </div>
              ) : segments.length === 0 ? (
                <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                  <CardContent className="py-20 flex flex-col items-center gap-3 text-center">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <SlidersHorizontal className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-[15px] font-semibold text-[#0f172a]">No saved segments yet</p>
                    <p className="text-[13px] text-[#64748b] max-w-xs">
                      Build a custom rule-based segment to precisely target members in your campaigns.
                    </p>
                    <Button
                      onClick={() => { setEditingSegment(null); setBuilderOpen(true) }}
                      className="mt-2 bg-primary hover:bg-[#003070] text-white gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Segment
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {segments.map((seg) => (
                    <Card
                      key={seg.id}
                      className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-[15px] text-[#0f172a] truncate">{seg.name}</p>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary rounded-full px-2 py-0.5 whitespace-nowrap">
                                <Users className="h-3 w-3" />
                                {seg.member_count?.toLocaleString() ?? "—"} members
                              </span>
                            </div>
                            {seg.description && (
                              <p className="text-[13px] text-[#64748b] mt-1 truncate">{seg.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
                                {seg.logic} rules:
                              </span>
                              {seg.rules.slice(0, 3).map((r, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] bg-[#f1f5f9] text-[#475569] rounded px-1.5 py-0.5 font-mono"
                                >
                                  {FIELD_DEFS[r.field]?.label ?? r.field} {r.op} {r.value}
                                </span>
                              ))}
                              {seg.rules.length > 3 && (
                                <span className="text-[11px] text-[#94a3b8]">
                                  +{seg.rules.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-[#64748b] hover:text-primary hover:bg-primary/5"
                              onClick={() => { setEditingSegment(seg); setBuilderOpen(true) }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-[#64748b] hover:text-[#ef4444] hover:bg-[#fef2f2]"
                              disabled={deletingSegmentId === seg.id}
                              onClick={() => handleDeleteSegment(seg.id)}
                            >
                              {deletingSegmentId === seg.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[#f1f5f9] text-[11px] text-[#94a3b8]">
                          Created {fmtDate(seg.created_at)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) { setCreateOpen(false); setSegmentCount(null) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[80vh] space-y-4 py-2 pr-1">
            <div className="space-y-1.5">
              <Label className="text-[14px] font-semibold text-[#334155]">Campaign Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Spring Wellness Push"
                className="border-[#cbd5e1]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] font-semibold text-[#334155]">Target Segment</Label>
              <select
                value={form.target_segment}
                onChange={(e) => setForm((f) => ({ ...f, target_segment: e.target.value }))}
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <optgroup label="Built-in">
                  <option value="all">All Members</option>
                  <option value="active">Active Members</option>
                  <option value="with_profile">With Health Profile</option>
                  <option value="inactive">Inactive Members</option>
                </optgroup>
                {segments.length > 0 && (
                  <optgroup label="Saved Segments">
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.member_count !== null ? ` (${s.member_count.toLocaleString()} members)` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-[12px] text-[#64748b] flex items-center gap-1.5 mt-1 min-h-[18px]">
                {segmentLoading ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Counting members…</>
                ) : segmentCount !== null ? (
                  <><Users className="h-3 w-3 text-primary" />
                    <span className="text-primary font-semibold">{segmentCount.toLocaleString()}</span> members will be targeted</>
                ) : null}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] font-semibold text-[#334155]">Subject Line <span className="text-red-500">*</span></Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. Check out your personalized product picks"
                className="border-[#cbd5e1]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[14px] font-semibold text-[#334155]">Message <span className="text-red-500">*</span></Label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={4}
                placeholder="Write your campaign message here..."
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            {/* A/B Test Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  <span className="text-[13px] font-semibold text-[#334155]">Enable A/B Test</span>
                </div>
                <Switch checked={abEnabled} onCheckedChange={setAbEnabled} />
              </div>
              {abEnabled && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[#64748b] flex items-center gap-1.5">
                    <GitBranch className="h-3 w-3" />
                    50% / 50% audience split (auto)
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold text-[#334155]">Subject B <span className="text-red-500">*</span></Label>
                    <Input
                      value={subjectB}
                      onChange={(e) => setSubjectB(e.target.value)}
                      placeholder="Alternate subject line..."
                      className="border-[#cbd5e1] text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-semibold text-[#334155]">Message B <span className="text-red-500">*</span></Label>
                    <textarea
                      value={messageB}
                      onChange={(e) => setMessageB(e.target.value)}
                      rows={3}
                      placeholder="Alternate message body..."
                      className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-[#003070] text-white"
              onClick={handleCreate}
              disabled={creating || !form.name.trim() || !form.subject.trim() || !form.message.trim() || (abEnabled && (!subjectB.trim() || !messageB.trim()))}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Segment Builder Dialog */}
      <SegmentBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        initial={editingSegment}
        onSaved={handleSegmentSaved}
      />
    </AppShell>
  )
}
