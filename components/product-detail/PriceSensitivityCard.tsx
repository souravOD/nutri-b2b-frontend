"use client"

import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts"

const STATIC_DATA = [
  { month: "JUL 23", value: 62 },
  { month: "AUG 23", value: 71 },
  { month: "SEP 23", value: 58 },
  { month: "OCT 23", value: 74 },
  { month: "NOV 23", value: 80 },
  { month: "DEC 23", value: 95 },
  { month: "JAN 24", value: 68 },
]

const PEAK_INDEX = 5

export default function PriceSensitivityCard() {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <h3 className="font-bold text-[18px] text-[#0f172a] mb-4">Price Sensitivity Matrix</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={STATIC_DATA} barCategoryGap="30%">
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {STATIC_DATA.map((_, i) => (
              <Cell key={i} fill={i === PEAK_INDEX ? "#0f172a" : "#cbd5e1"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] text-center mt-1">
        Optimal Pricing Corridor
      </p>
    </div>
  )
}
