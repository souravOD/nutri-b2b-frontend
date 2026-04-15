"use client"

import { useState } from "react"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Shield, Lock, RefreshCw } from "lucide-react"

const ACCESS_REASONS = [
  { value: "treatment", label: "Treatment" },
  { value: "payment", label: "Payment" },
  { value: "healthcare_operations", label: "Healthcare Operations" },
  { value: "quality_assessment", label: "Quality Assessment" },
  { value: "research", label: "Research (with authorization)" },
  { value: "legal", label: "Legal / Regulatory Requirement" },
]

type Props = {
  open: boolean
  customerName: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export default function PHIAccessDialog({ open, customerName, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("")
  const [certified, setCertified] = useState(false)

  const canSubmit = reason !== "" && certified

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-[rgba(15,23,42,0.6)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogContent
          showCloseButton={false}
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[calc(100vw-2rem)] rounded-[12px] bg-white border border-[#e2e8f0] p-0 shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden"
        >
          {/* Header with shield visual */}
          <div className="flex flex-col items-center px-8 pt-8 pb-6 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(0,67,143,0.1)]">
              <Shield className="h-7 w-7 text-primary" strokeWidth={2} />
            </div>

            <h2 className="mb-3 font-bold text-[24px] text-[#0f172a] tracking-[-0.6px] leading-8">
              HIPAA Protected Data Access
            </h2>

            <p className="text-[14px] leading-[22.75px] text-[#475569]">
              To view{" "}
              <span className="font-bold">{customerName}&apos;s</span>
              {" "}protected health information, please
              <br />
              confirm your authorization and specify the reason for access.
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-6 flex flex-col gap-6">
            {/* Reason for Access */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-[#334155] leading-5">
                Reason for Access
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="w-full h-12 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] text-[16px] text-[#0f172a]">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Authorization Checkbox */}
            <div className="flex items-start gap-3 bg-[#f8fafc] border border-[#f1f5f9] rounded-[8px] p-4">
              <Checkbox
                id="phi-certify"
                checked={certified}
                onCheckedChange={(v) => setCertified(Boolean(v))}
                className="mt-0.5 shrink-0 border-[#cbd5e1]"
              />
              <label
                htmlFor="phi-certify"
                className="cursor-pointer text-[14px] leading-[17.5px] text-[#475569]"
              >
                I certify that I am authorized to access this PHI under HIPAA
                regulations and that my access follows the{" "}
                <a
                  href="https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Minimum Necessary Rule
                </a>
                .
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={() => canSubmit && onConfirm(reason)}
                disabled={!canSubmit}
                className="w-full h-14 rounded-[8px] bg-primary hover:bg-[#003a7a] text-white text-[16px] font-bold disabled:opacity-50 disabled:cursor-not-allowed relative"
                style={{
                  boxShadow: canSubmit
                    ? "0px 10px 15px -3px rgba(0,67,143,0.2), 0px 4px 6px -4px rgba(0,67,143,0.2)"
                    : "none",
                }}
              >
                <Lock className="mr-2 h-4 w-4 shrink-0" />
                View Secure Data
              </Button>

              <button
                onClick={onCancel}
                className="w-full py-3 text-[14px] font-medium text-[#64748b] hover:text-[#0f172a] transition-colors text-center"
              >
                Cancel and Go Back
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 bg-[#f8fafc] border-t border-[#f1f5f9] px-8 py-4">
            <RefreshCw className="h-[10.5px] w-[10.5px] shrink-0 text-[#64748b]" />
            <p className="text-[12px] leading-4 text-[#64748b]">
              All access attempts are logged and audited for compliance.
            </p>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
