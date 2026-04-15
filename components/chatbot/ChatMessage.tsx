"use client";

import { cn } from "@/lib/utils";

type Props = {
  role: "user" | "assistant";
  content: string;
  fallback?: boolean;
};

export default function ChatMessage({ role, content, fallback }: Props) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-white"
            : "bg-[#f1f5f9] text-[#0f172a] border border-[#e2e8f0]"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {fallback && !isUser && (
          <p className="mt-2 text-xs text-[#64748b]">Service temporarily unavailable.</p>
        )}
      </div>
    </div>
  );
}
