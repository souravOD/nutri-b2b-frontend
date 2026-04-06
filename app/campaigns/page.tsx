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
import { Loader2, Megaphone, Plus, Trash2 } from "lucide-react"

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
}

const SEGMENT_LABELS: Record<string, string> = {
  all: "All Members",
  active: "Active Members",
  with_profile: "With Health Profile",
  inactive: "Inactive Members",
}

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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [updatingId, setUpdatingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  // New campaign form
  const [form, setForm] = React.useState({
    name: "",
    target_segment: "all",
    subject: "",
    message: "",
  })

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

  React.useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!form.name.trim() || !form.subject.trim() || !form.message.trim()) return
    setCreating(true)
    try {
      const res = await apiFetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const json = await res.json()
        setCampaigns((prev) => [json.campaign, ...prev])
        setCreateOpen(false)
        setForm({ name: "", target_segment: "all", subject: "", message: "" })
        toast({ title: "Campaign created" })
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
      }
    } finally {
      setUpdatingId(null)
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
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[#00438f] hover:bg-[#003070] text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>

          {/* Table */}
          <Card className="rounded-[12px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
            {loading ? (
              <CardContent className="py-16 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#64748b]" />
              </CardContent>
            ) : campaigns.length === 0 ? (
              <CardContent className="py-20 flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-xl bg-[#00438f]/10 flex items-center justify-center">
                  <Megaphone className="h-6 w-6 text-[#00438f]" />
                </div>
                <p className="text-[15px] font-semibold text-[#0f172a]">No campaigns yet</p>
                <p className="text-[13px] text-[#64748b] max-w-xs">
                  Create your first campaign to start reaching out to member segments.
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="mt-2 bg-[#00438f] hover:bg-[#003070] text-white gap-2"
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
                          {SEGMENT_LABELS[c.target_segment] ?? c.target_segment}
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
                                variant="outline"
                                className="text-[12px] h-7 px-2.5"
                                disabled={updatingId === c.id}
                                onClick={() => handleStatusChange(c.id, "sent")}
                              >
                                {updatingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Sent"}
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
        </div>
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] focus:outline-none focus:ring-2 focus:ring-[#00438f]/30 focus:border-[#00438f]"
              >
                <option value="all">All Members</option>
                <option value="active">Active Members</option>
                <option value="with_profile">With Health Profile</option>
                <option value="inactive">Inactive Members</option>
              </select>
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
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm text-[#1e293b] resize-none focus:outline-none focus:ring-2 focus:ring-[#00438f]/30 focus:border-[#00438f]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button
              className="bg-[#00438f] hover:bg-[#003070] text-white"
              onClick={handleCreate}
              disabled={creating || !form.name.trim() || !form.subject.trim() || !form.message.trim()}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
