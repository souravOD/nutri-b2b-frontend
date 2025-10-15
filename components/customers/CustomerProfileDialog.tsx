"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog, DialogPortal, DialogOverlay, DialogContent,
  DialogTitle, DialogDescription, DialogClose
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, X, Save, Pencil, Trash2 } from "lucide-react"
import type { UICustomer } from "@/types/customer"
import { getCustomer, updateCustomer } from "@/lib/api-customers"
import { deleteCustomer } from "@/lib/api-customers" // we’ll add this helper below
import CustomerDetailView from "./CustomerDetailView"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation";

type Props = {
  open: boolean
  id?: string
  onOpenChange: (open: boolean) => void
  onDeleted?: (id: string) => void
  onSaved?: (c: UICustomer) => void
}

export default function CustomerProfileDialog({ open, id, onOpenChange, onDeleted, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customer, setCustomer] = useState<UICustomer | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<{ name: string; email: string; phone?: string; tags: string[] }>({ name: "", email: "", phone: "", tags: [] })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false);
  const router = useRouter(); // optional

  useEffect(() => {
    if (!id || !open) { setCustomer(null); setError(null); return }
    let cancel = false
    setLoading(true); setError(null)
    ;(async () => {
      try {
        const data = await getCustomer(String(id))
        if (!cancel) {
          setCustomer(data)
          setForm({
            name: data.name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            tags: Array.isArray(data.tags) ? data.tags : [],
          })
        }
      } catch {
        if (!cancel) setError("Failed to load customer")
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [id, open])

  const canSave = useMemo(() => editing && form.name.trim() && form.email.trim(), [editing, form])

  const onSave = async () => {
    if (!id) return
    setLoading(true)
    try {
      const updated = await updateCustomer(id, { name: form.name, email: form.email, phone: form.phone, tags: form.tags })
      setCustomer(updated)
      setEditing(false)
      onSaved?.(updated)
    } catch {
      setError("Save failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const onDelete = async () => {
    if (!id) return
    setLoading(true)
    try {
      await deleteCustomer(id)
      setConfirmOpen(false)
      onOpenChange(false)
      onDeleted?.(id)
    } catch {
      setError("Delete failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const header = (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background/80 px-5 py-4 backdrop-blur">
      <div className="min-w-0">
        <DialogTitle className="truncate text-xl font-semibold">{customer ? customer.name : loading ? "Loading..." : "Customer"}</DialogTitle>
        <DialogDescription className="text-muted-foreground">Profile & health (no recommendations).</DialogDescription>
      </div>
      <div className="flex items-center gap-2">
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
        ) : (
          <Button size="sm" onClick={onSave} disabled={!canSave || loading}><Save className="mr-2 h-4 w-4" />Save</Button>
        )}
         <Button size="sm" onClick={() => setConfirmOpen(true)}
        className="bg-red-600 hover:bg-red-600/90 text-white font-medium shadow-sm">
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Delete</span>
        </Button>
        <DialogClose className="rounded-md p-2 hover:bg-muted" aria-label="Close">
          <X className="h-5 w-5" />
        </DialogClose>
      </div>
    </div>
  )

  const body = (() => {
    if (loading) return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    )
    if (error) return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
    if (!customer) return null

    return (
      <div className="space-y-8">
        {/* Basic fields (inline edit) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))} disabled={!editing} placeholder="Full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email} onChange={(e) => setForm(s => ({ ...s, email: e.target.value }))} disabled={!editing} placeholder="email@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone ?? ""} onChange={(e) => setForm(s => ({ ...s, phone: e.target.value }))} disabled={!editing} placeholder="+1..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={(form.tags || []).join(", ")} onChange={(e) => setForm(s => ({ ...s, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))} disabled={!editing} placeholder="vip, gluten-free" />
          </div>
        </div>

        {/* Health/Profile view (no matches, no dietary, no notes) */}
        <CustomerDetailView
          customer={customer}
          showMatches={false}
          showRestrictions={false}
          showNotes={false}
        />
      </div>
    )
  })()

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <DialogContent
            className="fixed left-1/2 top-1/2 z-50 w-[min(98vw,1200px)] sm:max-w-none max-h-[92vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-background shadow-2xl p-0"
            style={{ maxWidth: "none" }}
          >
            {header}
            <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-6 py-6 md:px-8 md:py-8">
              {body}
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Confirm delete dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The customer and related data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            {/* IMPORTANT: type='button' avoids accidental form submit */}
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={deleting}>
                Cancel
              </Button>
            </AlertDialogCancel>

            <AlertDialogAction asChild>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                disabled={deleting}
                onClick={onDelete}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
