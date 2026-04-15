"use client"

import * as React from "react"
import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { getProductNotes, setProductNotes } from "@/lib/api-products"
import { useToast } from "@/hooks/use-toast"

export default function ProductInternalNotesCard({ product }: { product: any }) {
  const { toast } = useToast()
  const [noteText, setNoteText] = React.useState("")
  const [noteLoading, setNoteLoading] = React.useState(false)
  const [noteSaving, setNoteSaving] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)

  React.useEffect(() => {
    if (product?.id) {
      setNoteLoading(true)
      getProductNotes(product.id)
        .then((note) => {
          setNoteText(note ?? "")
          setIsAdding(false)
        })
        .catch(() => setNoteText(""))
        .finally(() => setNoteLoading(false))
    }
  }, [product?.id])

  const handleSave = async () => {
    if (!product) return
    setNoteSaving(true)
    try {
      await setProductNotes(product.id, noteText.trim() || null)
      toast({ title: "Note saved" })
      setIsAdding(false)
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message ?? String(e) })
    } finally {
      setNoteSaving(false)
    }
  }

  return (
    <div className="bg-[rgba(0,67,143,0.05)] border border-[rgba(0,67,143,0.1)] rounded-[16px] p-[25px] flex flex-col gap-[12px]">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-primary" />
        <h3 className="text-[12px] font-bold uppercase tracking-[1.2px] text-primary leading-[16px]">
          Internal Vendor Notes
        </h3>
      </div>
      {isAdding ? (
        <div className="flex flex-col gap-3">
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
            className="bg-primary hover:bg-[#003366] text-white"
            onClick={handleSave}
            disabled={noteLoading || noteSaving}
          >
            {noteSaving ? "Saving..." : "Save Note"}
          </Button>
        </div>
      ) : (
        <>
          <div className="text-[14px] text-[#64748b] leading-[20px]">
            {noteText ? (
              <p className="whitespace-pre-wrap">{noteText}</p>
            ) : (
              <>
                <p className="mb-0">No notes have been added to this</p>
                <p>product SKU yet.</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-primary font-bold text-[12px] leading-[16px] hover:underline"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            {noteText ? "Edit note" : "Add internal note"}
          </button>
        </>
      )}
    </div>
  )
}
