"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Plus } from "lucide-react"

type Props = {
  onAddCustomer?: () => void
}

export default function CustomerListEmpty({ onAddCustomer }: Props) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No customers found</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Get started by adding your first customer. You can import customer data or create them individually.
        </p>
        <Button onClick={onAddCustomer} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </CardContent>
    </Card>
  )
}
