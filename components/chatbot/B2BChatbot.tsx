"use client";

import * as React from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendChatMessage, exportChatReport, type ChatResponse } from "@/lib/api-chat";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ChatSuggestions from "./ChatSuggestions";

type Message = { role: "user" | "assistant"; content: string; fallback?: boolean };

export default function B2BChatbot() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showSuggestions, setShowSuggestions] = React.useState(true);
  const [lastReportData, setLastReportData] = React.useState<Record<string, unknown>[] | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = React.useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setShowSuggestions(false);
    setLoading(true);
    try {
      const res: ChatResponse = await sendChatMessage(text, sessionId);
      if (res.session_id) setSessionId(res.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.response ?? "No response.", fallback: res.fallback },
      ]);
      if (res.report_data && Array.isArray(res.report_data) && res.report_data.length > 0) {
        setLastReportData(res.report_data);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "[Report data available. Use Export CSV to download.]",
            fallback: false,
          },
        ]);
      } else {
        setLastReportData(null);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "The chat service is temporarily unavailable. Please try again later.",
          fallback: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleExportReport = React.useCallback(async () => {
    if (!lastReportData || lastReportData.length === 0) return;
    try {
      const blob = await exportChatReport(lastReportData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, [lastReportData]);

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-[#003366] z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[70vh] flex flex-col rounded-2xl border border-[#e2e8f0] bg-white shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
        <span className="font-semibold text-[#0f172a]">NutriB2B Assistant</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#64748b] hover:text-[#0f172a]"
          onClick={() => setOpen(false)}
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fafafa]">
        {messages.length === 0 && (
          <div className="text-sm text-[#64748b]">
            <p className="mb-2">Hello! I can help you with product recommendations, customer matching, and nutritional analysis.</p>
            <p className="text-xs">Try asking:</p>
          </div>
        )}
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} fallback={m.fallback} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[#f1f5f9] border border-[#e2e8f0] px-4 py-2.5 text-sm text-[#64748b]">
              Thinking...
            </div>
          </div>
        )}
        {showSuggestions && messages.length === 0 && <ChatSuggestions onSelect={handleSend} />}
      </div>
      {lastReportData && lastReportData.length > 0 && (
        <div className="px-3 py-2 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <Button
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary/10"
            onClick={handleExportReport}
          >
            Export CSV
          </Button>
        </div>
      )}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
