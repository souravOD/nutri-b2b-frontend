"use client"

interface MatchProgressProps {
  running: boolean
}

export default function MatchProgress({ running }: MatchProgressProps) {
  if (!running) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
        <div className="flex-1">
          <div className="text-sm font-medium text-blue-900">Running match analysis...</div>
          <div className="text-xs text-blue-700">Evaluating dietary restrictions and scoring products</div>
        </div>
        <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  )
}
