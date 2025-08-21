"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ProductNotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: string
  onSave?: (text: string) => void
}

export default function ProductNotesDialog({ open, onOpenChange, initial = "", onSave }: ProductNotesDialogProps) {
  const [notes, setNotes] = React.useState(initial)

  React.useEffect(() => {
    setNotes(initial)
  }, [initial])

  const handleSave = () => {
    onSave?.(notes)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Product Notes</DialogTitle>
          <p className="text-sm text-muted-foreground">Add your notes about this product for future reference.</p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add your notes about this product...

Examples:
• Customer feedback
• Special considerations
• Pricing notes
• Availability concerns"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-[150px]"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            These notes are saved locally and will help you remember important details about this product.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Notes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
