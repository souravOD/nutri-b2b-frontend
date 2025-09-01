"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type Props = {
  open: boolean
  customerId?: string
  customerName?: string
  onOpenChange: (open: boolean) => void
}

const keyFor = (id: string) => `customer-notes:${id}`

export default function CustomerNotesDialog({ open, customerId, customerName, onOpenChange }: Props) {
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!customerId) return
    const v = localStorage.getItem(keyFor(customerId))
    setText(v ?? "")
    setSaving(false)
    setSaved(false)
  }, [customerId, open])

  const onSave = () => {
    if (!customerId) return
    setSaving(true)
    localStorage.setItem(keyFor(customerId), text)
    setTimeout(() => { setSaving(false); setSaved(true) }, 250)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Notes for {customerName ?? "Customer"}</DialogTitle>
          <DialogDescription>Saved in your browser (local only).</DialogDescription>
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
