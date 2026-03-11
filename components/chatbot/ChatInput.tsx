"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

type Props = {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function ChatInput({ onSend, disabled, placeholder = "Type a message..." }: Props) {
  const [value, setValue] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-[#e2e8f0] bg-white">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 border-[#e2e8f0]"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !value.trim()}
        className="bg-[#00438f] hover:bg-[#003366] shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
