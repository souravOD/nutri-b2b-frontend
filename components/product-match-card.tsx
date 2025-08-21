"use client"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import MatchScore from "./match-score"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, MinusCircle, NotebookPen } from "lucide-react"

type ProductMatchCardProps = {
  imageUrl?: string
  name?: string
  brand?: string
  sku?: string
  score?: number
  passTags?: string[]
  warnTags?: string[]
  failTags?: string[]
}

export default function ProductMatchCard({
  imageUrl = "/diverse-products-still-life.png",
  name = "Product",
  brand = "Brand",
  sku = "SKU-001",
  score = 0,
  passTags = [],
  warnTags = [],
  failTags = [],
}: ProductMatchCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">{name}</CardTitle>
        <div className="text-xs text-muted-foreground">
          {brand} • {sku}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Image
          src={imageUrl || "/placeholder.svg"}
          alt={`${name} image`}
          width={400}
          height={300}
          className="w-full aspect-[4/3] object-cover rounded"
        />
        <MatchScore score={score} />
        <div className="flex flex-wrap gap-1">
          {passTags.map((t) => (
            <Badge key={`p-${t}`} className="bg-emerald-100 text-emerald-700">
              {t}
            </Badge>
          ))}
          {warnTags.map((t) => (
            <Badge key={`w-${t}`} className="bg-amber-100 text-amber-700">
              {t}
            </Badge>
          ))}
          {failTags.map((t) => (
            <Badge key={`f-${t}`} className="bg-rose-100 text-rose-700">
              {t}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="mt-auto gap-2">
        <Button size="sm" variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          {"Details"}
        </Button>
        <Button size="sm" variant="secondary">
          <NotebookPen className="h-4 w-4 mr-2" />
          {"Notes"}
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto text-rose-600">
          <MinusCircle className="h-4 w-4 mr-2" />
          {"Exclude"}
        </Button>
      </CardFooter>
    </Card>
  )
}
