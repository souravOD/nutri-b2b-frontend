"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/backend"

const NPS_STORAGE_KEY = "nps_last_shown"
const NPS_COUNT_KEY = "nps_page_count"
const NPS_COOLDOWN_DAYS = 30
const NPS_TRIGGER_COUNT = 3

export function useNpsTrigger() {
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    try {
      const lastShown = localStorage.getItem(NPS_STORAGE_KEY)
      if (lastShown) {
        const daysSince = (Date.now() - Number(lastShown)) / 86_400_000
        if (daysSince < NPS_COOLDOWN_DAYS) return
      }
      const count = parseInt(localStorage.getItem(NPS_COUNT_KEY) ?? "0", 10) + 1
      localStorage.setItem(NPS_COUNT_KEY, String(count))
      if (count >= NPS_TRIGGER_COUNT) {
        setShow(true)
        localStorage.removeItem(NPS_COUNT_KEY)
      }
    } catch { /* localStorage unavailable */ }
  }, [])

  const dismiss = React.useCallback(() => {
    try { localStorage.setItem(NPS_STORAGE_KEY, String(Date.now())) } catch { /* ignore */ }
    setShow(false)
  }, [])

  return { show, dismiss }
}

export function NpsSurvey({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [score, setScore] = React.useState<number | null>(null)
  const [comment, setComment] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit() {
    if (score === null) return
    setSubmitting(true)
    try {
      await apiFetch("/api/v1/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim() || undefined }),
      })
      setSubmitted(true)
      setTimeout(onClose, 1800)
    } catch { /* non-critical — still mark as shown */ } finally {
      setSubmitting(false)
    }
  }

  function scoreColor(n: number) {
    if (n <= 6) return "bg-[#fef2f2] border-[#fca5a5] text-[#dc2626] hover:bg-[#fee2e2]"
    if (n <= 8) return "bg-[#fffbeb] border-[#fcd34d] text-[#d97706] hover:bg-[#fef3c7]"
    return "bg-[#f0fdf4] border-[#86efac] text-[#16a34a] hover:bg-[#dcfce7]"
  }

  function scoreColorSelected(n: number) {
    if (n <= 6) return "bg-[#dc2626] border-[#dc2626] text-white"
    if (n <= 8) return "bg-[#d97706] border-[#d97706] text-white"
    return "bg-[#16a34a] border-[#16a34a] text-white"
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#0f172a]">
            How likely are you to recommend us?
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <p className="text-2xl mb-2">🙏</p>
            <p className="text-[15px] font-semibold text-[#0f172a]">Thank you for your feedback!</p>
            <p className="text-sm text-[#64748b] mt-1">Your response helps us improve.</p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div>
              <p className="text-sm text-[#64748b] mb-3">
                On a scale of 1–10, how likely are you to recommend this platform to a colleague?
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setScore(n)}
                    className={`w-9 h-9 rounded-lg border text-sm font-semibold transition-colors ${
                      score === n ? scoreColorSelected(n) : scoreColor(n)
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-[#94a3b8] mt-1.5">
                <span>Not at all likely</span>
                <span>Extremely likely</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-[#475569] font-medium block mb-1.5">
                Any comments? <span className="font-normal text-[#94a3b8]">(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="What could we do better?"
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm text-[#1e293b] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onClose}
                className="text-sm text-[#94a3b8] hover:text-[#64748b] transition-colors"
              >
                Maybe later
              </button>
              <button
                onClick={handleSubmit}
                disabled={score === null || submitting}
                className="px-4 py-2 bg-primary hover:bg-[#003070] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {submitting ? "Submitting…" : "Submit Feedback"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
