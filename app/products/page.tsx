"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import AppShell from "@/components/app-shell"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import EnhancedDataTable from "@/components/enhanced-data-table"
import ProductDetailsDrawer from "@/components/product-details-drawer"
import ProductFilters, { defaultFilters } from "@/components/product-filters"
import ActiveFiltersChips from "@/components/active-filters-chips"
import type { ColumnDef } from "@tanstack/react-table"
import Image from "next/image"
import { apiFetch } from "@/lib/backend"
import ProductForm from "@/components/product-form"
import ImportWizard from "@/components/import-wizard"
import { useToast } from "@/hooks/use-toast"
import { Search as SearchIcon, Columns, Eye, EyeOff, MoreHorizontal } from "lucide-react";


type Product = {
  id: string
  name: string
  sku: string
  status: "active" | "inactive"
  category: string
  brand?: string
  barcode?: string
  gtinType?: "UPC" | "EAN" | "ISBN"
  price?: string | number
  currency?: string
  categoryId?: string
  subCategoryId?: string
  cuisineId?: string
  marketId?: string
  description?: string
  servingSize?: string
  packageWeight?: string
  sourceUrl?: string
  regulatoryCodes?: string[]
  certifications?: string[]
  allergens?: string[]
  ingredients?: string[]
  tags: string[]
  nutrition?: {
    calories?: number
    protein_g?: number
    fat_g?: number
    carbs_g?: number
    sugar_g?: number
    added_sugar_g?: number
    saturated_fat_g?: number
    sodium_mg?: number
    potassium_mg?: number
    phosphorus_mg?: number
  }
  imageUrl?: string
  diets?: string[]
  updatedAt: string
  country?: string
}

// type Product = {
//   id: string
//   name: string
//   sku: string
//   status: "active" | "inactive"
//   category: string
//   brand?: string
//   barcode?: string
//   servingSize?: string
//   packageWeight?: string
//   imageUrl?: string
//   diets?: string[]
//   certifications?: string[]
//   allergens?: string[]
//   nutrition?: {
//     calories?: number
//     protein?: number
//     carbs?: number
//     fat?: number
//     sugar?: number
//     sodium?: number
//   }
//   ingredients?: string[]      // ← make this an array
//   tags: string[]
//   updatedAt: string
//   country?: string
// }


function productToFormValues(p: any) {
  if (!p) return undefined
  const n = p.nutrition || {}

  const join = (arr?: string[]) =>
    Array.isArray(arr) ? arr.filter(Boolean).join(", ") : ""

  const toStr = (v: any) => (v === null || v === undefined ? "" : String(v))

  return {
    // required
    name: toStr(p.name),
    sku: toStr(p.externalId ?? p.external_id ?? p.sku ?? p.code ?? ""),

    // enums/ids
    status: (p.status === "inactive" ? "inactive" : "active"),
    category: toStr(p.categoryId ?? p.category ?? ""),
    sub_category_id: toStr(p.subCategoryId ?? ""),
    cuisine_id: toStr(p.cuisineId ?? ""),
    market_id: toStr(p.marketId ?? ""),

    // misc fields
    description: toStr(p.description ?? ""),
    brand: toStr(p.brand ?? ""),
    barcode: toStr(p.barcode ?? ""),
    gtin_type: toStr(p.gtinType ?? p.gtin_type ?? ""),
    price: toStr(p.price ?? ""),
    currency: toStr(p.currency ?? "USD"),
    serving_size: toStr(p.servingSize ?? p.serving_size ?? ""),
    package_weight: toStr(p.packageWeight ?? p.package_weight ?? ""),
    source_url: toStr(p.sourceUrl ?? p.source_url ?? ""),

    // CSV inputs
    ingredients_csv: join(p.ingredients),
    allergens_csv: join(p.allergens),
    certifications_csv: join(p.certifications),
    regulatory_codes_csv: join(p.regulatoryCodes),

    // tags array (your form expects array)
    tags: Array.isArray(p.dietaryTags) ? p.dietaryTags
         : Array.isArray(p.tags) ? p.tags
         : [],

    // nutrition → n_*
    n_calories:         toStr(n.calories ?? n.calories_g ?? ""),
    n_protein_g:        toStr(n.protein_g ?? n.protein ?? ""),
    n_fat_g:            toStr(n.fat_g ?? n.fat ?? ""),
    n_carbs_g:          toStr(n.carbs_g ?? n.carbs ?? ""),
    n_sugar_g:          toStr(n.sugar_g ?? n.sugar ?? ""),
    n_added_sugar_g:    toStr(n.added_sugar_g ?? ""),
    n_saturated_fat_g:  toStr(n.saturated_fat_g ?? ""),
    n_sodium_mg:        toStr(n.sodium_mg ?? n.sodium ?? ""),
    n_potassium_mg:     toStr(n.potassium_mg ?? ""),
    n_phosphorus_mg:    toStr(n.phosphorus_mg ?? ""),
  }
}


