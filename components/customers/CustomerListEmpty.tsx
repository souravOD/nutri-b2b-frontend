"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Plus } from "lucide-react"

type Props = {
  onAddCustomer?: () => void
}

export default function CustomerListEmpty({ onAddCustomer }: Props) {
  return (
    <Card className="border-dashed border-2 border-[#e2e8f0] rounded-xl bg-[#f8fafc]">
      <CardContent className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-[#2073BD]/10 p-5 mb-6">
          <Users className="h-10 w-10 text-[#2073BD]" />
        </div>
        <h3 className="text-xl font-semibold text-[#0f172a] mb-2">No customers found</h3>
        <p className="text-muted-foreground mb-8 max-w-md">
          Get started by adding your first customer. You can import customer data or create them individually.
        </p>
        <Button
          onClick={onAddCustomer}
          className="gap-2 bg-[#2073BD] hover:bg-[#1a5f9e] text-white"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </CardContent>
    </Card>
  )
}
