"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

interface ProductDetailsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: any | null
}

export default function ProductDetailsDrawer({ open, onOpenChange, product }: ProductDetailsDrawerProps) {
  if (!product) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{product.name}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {product.category} • {product.sku}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {product.imageUrl && (
            <div className="flex justify-center">
              <Image
                src={product.imageUrl || "/placeholder.svg?height=200&width=200"}
                alt={product.name}
                width={200}
                height={200}
                className="rounded-lg object-cover"
              />
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-3">Quick Facts</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Brand:</span>
                <div className="font-medium">{product.brand || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Barcode:</span>
                <div className="font-mono text-xs">{product.barcode || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Serving Size:</span>
                <div className="font-medium">{product.servingSize || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Package Size:</span>
                <div className="font-medium">{product.packageSize || "—"}</div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-3">Match Score</h3>
            <div className="flex items-center gap-2">
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-lg font-bold">
                {product.matchScore}%
              </div>
              <span className="text-sm text-muted-foreground">
                {product.matchScore >= 80
                  ? "Excellent match"
                  : product.matchScore >= 60
                    ? "Good match"
                    : product.matchScore >= 40
                      ? "Fair match"
                      : "Poor match"}
              </span>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-3">Compliance</h3>
            <div className="space-y-3">
              {product.diets && product.diets.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Diets:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.diets.map((diet: string) => (
                      <Badge key={diet} variant="secondary" className="bg-green-100 text-green-700">
                        {diet}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.certifications && product.certifications.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Certifications:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.certifications.map((cert: string) => (
                      <Badge key={cert} variant="secondary" className="bg-blue-100 text-blue-700">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.allergens && product.allergens.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Allergens:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.allergens.map((allergen: string) => (
                      <Badge key={allergen} variant="destructive">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {product.nutrition && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Nutrition Facts</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium mb-2">Per serving ({product.servingSize})</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span>Calories:</span>
                      <span className="font-medium">{product.nutrition.calories}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Protein:</span>
                      <span className="font-medium">{product.nutrition.protein}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Carbs:</span>
                      <span className="font-medium">{product.nutrition.carbs}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fat:</span>
                      <span className="font-medium">{product.nutrition.fat}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sugar:</span>
                      <span className="font-medium">{product.nutrition.sugar}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sodium:</span>
                      <span className="font-medium">{product.nutrition.sodium}mg</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {product.ingredients && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Ingredients</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed">{product.ingredients}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