/* ---------- helpers: normalize incoming data safely ---------- */
function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter(Boolean).map(String);
  if (typeof tags === "string") {
    return tags.split(/[,\u2022|]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function toProduct(raw: any): Product {
  const id =
    raw?.id ?? raw?.fid ?? raw?._id ?? raw?.productId ?? raw?.uuid ??
    raw?.sku ?? raw?.code ?? raw?.barcode ?? "";

  const dietaryTags = normalizeTags(raw?.dietaryTags);
  const tags = [
    ...normalizeTags(raw?.tags ?? raw?.tagList),
    ...dietaryTags,
  ].filter(Boolean);

  const allergens = Array.isArray(raw?.allergens)
    ? raw.allergens.map(String)
    : normalizeTags(raw?.allergens);

  const ingredients = Array.isArray(raw?.ingredients)
    ? raw.ingredients.map(String)
    : normalizeTags(raw?.ingredients); // also supports comma/semi-colon lists

  // nutrition normalization: map *_g and *_mg → UI’s expected keys
  const n = raw?.nutrition ?? {};
  const nutrition = (n && typeof n === "object")
    ? {
        calories: toNum(n.calories ?? n.cal),
        protein:  toNum(n.protein_g ?? n.protein),
        carbs:    toNum(n.carbs_g   ?? n.carbs),
        fat:      toNum(n.fat_g     ?? n.fat),
        sugar:    toNum(n.sugar_g   ?? n.sugar),
        sodium:   toNum(n.sodium_mg ?? n.sodium),
      }
    : undefined;

  return {
    id: String(id),
    name: String(raw?.name ?? raw?.productName ?? raw?.title ?? ""),
    sku: String(raw?.externalId ?? raw?.external_id ?? raw?.sku ?? raw?.code ?? raw?.barcode ?? id ?? ""),
    status: (raw?.status === "inactive" ? "inactive" : "active") as "active" | "inactive",
    category: String(raw?.category ?? raw?.categoryName ?? raw?.categoryId ?? ""),
    brand: raw?.brand ?? raw?.brandName ?? raw?.manufacturer ?? undefined,
    barcode: raw?.barcode ?? raw?.upc ?? raw?.ean ?? undefined,
    servingSize: raw?.servingSize ?? raw?.serving_size ?? undefined,
    packageWeight: raw?.packageWeight ?? raw?.packageWeight ?? undefined,
    imageUrl: raw?.imageUrl ?? raw?.image_url ?? raw?.image ?? undefined,
    diets: Array.isArray(raw?.diets) ? raw.diets : undefined,
    certifications: Array.isArray(raw?.certifications) ? raw.certifications : undefined,
    allergens,
    nutrition,
    ingredients,
    tags,
    updatedAt: String(raw?.updatedAt ?? raw?.updated_at ?? new Date().toISOString()),
    country: raw?.country ?? raw?.countryCode ?? undefined,
    

  };
}

function toNum(x: any): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}



type ParamState = {
  q?: string | null;
  view?: "table" | "cards" | null;
};

function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = React.useCallback((): Required<Pick<ParamState, "q" | "view">> => {
    const q = searchParams.get("q") ?? "";
    const view = (searchParams.get("view") as "table" | "cards") || "table";
    return { q, view };
  }, [searchParams]);

  const set = React.useCallback(
    (next: Partial<ParamState>) => {
      const current = new URLSearchParams(searchParams.toString());
      Object.entries(next).forEach(([key, value]) => {
        if (value == null || value === "") {
          current.delete(key);
        } else {
          current.set(key, String(value));
        }
      });
      const qs = current.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return { get, set };
}

export default function ProductsPage() {
  const router = useRouter()
  const { get, set } = useUrlState()
  const url = get()
  const { toast } = useToast()

  const handleSearch = (value: string) => set({ q: value || null })
  const handleViewChange = (v: "table" | "cards") => set({ view: v })
  const query = url.q.trim().toLowerCase()
  const view = url.view
  const [data, setData] = React.useState<Product[]>([])
  const [selected, setSelected] = React.useState<Product[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filters, setFilters] = React.useState(defaultFilters)
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<Product | null>(null)
  const [editInit, setEditInit] = React.useState<any | null>(null) // initialValues for the form

  async function openEdit(p: Product) {
    try {
      // Always fetch full product by id so all fields are available
      const res = await apiFetch(`/products/${p.id}`)
      const full = await res.json()

      setEditItem(full)
      setEditInit(productToFormValues(full)) // map to form fields (next section)
      setEditOpen(true)
    } catch (e) {
      console.error("Failed to load product for edit", e)
    }
  }

  // Column visibility
  const [columnVisibility, setColumnVisibility] = React.useState({
    brand: true,
    barcode: false,
    allergens: false,
    diets: false,
    certifications: false,
  })

  const load = React.useCallback(async () => {
  setLoading(true)
  try {
    const res = await apiFetch("/products")
    const json = await res.json()

    // Accept: [ ... ]  OR  {items:[...]}  OR  {data:[...]}  OR  {results:[...]}
    const items = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (json?.items ?? []));

    setData(items.map(toProduct));
  } catch (error) {
    console.error("Failed to load products:", error)
  } finally {
    setLoading(false)
  }
}, [])

  React.useEffect(() => {
    load()
  }, [load])

  // Update URL when query or view changes
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (view !== "table") params.set("view", view)

    const newUrl = params.toString() ? `/products?${params.toString()}` : "/products"
    router.replace(newUrl)
  }, [query, view, router])

  const applyFilters = (products: Product[]) => {
    return products.filter((product) => {
      // Text search
      if (query) {
        const searchText = query.toLowerCase()
        const matchesText =
          product.name.toLowerCase().includes(searchText) ||
          product.sku.toLowerCase().includes(searchText) ||
          product.category.toLowerCase().includes(searchText) ||
          product.brand?.toLowerCase().includes(searchText) ||
          product.tags.some((tag) => tag.toLowerCase().includes(searchText))

        if (!matchesText) return false
      }

      // Status filter
      if (filters.status !== "all" && product.status !== filters.status) return false

      // Category filter
      if (filters.categories.length && !filters.categories.includes(product.category)) return false

      // Brand filter
      if (filters.brands.length && (!product.brand || !filters.brands.includes(product.brand))) return false

      // Diet filter
      if (filters.diets.length && (!product.diets || !filters.diets.some((diet) => product.diets?.includes(diet))))
        return false

      // Missing data filters
      if (filters.missingImage && product.imageUrl) return false
      if (filters.missingNutrition && product.nutrition) return false
      if (filters.missingBarcode && product.barcode) return false

      // Nutrition bounds
      if (
        filters.proteinMin &&
        (!product.nutrition?.protein_g || product.nutrition.protein_g < Number.parseFloat(filters.proteinMin))
      )
        return false
      if (filters.sugarMax && product.nutrition?.sugar_g && product.nutrition.sugar_g > Number.parseFloat(filters.sugarMax))
        return false
      if (
        filters.sodiumMax &&
        product.nutrition?.sodium_mg &&
        product.nutrition.sodium_mg > Number.parseFloat(filters.sodiumMax)
      )
        return false
      if (
        filters.caloriesMax &&
        product.nutrition?.calories &&
        product.nutrition.calories > Number.parseFloat(filters.caloriesMax)
      )
        return false

      return true
    })
  }

  const filtered = applyFilters(data)

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product)
    setDetailsOpen(true)
  }

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
  }

  const handleFilterClear = () => {
    setFilters(defaultFilters)
  }

  const handleFilterRemove = (key: string, value?: string) => {
    const f = filters as Record<string, any>; // type-only shim, no runtime change
    if (value && Array.isArray(f[key])) {
      const current = f[key] as string[];
      setFilters({ ...filters, [key]: current.filter((v) => v !== value) });
    } else {
      setFilters({
        ...filters,
        [key]:
          key === "status" || key === "country"
            ? "all"
            : Array.isArray(f[key])
            ? []
            : key.includes("missing")
            ? false
            : key === "hasImage"
            ? null
            : "",
      });
    }
  };

  const handleBulkAction = (action: "activate" | "deactivate") => {
    const newStatus = action === "activate" ? "active" : "inactive"
    setData((prev) =>
      prev.map((product) =>
        selected.some((s) => s.id === product.id)
          ? { ...product, status: newStatus as "active" | "inactive" }
          : product,
      ),
    )

    toast({
      title: `Products ${action}d`,
      description: `${selected.length} product(s) ${action}d successfully (demo)`,
    })
    setSelected([])
  }

  async function handleDelete(p: Product) {
    if (!p?.id) return;
    try {
      const res = await apiFetch(`/products/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        const msg = await res.text();
        toast({ title: "Delete failed", description: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Deleted", description: `${p.name} removed.` });
      await load();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to delete", variant: "destructive" });
    }
  }

  const columns: ColumnDef<Product>[] = [
    {
      id: "image",
      header: "Image",
      cell: ({ row }) => (
        <Image
          src={row.original.imageUrl || "/placeholder.svg?height=64&width=64&query=product"}
          alt={`${row.original.name} image`}
          width={48}
          height={48}
          className="rounded object-cover aspect-square cursor-pointer"
          onClick={() => handleRowClick(row.original)}
        />
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="cursor-pointer" onClick={() => handleRowClick(row.original)}>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.sku}</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          className={
            row.original.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
          }
        >
          {row.original.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "brand",
      header: "Brand",
      cell: ({ row }) => row.original.brand || "—",
    },
    {
      accessorKey: "barcode",
      header: "Barcode",
      cell: ({ row }) =>
        row.original.barcode ? <span className="font-mono text-xs">{row.original.barcode}</span> : "—",
    },
    {
      id: "allergens",
      header: "Allergens",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.allergens?.slice(0, 2).map((allergen) => (
            <Badge key={allergen} variant="destructive" className="text-xs">
              {allergen}
            </Badge>
          ))}
          {(row.original.allergens?.length || 0) > 2 && (
            <span className="text-xs text-muted-foreground">+{(row.original.allergens?.length || 0) - 2}</span>
          )}
        </div>
      ),
    },
    {
      id: "diets",
      header: "Diets",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.diets?.slice(0, 2).map((diet) => (
            <Badge key={diet} variant="secondary" className="bg-green-100 text-green-700 text-xs">
              {diet}
            </Badge>
          ))}
          {(row.original.diets?.length || 0) > 2 && (
            <span className="text-xs text-muted-foreground">+{(row.original.diets?.length || 0) - 2}</span>
          )}
        </div>
      ),
    },
    {
      id: "certifications",
      header: "Certifications",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.certifications?.slice(0, 2).map((cert) => (
            <Badge key={cert} variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
              {cert}
            </Badge>
          ))}
          {(row.original.certifications?.length || 0) > 2 && (
            <span className="text-xs text-muted-foreground">+{(row.original.certifications?.length || 0) - 2}</span>
          )}
        </div>
      ),
    },
    {
      id: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags ?? [] // already normalized, but guard anyway
        if (!tags.length) return null
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-foreground">{`+${tags.length - 3}`}</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => <span className="text-sm">{new Date(row.original.updatedAt).toLocaleString()}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{"Actions"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleRowClick(row.original)}>{"View Details"}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(row.original)}>{"Edit"}</DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600" onClick={() => handleDelete(row.original)}>{"Delete"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  // Filter columns based on visibility
  const visibleColumns = columns.filter((col) => {
    if (col.id === "brand") return columnVisibility.brand
    if (col.id === "barcode") return columnVisibility.barcode
    if (col.id === "allergens") return columnVisibility.allergens
    if (col.id === "diets") return columnVisibility.diets
    if (col.id === "certifications") return columnVisibility.certifications
    return true
  })

  if (loading) {
    return (
      <AppShell title="Products">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Products">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" role="search">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search products..."
                value={url.q}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-64 pl-10"
                aria-label="Search products"
             />
          </div>

          <ProductFilters filters={filters} onChange={handleFilterChange} onClear={handleFilterClear} data={data} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <Columns className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(columnVisibility).map(([key, visible]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={visible}
                  onCheckedChange={(checked) => setColumnVisibility((prev) => ({ ...prev, [key]: checked }))}
                >
                  <div className="flex items-center gap-2">
                    {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              {filtered.length} of {data.length} products
            </div>
            <Tabs value={view} onValueChange={(v) => handleViewChange(v as "table" | "cards")}>
              <TabsList>
                <TabsTrigger value="table">{"Table"}</TabsTrigger>
                <TabsTrigger value="cards">{"Cards"}</TabsTrigger>
              </TabsList>
            </Tabs>
            <ImportWizard onComplete={load} />
            <ProductForm
              mode="edit"
              productId={editItem?.id}
              initialValues={editInit ?? undefined}
              open={editOpen}
              onOpenChange={setEditOpen}
              renderTrigger={false}
              onSaved={() => { setEditOpen(false); load(); }}
            />
          </div>
        </div>

        <ActiveFiltersChips filters={filters} onRemove={handleFilterRemove} onClear={handleFilterClear} />

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <SearchIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {query ||
              Object.values(filters).some(
                (f) => f !== "all" && f !== false && f !== null && (Array.isArray(f) ? f.length > 0 : f !== ""),
              )
                ? "Try adjusting your search or filters"
                : "Get started by importing products or adding them manually"}
            </p>
            <div className="flex items-center justify-center gap-2">
              <ImportWizard onComplete={load} />
              <ProductForm mode="create" onSaved={load} />
            </div>
          </div>
        ) : view === "table" ? (
          <EnhancedDataTable
            data={filtered}
            columns={visibleColumns}
            selectable
            onSelectionChange={(rows) => setSelected(rows as Product[])}
            {...({ onRowClick: handleRowClick } as any)}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleRowClick(p)}
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={p.imageUrl || "/placeholder.svg?height=80&width=80&query=product"}
                    alt={`${p.name} image`}
                    width={80}
                    height={80}
                    className="rounded object-cover aspect-square"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.sku}</div>
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {(p.tags ?? []).slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                      {(p.tags ?? []).length > 3 && (
                        <Badge variant="outline">+{(p.tags ?? []).length - 3}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <Badge
                      className={
                        p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {selected.length > 0 && (
          <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction("activate")}>
              Activate
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction("deactivate")}>
              Deactivate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])} className="ml-auto">
              Clear selection
            </Button>
          </div>
        )}
      </div>

      <ProductDetailsDrawer open={detailsOpen} onOpenChange={setDetailsOpen} product={selectedProduct} />
    </AppShell>
  )
}
