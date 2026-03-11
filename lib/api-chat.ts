import { apiFetch } from "@/lib/backend";

export type ChatResponse = {
  response: string;
  intent?: string | null;
  session_id?: string | null;
  fallback?: boolean;
  report_data?: Record<string, unknown>[];
};

export async function sendChatMessage(
  message: string,
  sessionId?: string | null
): Promise<ChatResponse> {
  const res = await apiFetch("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: message.trim(), session_id: sessionId ?? null }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Chat failed (${res.status})`);
  }
  return data as ChatResponse;
}

export async function exportChatReport(
  reportData: Record<string, unknown>[],
  filename?: string
): Promise<Blob> {
  const res = await apiFetch("/api/v1/chat/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      report_data: reportData,
      filename: filename ?? `report-${Date.now()}.csv`,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
  }
  return res.blob();
}
