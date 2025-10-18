"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { getCustomer, updateCustomer } from "@/lib/api-customers"

type Props = {
  open: boolean
  customerId?: string
  customerName?: string
  onOpenChange: (open: boolean) => void
}

export default function CustomerNotesDialog({ open, customerId, customerName, onOpenChange }: Props) {
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!customerId || !open) return
    ;(async () => {
      try {
        const c = await getCustomer(customerId)
        setText(c.notes ?? "")
      } catch {
        setText("")
      } finally {
        setSaving(false)
        setSaved(false)
      }
    })()
  }, [customerId, open])

  const onSave = () => {
    if (!customerId) return
    setSaving(true)
    ;(async () => {
      try {
        await updateCustomer(customerId, { notes: text })
        setSaved(true)
      } catch {
        // soft-fail UI; keep text in state
      } finally {
        setSaving(false)
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Notes for {customerName ?? "Customer"}</DialogTitle>
          <DialogDescription>Saved to your account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea rows={10} value={text} onChange={(e) => { setText(e.target.value); setSaved(false) }} placeholder="Type notes here..." />
          <div className="flex items-center gap-2">
            <Button onClick={onSave} disabled={saving}>Save</Button>
            <Button variant="secondary" onClick={() => setText("")}>Clear</Button>
            {saving && <span className="text-sm text-muted-foreground">Saving…</span>}
            {saved && <span className="text-sm text-green-600">Saved ✔</span>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
