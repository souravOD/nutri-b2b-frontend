"use client"

import * as React from "react"
import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getCustomerProductNote, setCustomerProductNote } from "@/lib/api-customers"
import { useToast } from "@/hooks/use-toast"

export default function VendorNotesCard({
  product,
  customerId,
}: {
  product: any
  customerId?: string
}) {
  const { toast } = useToast()
  const [noteText, setNoteText] = React.useState("")
  const [noteLoading, setNoteLoading] = React.useState(false)
  const [noteSaving, setNoteSaving] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)

  React.useEffect(() => {
    if (product?.id && customerId) {
      setNoteLoading(true)
      getCustomerProductNote(customerId, product.id)
        .then(({ note }) => {
          setNoteText(note ?? "")
          setIsAdding(!note)
        })
        .catch(() => setNoteText(""))
        .finally(() => setNoteLoading(false))
    }
  }, [product?.id, customerId])

  const handleSave = async () => {
    if (!customerId || !product) return
    setNoteSaving(true)
    try {
      await setCustomerProductNote(customerId, product.id, noteText.trim() || null)
      toast({ title: "Note saved" })
      setIsAdding(false)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message ?? String(e) })
    } finally {
      setNoteSaving(false)
    }
  }

  if (!customerId) return null

  return (
    <div className="bg-[rgba(0,67,143,0.05)] border border-[rgba(0,67,143,0.1)] rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-[#00438f]" />
        <h3 className="font-bold text-[12px] uppercase tracking-wider text-[#00438f]">Internal Vendor Notes</h3>
      </div>
      {isAdding ? (
        <div className="space-y-3">
          <Textarea
            placeholder="Enter internal vendor notes here..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            disabled={noteLoading}
            className="min-h-[80px] bg-white border-[#e2e8f0] resize-none"
            rows={4}
          />
          <Button
            size="sm"
            className="bg-[#00438f] hover:bg-[#003366] text-white"
            onClick={handleSave}
            disabled={noteLoading || noteSaving}
          >
            {noteSaving ? "Saving..." : "Save Note"}
          </Button>
        </div>
      ) : (
        <>
          {noteText ? (
            <p className="text-sm text-[#64748b] leading-5 whitespace-pre-wrap">{noteText}</p>
          ) : (
            <p className="text-sm text-[#64748b] leading-5">
              No notes have been added to this product SKU yet.
            </p>
          )}
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-3 flex items-center gap-1 text-[#00438f] font-bold text-xs hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            {noteText ? "Edit note" : "Add internal note"}
          </button>
        </>
      )}
    </div>
  )
}
