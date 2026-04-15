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
import { X, Info, FolderTree, DollarSign, Beaker, Apple, Tag } from "lucide-react"
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
  gtin_type: z.union([z.enum(["UPC", "EAN", "ISBN"]), z.literal("")]).optional(),
  price: NumLike.optional(),
  currency: StrOrBlank.optional(),
  category: z.string().optional(),
  sub_category_id: z.string().optional(),
  cuisine_id: z.string().optional(),
  market_id: z.string().optional(),
  description: z.string().optional(),
  serving_size: z.string().optional(),
  package_weight: z.string().optional(),
  source_url: z.union([z.string().url(), z.literal("")]).optional(),

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
      sub_category_id: "",
      cuisine_id: "",
      market_id: "",
      description: "",
      serving_size: "",
      package_weight: "",
      source_url: "",
      tags: [],

      allergens_csv: "",
      certifications_csv: "",
      regulatory_codes_csv: "",
      ingredients_csv: "",

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
      <DialogContent className="!w-[75vw] !max-w-[1500px] sm:!max-w-[75vw] md:!max-w-[1500px] min-h-[88vh] max-h-[96vh] overflow-y-auto rounded-xl border-[#e2e8f0] px-12 py-8" overlayClassName="backdrop-blur-sm">
        <DialogHeader className="pb-5 pt-5 border-b border-[#e2e8f0]">
          <DialogTitle className="text-[20px] font-bold text-[#0f172a]">{mode === "create" ? "Add New Product" : "Edit Product"}</DialogTitle>
          <p className="text-[14px] text-[#64748b] leading-[20px]">
            {mode === "create" ? "Enter product specifications and nutritional data." : "Update product details."}
          </p>
        </DialogHeader>

        {serverError && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {serverError}
          </div>
        )}

        <form
          className="grid gap-8"
          onSubmit={handleSubmit(onSubmit, (err) => {
            const msg = Object.values(err || {}).map((e: any) => e?.message).filter(Boolean).join("; ") || "Please fix the errors below.";
            toast({ title: "Validation failed", description: msg, variant: "destructive" });
          })}
        >
          {/* Section: Basic Information */}
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0f172a] border-b border-[#e2e8f0] pb-2 uppercase tracking-wide">
              <Info className="h-4 w-4 text-primary" />
              Basic Information
            </h3>
            <div className="grid gap-6">
              <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
                <div>
                  <Label htmlFor="name" className="text-[14px] font-semibold text-[#0f172a]">Product Name</Label>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input id="name" placeholder="e.g. Organic Almond Milk 1L" aria-invalid={!!fieldState.error} className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />
                        {fieldState.error && <span className="text-xs text-rose-600">{fieldState.error.message}</span>}
                      </>
                    )}
                  />
                </div>
                <div>
                  <Label className="text-[14px] font-semibold text-[#0f172a]">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Select value={field.value} onValueChange={(v) => field.onChange(v as FormValues["status"])}>
                          <SelectTrigger className="w-full border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" aria-invalid={!!fieldState.error}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        {fieldState.error && <span className="text-xs text-rose-600">{fieldState.error.message as string}</span>}
                      </>
                    )}
                  />
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <Label className="text-[14px] font-semibold text-[#0f172a]">SKU / External ID</Label>
                  <Controller
                    name="sku"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <Input placeholder="SKU-XXXXX" aria-invalid={!!fieldState.error} className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />
                        {fieldState.error && <span className="text-xs text-rose-600">{fieldState.error.message}</span>}
                      </>
                    )}
                  />
                </div>
                <div>
                  <Label className="text-[14px] font-semibold text-[#0f172a]">Brand</Label>
                  <Controller name="brand" control={control} render={({ field }) => <Input placeholder="Member's Mark" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
                </div>
                <div>
                  <Label className="text-[14px] font-semibold text-[#0f172a]">Barcode / EAN</Label>
                  <Controller name="barcode" control={control} render={({ field }) => <Input placeholder="012345678901" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
                </div>
              </div>
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Description</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => <Textarea rows={3} placeholder="Provide a detailed product description..." className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />}
                />
              </div>
            </div>
          </div>

          {/* Section: Classification & IDs */}
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0f172a] border-b border-[#e2e8f0] pb-2 uppercase tracking-wide">
              <FolderTree className="h-4 w-4 text-primary" />
              Classification & IDs
            </h3>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="space-y-2">
                <Label className="block min-h-[2.5rem] text-xs font-medium text-[#0f172a]">Category ID (UUID)</Label>
                <Controller name="category" control={control} render={({ field }) => <Input placeholder="Optional" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="space-y-2">
                <Label className="block min-h-[2.5rem] text-xs font-medium text-[#0f172a]">Subcategory ID (UUID)</Label>
                <Controller name="sub_category_id" control={control} render={({ field }) => <Input placeholder="Optional" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="space-y-2">
                <Label className="block min-h-[2.5rem] text-xs font-medium text-[#0f172a]">Cuisine ID (UUID)</Label>
                <Controller name="cuisine_id" control={control} render={({ field }) => <Input placeholder="Optional" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="space-y-2">
                <Label className="block min-h-[2.5rem] text-xs font-medium text-[#0f172a]">Market ID (UUID)</Label>
                <Controller name="market_id" control={control} render={({ field }) => <Input placeholder="Optional" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
            </div>
          </div>

          {/* Section: Pricing & Logistics */}
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0f172a] border-b border-[#e2e8f0] pb-2 uppercase tracking-wide">
              <DollarSign className="h-4 w-4 text-primary" />
              Pricing & Logistics
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Price</Label>
                <Controller
                  name="price"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input type="text" inputMode="decimal" placeholder="0.00" className="pl-7 border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />
                    </div>
                  )}
                />
              </div>
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Currency</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value && field.value.trim() ? field.value : "USD"} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]"><SelectValue placeholder="USD" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">GTIN Type</Label>
                <Select
                  value={form.getValues("gtin_type") ?? ""}
                  onValueChange={(v) => form.setValue("gtin_type", v as any, { shouldValidate: true, shouldDirty: true })}
                >
                  <SelectTrigger className="w-full border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPC">UPC</SelectItem>
                    <SelectItem value="EAN">EAN</SelectItem>
                    <SelectItem value="ISBN">ISBN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Serving Size</Label>
                <Controller name="serving_size" control={control} render={({ field }) => <Input placeholder="e.g. 1 cup (240ml)" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Package Weight</Label>
                <Controller name="package_weight" control={control} render={({ field }) => <Input placeholder="e.g. 500g" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Source URL</Label>
                <Controller
                  name="source_url"
                  control={control}
                  render={({ field }) => <Input placeholder="https://example.com/product" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />}
                />
                {errors.source_url && <span className="text-xs text-rose-600">{errors.source_url.message as string}</span>}
              </div>
            </div>
          </div>

          {/* Section: Ingredients & Compliance */}
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0f172a] border-b border-[#e2e8f0] pb-2">
              <Beaker className="h-4 w-4 text-primary" />
              Ingredients & Compliance
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Allergens (CSV)</Label>
                <Controller name="allergens_csv" control={control} render={({ field }) => <Input placeholder="Milk, Soy, Nuts" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Certifications (CSV)</Label>
                <Controller name="certifications_csv" control={control} render={({ field }) => <Input placeholder="Organic, Non-GMO, Halal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Ingredients (CSV)</Label>
                <Controller
                  name="ingredients_csv"
                  control={control}
                  render={({ field }) => <Textarea rows={3} placeholder="Water, Almonds, Sea Salt..." className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />}
                />
              </div>
              <div>
                <Label className="text-[14px] font-semibold text-[#0f172a]">Regulatory Codes (CSV)</Label>
                <Controller
                  name="regulatory_codes_csv"
                  control={control}
                  render={({ field }) => <Textarea rows={3} placeholder="FDA-102, USDA-88..." className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />}
                />
              </div>
            </div>
          </div>

          {/* Section: Nutrition */}
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0f172a] border-b border-[#e2e8f0] pb-2">
              <Apple className="h-4 w-4 text-primary" />
              Nutrition (per serving)
            </h3>
            <div className="grid gap-6 md:grid-cols-5">
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Calories</Label>
                <Controller name="n_calories" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Protein (g)</Label>
                <Controller name="n_protein_g" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Total Fat (g)</Label>
                <Controller name="n_fat_g" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Saturated Fat (g)</Label>
                <Controller name="n_saturated_fat_g" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Carbs (g)</Label>
                <Controller name="n_carbs_g" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Sugar (g)</Label>
                <Controller name="n_sugar_g" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Added Sugar (g)</Label>
                <Controller name="n_added_sugar_g" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Sodium (mg)</Label>
                <Controller name="n_sodium_mg" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Potassium (mg)</Label>
                <Controller name="n_potassium_mg" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[14px] font-semibold text-[#0f172a]">Phosphorus (mg)</Label>
                <Controller name="n_phosphorus_mg" control={control} render={({ field }) => <Input type="text" inputMode="decimal" className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]" {...field} />} />
              </div>
            </div>
          </div>

          {/* Section: Dietary Tags */}
          <div className="space-y-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0f172a] border-b border-[#e2e8f0] pb-2">
              <Tag className="h-4 w-4 text-primary" />
              Dietary Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {(form.watch("tags") || []).map((t, i) => (
                <Badge key={`${t}-${i}`} variant="secondary" className="gap-2">
                  {t}
                  <button type="button" onClick={() => { const next = [...(form.getValues("tags") || [])]; next.splice(i, 1); form.setValue("tags", next, { shouldDirty: true, shouldValidate: true }); }}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <TagInput form={form} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-[#e2e8f0] text-[#0f172a] hover:bg-[#f8fafc]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-[#003366] text-white"
            >
              {mode === "create" ? "Create Product" : "Save"}
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
        placeholder="Add custom tag..."
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        className="border-[#cbd5e1] rounded-[8px] placeholder:text-[#6b7280]"
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
        className="bg-primary hover:bg-[#003366] text-white"
      >
        Add
      </Button>
    </>
  )
}
