"use client"

import * as React from "react"
import { z } from "zod"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/backend"

/** Zod schema: required & optional fields that map to your backend/Supabase */
const schema = z.object({
  name: z.string().trim().min(1, "Required"),
  sku: z.string().trim().min(1, "Required"),
  status: z.enum(["active", "inactive"]),
  // make optional to align with resolver/useForm
  tags: z.array(z.string()).optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  gtin_type: z.enum(["UPC","EAN","ISBN"]).optional(),
  price: z.union([z.number(), z.string()]).optional(),
  currency: z.string().length(3).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  serving_size: z.string().optional(),
  package_weight: z.string().optional(),
  allergens_csv: z.string().optional(),
  ingredients: z.string().optional(),
  certifications_csv: z.string().optional(),
  regulatory_codes_csv: z.string().optional(),
  source_url: z.string().url().optional(),
})
export type FormValues = z.output<typeof schema>;

type ProductFormProps = {
  mode?: "create" | "edit"
  initialValues?: Partial<FormValues>
  onSaved?: () => void
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
}: ProductFormProps) {
  const [open, setOpen] = React.useState(false)
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      sku: "",
      status: "active",
      category: "",
      description: "",
      tags: [],
      brand: "",
      barcode: "",
      gtin_type: undefined,
      price: undefined,
      currency: "USD",
      serving_size: "",
      package_weight: "",
      allergens_csv: "",
      ingredients: "",
      certifications_csv: "",
      regulatory_codes_csv: "",
      source_url: "",
    },
  })

  const DEFAULTS: FormValues = {
    name: "",
    sku: "",
    status: "active",
    category: "",
    description: "",
    tags: [],
    brand: "",
    barcode: "",
    gtin_type: undefined,
    price: undefined,
    currency: "USD",
    serving_size: "",
    package_weight: "",
    allergens_csv: "",
    ingredients: "",
    certifications_csv: "",
    regulatory_codes_csv: "",
    source_url: "",
  }

  // IMPORTANT: reset exactly once when the dialog opens
  const openedOnceRef = React.useRef(false)
  React.useEffect(() => {
    if (open && !openedOnceRef.current) {
      form.reset({ ...DEFAULTS, ...(initialValues || {}) })
      openedOnceRef.current = true
    }
    if (!open) openedOnceRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const [tag, setTag] = React.useState("")

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      const toArr = (csv?: string) =>
        csv ? csv.split(",").map(s => s.trim()).filter(Boolean) : undefined

      const maybeUuid = (s?: string) =>
        s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s) ? s : undefined

      // Body matches backend /products mapper and Supabase schema
      const body = {
        // required
        external_id: values.sku,
        name: values.name,
        status: values.status,

        // optional references (category_id only if it looks like a UUID)
        category_id: maybeUuid(values.category),

        // basics
        description: values.description || "",
        brand: values.brand || undefined,

        // identifiers/pricing
        barcode: values.barcode || undefined,
        gtin_type: values.gtin_type || undefined,          // "UPC" | "EAN" | "ISBN"
        price: values.price ?? undefined,                   // string or number
        currency: (values.currency || "USD").toUpperCase(),

        // packaging
        serving_size: values.serving_size || undefined,
        package_weight: values.package_weight || undefined,

        // arrays
        dietary_tags: values.tags || [],
        allergens: toArr(values.allergens_csv),
        certifications: toArr(values.certifications_csv),
        regulatory_codes: toArr(values.regulatory_codes_csv),

        // ingredients: string/CSV → server will split to text[]
        ingredients: values.ingredients || undefined,

        source_url: values.source_url || undefined,
      }

      await apiFetch("/products", { method: "POST", body: JSON.stringify(body) })

      toast({ title: "Saved", description: "Product has been saved." })
      setOpen(false)
      onSaved()
    } catch {
      toast({ title: "Error", description: "Failed to save product.", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{mode === "create" ? "Add Product" : "Edit Product"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Product" : "Edit Product"}</DialogTitle>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <span className="text-xs text-rose-600">{form.formState.errors.name.message}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku">SKU / External ID</Label>
              <Input id="sku" {...form.register("sku")} />
              {form.formState.errors.sku && (
                <span className="text-xs text-rose-600">{form.formState.errors.sku.message}</span>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                defaultValue={form.getValues("status")}
                onValueChange={(v) => form.setValue("status", v as FormValues["status"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Input {...form.register("category")} />
              {form.formState.errors.category && (
                <span className="text-xs text-rose-600">{form.formState.errors.category.message}</span>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea rows={4} {...form.register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Brand</Label>
              <Input {...form.register("brand")} />
            </div>
            <div>
              <Label>Barcode</Label>
              <Input {...form.register("barcode")} />
            </div>
            <div>
              <Label>GTIN Type</Label>
              <Select
                defaultValue={form.getValues("gtin_type")}
                onValueChange={(v) => form.setValue("gtin_type", v as any)}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPC">UPC</SelectItem>
                  <SelectItem value="EAN">EAN</SelectItem>
                  <SelectItem value="ISBN">ISBN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price</Label>
              <Input type="text" inputMode="decimal" placeholder="e.g. 3.49" {...form.register("price")} />
            </div>
            <div>
              <Label>Currency</Label>
              <Input maxLength={3} {...form.register("currency")} />
            </div>
            <div>
              <Label>Serving Size</Label>
              <Input {...form.register("serving_size")} />
            </div>
            <div>
              <Label>Package Weight</Label>
              <Input {...form.register("package_weight")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Allergens (CSV)</Label>
              <Input placeholder="milk, egg, wheat" {...form.register("allergens_csv")} />
            </div>
            <div>
              <Label>Ingredients (CSV or text)</Label>
              <Input placeholder="peanuts, whey, salt" {...form.register("ingredients")} />
            </div>
            <div>
              <Label>Certifications (CSV)</Label>
              <Input placeholder="USDA Organic, Kosher" {...form.register("certifications_csv")} />
            </div>
            <div>
              <Label>Regulatory Codes (CSV)</Label>
              <Input placeholder="21CFR101.9" {...form.register("regulatory_codes_csv")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Source URL</Label>
            <Input placeholder="https://example.com/product" {...form.register("source_url")} />
          </div>

          <div className="grid gap-2">
            <Label>Dietary Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. vegan"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    if (tag.trim()) {
                      form.setValue("tags", [...(form.getValues("tags") ?? []), tag.trim()])
                      setTag("")
                    }
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  if (tag.trim()) {
                    form.setValue("tags", [...(form.getValues("tags") ?? []), tag.trim()])
                    setTag("")
                  }
                }}
              >
                Add
              </Button>
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
                      form.setValue("tags", next)
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
            <Button type="submit">{mode === "create" ? "Create" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
