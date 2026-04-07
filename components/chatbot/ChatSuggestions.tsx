"use client";

import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Products for diabetics",
  "Customers with nut allergies",
  "Peanut-free products",
  "Customer health analytics",
];

type Props = {
  onSelect: (text: string) => void;
};

export default function ChatSuggestions({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2 p-3">
      {SUGGESTIONS.map((text) => (
        <Button
          key={text}
          variant="outline"
          size="sm"
          className="border-[#e2e8f0] text-[#475569] hover:bg-[#f8fafc] hover:text-[#00438f]"
          onClick={() => onSelect(text)}
        >
          {text}
        </Button>
      ))}
    </div>
  );
}
