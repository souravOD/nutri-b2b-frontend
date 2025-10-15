"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

const fmtCurrency = (v?: string | number, currency = "USD") => {
  if (v === undefined || v === null || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n); }
  catch { return String(n); }
};

interface ProductDetailsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: any | null
  
}

export default function ProductDetailsDrawer({ open, onOpenChange, product }: ProductDetailsDrawerProps) {
  if (!product) return null
  const n = product.nutrition ?? {};
  const fmt = (x?: number, unit = "") =>
  typeof x === "number" && Number.isFinite(x) ? `${x}${unit}` : "—";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <SheetTitle>{product.name}</SheetTitle>
            {product.status && (
              <Badge className={product.status === "inactive" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}>
                {product.status}
              </Badge>
            )}
          </div>
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
                <span className="text-muted-foreground">Package Weight:</span>
                <div className="font-medium">{product.packageWeight || "—"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Price:</span>
                <div className="font-medium">
                  {fmtCurrency(product.price, product.currency || "USD") || "—"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">GTIN Type:</span>
                <div className="font-medium">{product.gtinType || "—"}</div>
              </div>
            </div>

            {(product.categoryId || product.subCategoryId || product.cuisineId || product.marketId) && (
              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <span className="text-muted-foreground">Category ID:</span>
                  <div className="font-medium">{product.categoryId || "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Subcategory ID:</span>
                  <div className="font-medium">{product.subCategoryId || "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Cuisine ID:</span>
                  <div className="font-medium">{product.cuisineId || "—"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Market ID:</span>
                  <div className="font-medium">{product.marketId || "—"}</div>
                </div>
              </div>
            )}

          </div>
          
          {product.description ? (
            <div>
              <h3 className="font-semibold mb-3">Description</h3>
              <p className="text-sm leading-relaxed">{product.description}</p>
            </div>
          ) : null}

          <Separator />

          <div>
            {typeof product.matchScore === "number" && (
              <>
                <h3 className="font-semibold mb-3">Match Score</h3>
                <div className="flex items-center gap-2">
                  <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-lg font-bold">
                    {product.matchScore}%
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Based on your matching rules and customer profile.
                  </span>
                </div>
                <Separator />
              </>
            )}
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

              {product.regulatoryCodes && product.regulatoryCodes.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Regulatory Codes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.regulatoryCodes.map((code: string) => (
                      <Badge key={code} variant="secondary">{code}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {(product.dietaryTags?.length || product.tags?.length) ? (
            <div>
              <h3 className="font-semibold mb-3">Dietary Tags</h3>
              <div className="flex flex-wrap gap-1">
                {(product.dietaryTags ?? product.tags ?? []).map((t: string) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          {product.nutrition && (
            <>
            
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Nutrition Facts</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Calories:</span><div className="font-medium">{fmt(n.calories)}</div></div>
                  <div><span className="text-muted-foreground">Protein:</span><div className="font-medium">{fmt(n.protein_g, " g")}</div></div>
                  <div><span className="text-muted-foreground">Carbs:</span><div className="font-medium">{fmt(n.carbs_g, " g")}</div></div>
                  <div><span className="text-muted-foreground">Fat:</span><div className="font-medium">{fmt(n.fat_g, " g")}</div></div>
                  <div><span className="text-muted-foreground">Sugar:</span><div className="font-medium">{fmt(n.sugar_g, " g")}</div></div>
                  <div><span className="text-muted-foreground">Sodium:</span><div className="font-medium">{fmt(n.sodium_mg, " mg")}</div></div>
                  <div><span className="text-muted-foreground">Added Sugar:</span><div className="font-medium">{fmt(n.added_sugar_g, " g")}</div></div>
                  <div><span className="text-muted-foreground">Saturated Fat:</span><div className="font-medium">{fmt(n.saturated_fat_g, " g")}</div></div>
                  <div><span className="text-muted-foreground">Potassium:</span><div className="font-medium">{fmt(n.potassium_mg, " mg")}</div></div>
                  <div><span className="text-muted-foreground">Phosphorus:</span><div className="font-medium">{fmt(n.phosphorus_mg, " mg")}</div></div>
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
                  {Array.isArray(product.ingredients) && product.ingredients.length > 0 ? (
                    <p className="text-sm leading-relaxed">{product.ingredients.join(", ")}</p>
                  ) : typeof product.ingredients === "string" && product.ingredients.trim() ? (
                    <p className="text-sm leading-relaxed">{product.ingredients}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </div>
              {product.sourceUrl ? (
                <div className="mt-4">
                  <a
                    className="text-sm text-blue-600 hover:underline break-all"
                    href={product.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source: {product.sourceUrl}
                  </a>
                </div>
              ) : null}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
