"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

type ImportWizardProps = {
  onComplete?: (jobId: string) => void
}

export default function ImportWizard({ onComplete = () => {} }: ImportWizardProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1)
  const [file, setFile] = React.useState<File | null>(null)
  const [mapping, setMapping] = React.useState<Record<string, string>>({})
  const [uploading, setUploading] = React.useState(false)
  const [jobId, setJobId] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    let t: any
    if (step === 4 && jobId) {
      // Poll job status
      const poll = async () => {
        const res = await fetch(`/api/jobs/${jobId}`)
        const data = await res.json()
        setProgress(data.progress ?? 0)
        if (data.status === "completed" || data.status === "failed") {
          onComplete(jobId)
          clearInterval(t)
        }
      }
      t = setInterval(poll, 1000)
      poll()
    }
    return () => clearInterval(t)
  }, [step, jobId, onComplete])

  const startImport = async () => {
    setUploading(true)
    const res = await fetch("/api/jobs", {
      method: "POST",
      body: JSON.stringify({ type: "import", source: "CSV" }),
    })
    const data = await res.json()
    setJobId(data.id)
    setUploading(false)
    setStep(4)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setStep(1)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">{"Import"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{"CSV Import"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <StepHeader step={step} />
          {step === 1 && (
            <div className="space-y-3">
              <Label>{"Upload CSV"}</Label>
              <div
                className="border border-dashed rounded-md p-8 text-center text-sm text-muted-foreground"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f) setFile(f)
                }}
              >
                {file ? (
                  <div className="text-left">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs">{`${(file.size / 1024).toFixed(1)} KB`}</div>
                  </div>
                ) : (
                  "Drag and drop CSV here or click to select"
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  {"Cancel"}
                </Button>
                <Button onClick={() => setStep(2)} disabled={!file}>
                  {"Next"}
                </Button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <Label>{"Map Fields"}</Label>
              <div className="text-sm text-muted-foreground">
                {"Auto-mapped: name → Name, sku → SKU, status → Status"}
              </div>
              <div className="border rounded-md p-4 text-sm">{"For demo, field mapping is assumed."}</div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  {"Back"}
                </Button>
                <Button onClick={() => setStep(3)}>{"Next"}</Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <Label>{"Review & Import"}</Label>
              <div className="text-sm text-muted-foreground">
                {"Preview a few rows and resolve conflicts (omitted for demo)."}
              </div>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  {"Back"}
                </Button>
                <Button onClick={startImport} disabled={uploading}>
                  {uploading ? "Starting..." : "Start Import"}
                </Button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-3">
              <Label>{"Import Progress"}</Label>
              <Progress value={progress} />
              <div className="text-sm text-muted-foreground">{progress}%</div>
              <div className="flex justify-end">
                <Button onClick={() => setOpen(false)} disabled={progress < 100}>
                  {"Close"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StepHeader({ step = 1 as 1 | 2 | 3 | 4 }) {
  const steps = ["Upload", "Map", "Review", "Import"]
  return (
    <div className="flex items-center justify-between text-xs">
      {steps.map((s, i) => {
        const idx = i + 1
        const active = idx === step
        const done = idx < step
        return (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center ${done ? "bg-emerald-600 text-white" : active ? "bg-emerald-200 text-emerald-900" : "bg-muted text-muted-foreground"}`}
            >
              {idx}
            </div>
            <div className={`${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</div>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}
