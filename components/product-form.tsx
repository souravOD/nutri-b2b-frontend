"use client"

import * as React from "react"
import { z } from "zod"
import {
  useForm,
  Controller,
  type SubmitHandler,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/backend"

/** allow "", string, or number */
const NumLike = z.union([z.string(), z.number(), z.literal("")])
const StrOrBlank = z.union([z.string(), z.literal("")])

/** Required: name, sku, status. Everything else optional. */
const schema = z.object({
  name: z.string().trim().min(1, "Required"),
  sku: z.string().trim().min(1, "Required"),
  status: z.enum(["active", "inactive"]),

  // arrays we collect via CSV fields
  tags: z.array(z.string()).optional(),
  allergens_csv: z.string().optional(),
  certifications_csv: z.string().optional(),
  regulatory_codes_csv: z.string().optional(),
  ingredients_csv: z.string().optional(),

  // misc
  brand: z.string().optional(),
  barcode: z.string().optional(),
  gtin_type: z.enum(["UPC", "EAN", "ISBN"]).optional(),
  price: NumLike.optional(),
  currency: StrOrBlank.optional(),
  category: z.string().optional(), // free input; we treat as categoryId if UUID
  description: z.string().optional(),
  serving_size: z.string().optional(),
  package_weight: z.string().optional(),
  source_url: z.union([z.string().url(), z.literal("")]).optional(),

  // relationship IDs (UUID or "")
  sub_category_id: z.union([z.string().uuid(), z.literal("")]).optional(),
  cuisine_id: z.union([z.string().uuid(), z.literal("")]).optional(),
  market_id: z.union([z.string().uuid(), z.literal("")]).optional(),

  // structured nutrition
  n_calories: NumLike.optional(),
  n_protein_g: NumLike.optional(),
  n_fat_g: NumLike.optional(),
  n_carbs_g: NumLike.optional(),
  n_sugar_g: NumLike.optional(),
  n_added_sugar_g: NumLike.optional(),
  n_saturated_fat_g: NumLike.optional(),
  n_sodium_mg: NumLike.optional(),
  n_potassium_mg: NumLike.optional(),
  n_phosphorus_mg: NumLike.optional(),
})

type FormValues = z.infer<typeof schema>

type ProductFormProps = {
  mode?: "create" | "edit"
  initialValues?: Partial<FormValues>
  onSaved?: () => void
  productId?: string                // for edit, target product
  open?: boolean                    // controlled dialog (for Edit from row)
  onOpenChange?: (open: boolean) => void
  renderTrigger?: boolean           // hide built-in button when embedding
}

export default function ProductForm({
  mode = "create",
  initialValues = {
    name: "",
    sku: "",
    status: "active",
    category: "",
    description: "",
    tags: [],
  },
  onSaved = () => {},
  productId,
  open: controlledOpen,
  onOpenChange,
  renderTrigger = true,
}: ProductFormProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [serverError, setServerError] = React.useState<string | null>(null)
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      sku: "",
      status: "active",

      brand: "",
      barcode: "",
      gtin_type: undefined,
      price: "",
      currency: "USD",
      category: "",
      description: "",
      serving_size: "",
      package_weight: "",
      source_url: "",
      tags: [],

      allergens_csv: "",
      certifications_csv: "",
      regulatory_codes_csv: "",
      ingredients_csv: "",

      sub_category_id: "",
      cuisine_id: "",
      market_id: "",

      n_calories: "",
      n_protein_g: "",
      n_fat_g: "",
      n_carbs_g: "",
      n_sugar_g: "",
      n_added_sugar_g: "",
      n_saturated_fat_g: "",
      n_sodium_mg: "",
      n_potassium_mg: "",
      n_phosphorus_mg: "",
    },
  })

  const DEFAULTS: FormValues = form.getValues()

  // Reset values when dialog first opens
  const openedOnceRef = React.useRef(false)
  React.useEffect(() => {
    if (open && !openedOnceRef.current) {
      form.reset({ ...DEFAULTS, ...(initialValues || {}) })
      setServerError(null)
      openedOnceRef.current = true
    }
    if (!open) openedOnceRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toArr = (csv?: string) =>
    csv && csv.trim()
      ? csv.split(",").map((s) => s.trim()).filter(Boolean)
      : []

  const maybeUuid = (s?: string) =>
    s &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s
    )
      ? s
      : null

  const strOrNull = (s?: string) => (s && s.trim() ? s.trim() : null)
  const numOrNull = (v: unknown) => {
    if (v === "" || v == null) return null
    const n = typeof v === "string" ? Number(v) : (v as number)
    return Number.isFinite(n) ? n : null
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setServerError(null)
    try {
      const nutrition = {
        calories:         numOrNull(values.n_calories),
        protein_g:        numOrNull(values.n_protein_g),
        fat_g:            numOrNull(values.n_fat_g),
        carbs_g:          numOrNull(values.n_carbs_g),
        sugar_g:          numOrNull(values.n_sugar_g),
        added_sugar_g:    numOrNull(values.n_added_sugar_g),
        saturated_fat_g:  numOrNull(values.n_saturated_fat_g),
        sodium_mg:        numOrNull(values.n_sodium_mg),
        potassium_mg:     numOrNull(values.n_potassium_mg),
        phosphorus_mg:    numOrNull(values.n_phosphorus_mg),
      }

      const body = {
        external_id: values.sku.trim(),
        name: values.name.trim(),
        status: values.status,

        category_id:     maybeUuid(values.category),
        sub_category_id: maybeUuid(values.sub_category_id),
        cuisine_id:      maybeUuid(values.cuisine_id),
        market_id:       maybeUuid(values.market_id),

        description:    strOrNull(values.description) ?? "",
        brand:          strOrNull(values.brand),
        barcode:        strOrNull(values.barcode),
        gtin_type:      strOrNull(values.gtin_type as any),

        price:    numOrNull(values.price),
        currency: (values.currency && values.currency.trim()
                    ? values.currency.trim().toUpperCase()
                    : "USD"),

        serving_size:   strOrNull(values.serving_size),
        package_weight: strOrNull(values.package_weight),

        dietary_tags:     values.tags ?? [],
        allergens:        toArr(values.allergens_csv),
        certifications:   toArr(values.certifications_csv),
        regulatory_codes: toArr(values.regulatory_codes_csv),
        ingredients:      toArr(values.ingredients_csv),

        nutrition,

        source_url: strOrNull(values.source_url),
      }

      const endpoint = (mode === "edit" && productId) ? `/products/${productId}` : "/products";
      const method = (mode === "edit" && productId) ? "PUT" : "POST";

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        // Prefer structured Problem+JSON; fallback to text.
        let message = "Failed to save product."
        const ctype = res.headers.get("content-type") || ""
        if (ctype.includes("application/json")) {
          const data = await res.json().catch(() => ({} as any))
          message =
            data?.detail ||
            data?.message ||
            data?.error ||
            JSON.stringify(data)
        } else {
          message = await res.text()
        }
        setServerError(message)
        toast({ title: "Save failed", description: message, variant: "destructive" })
        return
      }

      toast({ title: "Saved", description: "Product has been saved." })
      setOpen(false)
      onSaved()
    } catch (e: any) {
      const message = e?.message || "Failed to save product."
      setServerError(message)
      toast({ title: "Error", description: message, variant: "destructive" })
    }
  }

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {renderTrigger && (
        <DialogTrigger asChild>
          <Button>{mode === "create" ? "Add Product" : "Edit Product"}</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Product" : "Edit Product"}</DialogTitle>
        </DialogHeader>

        {/* Friendly server error box */}
        {serverError && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {serverError}
          </div>
        )}

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Required fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input id="name" aria-invalid={!!fieldState.error} {...field} />
                    {fieldState.error && (
                      <span className="text-xs text-rose-600">{fieldState.error.message}</span>
                    )}
                  </>
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku">SKU / External ID</Label>
              <Controller
                name="sku"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input id="sku" aria-invalid={!!fieldState.error} {...field} />
                    {fieldState.error && (
                      <span className="text-xs text-rose-600">{fieldState.error.message}</span>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as FormValues["status"])}
                    >
                      <SelectTrigger className="w-full" aria-invalid={!!fieldState.error}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <span className="text-xs text-rose-600">
                        {fieldState.error.message as string}
                      </span>
                    )}
                  </>
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label>Category ID (UUID)</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => <Input placeholder="optional" {...field} />}
              />
            </div>
          </div>

          {/* Relationship IDs */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Subcategory ID (UUID)</Label>
              <Controller
                name="sub_category_id"
                control={control}
                render={({ field }) => <Input placeholder="optional" {...field} />}
              />
            </div>
            <div className="grid gap-2">
              <Label>Cuisine ID (UUID)</Label>
              <Controller
                name="cuisine_id"
                control={control}
                render={({ field }) => <Input placeholder="optional" {...field} />}
              />
            </div>
            <div className="grid gap-2">
              <Label>Market ID (UUID)</Label>
              <Controller
                name="market_id"
                control={control}
                render={({ field }) => <Input placeholder="optional" {...field} />}
              />
            </div>
          </div>

          {/* Basics */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Textarea rows={3} {...field} />}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Brand</Label>
              <Controller
                name="brand"
                control={control}
                render={({ field }) => <Input {...field} />}
              />
            </div>
            <div>
              <Label>Barcode</Label>
              <Controller
                name="barcode"
                control={control}
                render={({ field }) => <Input {...field} />}
              />
            </div>
            <div>
              <Label>GTIN Type</Label>
              <Select
                value={form.getValues("gtin_type")}
                onValueChange={(v) =>
                  form.setValue("gtin_type", v as any, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPC">UPC</SelectItem>
                  <SelectItem value="EAN">EAN</SelectItem>
                  <SelectItem value="ISBN">ISBN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price</Label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <Input type="text" inputMode="decimal" placeholder="e.g. 1.49" {...field} />
                )}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Input maxLength={3} placeholder="USD" {...field} />
                )}
              />
            </div>
            <div>
              <Label>Serving Size</Label>
              <Controller
                name="serving_size"
                control={control}
                render={({ field }) => <Input {...field} />}
              />
            </div>
            <div>
              <Label>Package Weight</Label>
              <Controller
                name="package_weight"
                control={control}
                render={({ field }) => <Input {...field} />}
              />
            </div>
          </div>

          {/* CSV → arrays */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Allergens (CSV)</Label>
              <Controller
                name="allergens_csv"
                control={control}
                render={({ field }) => (
                  <Input placeholder="milk, egg, wheat" {...field} />
                )}
              />
            </div>
            <div>
              <Label>Ingredients (CSV)</Label>
              <Controller
                name="ingredients_csv"
                control={control}
                render={({ field }) => (
                  <Input placeholder="Water, Whey Protein Isolate, Cocoa" {...field} />
                )}
              />
            </div>
            <div>
              <Label>Certifications (CSV)</Label>
              <Controller
                name="certifications_csv"
                control={control}
                render={({ field }) => (
                  <Input placeholder="non-gmo, kosher" {...field} />
                )}
              />
            </div>
            <div>
              <Label>Regulatory Codes (CSV)</Label>
              <Controller
                name="regulatory_codes_csv"
                control={control}
                render={({ field }) => (
                  <Input placeholder="21CFR101.9" {...field} />
                )}
              />
            </div>
          </div>

          {/* Structured Nutrition */}
          <div className="grid gap-2">
            <Label>Nutrition (per serving)</Label>
            <div className="grid md:grid-cols-3 gap-3">
              <Controller name="n_calories"        control={control} render={({ field }) => <Input placeholder="calories" {...field} />} />
              <Controller name="n_protein_g"        control={control} render={({ field }) => <Input placeholder="protein_g" {...field} />} />
              <Controller name="n_fat_g"            control={control} render={({ field }) => <Input placeholder="fat_g" {...field} />} />
              <Controller name="n_carbs_g"          control={control} render={({ field }) => <Input placeholder="carbs_g" {...field} />} />
              <Controller name="n_sugar_g"          control={control} render={({ field }) => <Input placeholder="sugar_g" {...field} />} />
              <Controller name="n_added_sugar_g"    control={control} render={({ field }) => <Input placeholder="added_sugar_g" {...field} />} />
              <Controller name="n_saturated_fat_g"  control={control} render={({ field }) => <Input placeholder="saturated_fat_g" {...field} />} />
              <Controller name="n_sodium_mg"        control={control} render={({ field }) => <Input placeholder="sodium_mg" {...field} />} />
              <Controller name="n_potassium_mg"     control={control} render={({ field }) => <Input placeholder="potassium_mg" {...field} />} />
              <Controller name="n_phosphorus_mg"    control={control} render={({ field }) => <Input placeholder="phosphorus_mg" {...field} />} />
            </div>
          </div>

          {/* Source and Tags */}
          <div className="grid gap-2">
            <Label>Source URL</Label>
            <Controller
              name="source_url"
              control={control}
              render={({ field }) => (
                <Input placeholder="https://example.com/product" {...field} />
              )}
            />
            {errors.source_url && (
              <span className="text-xs text-rose-600">
                {errors.source_url.message as string}
              </span>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Dietary Tags</Label>
            <div className="flex gap-2">
              <TagInput form={form} />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {(form.watch("tags") || []).map((t, i) => (
                <Badge key={`${t}-${i}`} variant="secondary" className="gap-2">
                  {t}
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(form.getValues("tags") || [])]
                      next.splice(i, 1)
                      form.setValue("tags", next, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TagInput({
  form,
}: {
  form: ReturnType<typeof useForm<FormValues>>
}) {
  const [tag, setTag] = React.useState("")
  return (
    <>
      <Input
        placeholder="e.g. low_fodmap"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            if (tag.trim()) {
              form.setValue(
                "tags",
                [...(form.getValues("tags") ?? []), tag.trim()],
                { shouldDirty: true, shouldValidate: true }
              )
              setTag("")
            }
          }
        }}
      />
      <Button
        type="button"
        onClick={() => {
          if (tag.trim()) {
            form.setValue(
              "tags",
              [...(form.getValues("tags") ?? []), tag.trim()],
              { shouldDirty: true, shouldValidate: true }
            )
            setTag("")
          }
        }}
      >
        Add
      </Button>
    </>
  )
}
