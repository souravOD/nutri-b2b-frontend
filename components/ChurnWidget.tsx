"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

export type AtRiskCustomer = {
  id: string;
  fullName: string;
  email: string;
  updatedAt: string;
  customerSegment: string | null;
};

export type ChurnData = {
  healthy: number;
  atRisk: number;
  churned: number;
  atRiskRate: number;
  atRiskCustomers: AtRiskCustomer[];
};

function DonutChart({ healthy, atRisk, churned }: { healthy: number; atRisk: number; churned: number }) {
  const total = healthy + atRisk + churned;
  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="12" />
      </svg>
    );
  }

  const r = 38;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;
  const gap = 2; // px gap between segments

  const segments = [
    { count: healthy, color: "#10b981", label: "Healthy" },
    { count: atRisk,  color: "#f59e0b", label: "At-risk" },
    { count: churned, color: "#ef4444", label: "Churned" },
  ];

  let offset = 0; // starts at top (-90deg rotation applied via transform)
  const arcs = segments.map((seg) => {
    const dash = (seg.count / total) * circumference;
    const arc = { ...seg, dash: Math.max(dash - gap, 0), offset };
    offset += dash;
    return arc;
  });

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      {arcs.map((arc) => (
        <circle
          key={arc.label}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth="12"
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function ChurnWidget({ data }: { data: ChurnData }) {
  const [expanded, setExpanded] = React.useState(false);
  const total = data.healthy + data.atRisk + data.churned;

  return (
    <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-[#f1f5f9]">
        <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
        <p className="text-[13px] font-bold text-[#0f172a]">Churn &amp; At-Risk Analysis</p>
      </div>
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-6">

          {/* Donut chart */}
          <div className="relative shrink-0">
            <DonutChart healthy={data.healthy} atRisk={data.atRisk} churned={data.churned} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[18px] font-bold text-[#0f172a] leading-none">{data.atRiskRate}%</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8] mt-0.5">At-risk</span>
            </div>
          </div>

          {/* Legend + counts */}
          <div className="flex-1 space-y-2.5">
            {[
              { label: "Healthy",  count: data.healthy,  color: "#10b981", bg: "bg-[#d1fae5]" },
              { label: "At-risk",  count: data.atRisk,   color: "#f59e0b", bg: "bg-[#fef3c7]" },
              { label: "Churned",  count: data.churned,  color: "#ef4444", bg: "bg-[#fee2e2]" },
            ].map(({ label, count, color, bg }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full shrink-0`} style={{ backgroundColor: color }} />
                  <span className="text-[12px] text-[#475569]">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#0f172a]">{count.toLocaleString()}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${bg}`} style={{ color }}>
                    {total > 0 ? `${Math.round((count / total) * 100)}%` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* At-risk customer list */}
        {data.atRiskCustomers.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#64748b] hover:text-primary transition-colors mb-2"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide" : "Show"} {data.atRiskCustomers.length} at-risk member{data.atRiskCustomers.length !== 1 ? "s" : ""}
            </button>

            {expanded && (
              <div className="border border-[#f1f5f9] rounded-[8px] overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                      <th className="text-left px-3 py-2 font-semibold text-[#94a3b8]">Member</th>
                      <th className="text-right px-3 py-2 font-semibold text-[#94a3b8]">Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.atRiskCustomers.map((c) => (
                      <tr key={c.id} className="border-b border-[#f8fafc] last:border-0 hover:bg-[#f8fafc]">
                        <td className="px-3 py-2">
                          <p className="font-medium text-[#0f172a] truncate max-w-[180px]">{c.fullName || "—"}</p>
                          <p className="text-[10px] text-[#94a3b8] truncate max-w-[180px]">{c.email}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-[#64748b]">
                          {daysSince(c.updatedAt)}d ago
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <Link
          href="/customers?status=inactive"
          className="flex items-center gap-1 text-[12px] font-bold text-primary hover:underline mt-3"
        >
          View all inactive members <ExternalLink className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
