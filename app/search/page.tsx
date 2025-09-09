"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AppShell from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Package, Users, Briefcase, Filter, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/backend"

type Product = {
  id: string
  name: string
  // show externalId as SKU (we’ll map it below)
  sku: string
  brand?: string
  category: string
  status: "Active" | "Inactive" | "Pending"
  image?: string

  // tags (generic) + dietaryTags (explicit)
  tags: string[]
  dietaryTags?: string[]

  // new product details
  barcode?: string
  packageWeight?: string | null
  servingSize?: string | null
  servingsPerContainer?: number | string | null
  description?: string | null
  ingredients?: string | null

  // price
  price?: number | null
  currency?: string | null

  // full nutrition profile (ordered later in UI)
  nutrition?: {
    calories?: number
    protein_g?: number
    fat_g?: number
    carbs_g?: number
    fiber_g?: number
    sugar_g?: number
    sodium_mg?: number
  }
}

type Customer = {
  id: string
  name: string
  type: "Retailer" | "Distributor" | "Restaurant"
  status: "Active" | "Inactive" | "Pending"
  tags: string[]
  matchCount: number
  email?: string
  phone?: string
  location?: { city?: string; state?: string; postal?: string; country?: string }
}

type Job = {
  id: string
  name: string
  type: "Import" | "Export" | "Match"
  status: "Running" | "Completed" | "Failed" | "Pending"
  createdAt: string
  progress?: number
}

// --- Normalizers for backend -> Search page shapes ---
type StatusTri = "Active" | "Inactive" | "Pending";

function normStatus(v: any): StatusTri {
  const s = String(v ?? "Active").toLowerCase();
  if (s.startsWith("pend")) return "Pending";
  if (s === "archived" || s.startsWith("inac") || s === "inactive") return "Inactive";
  return "Active";
}

const NUT_ORDER = [
  { key: "calories",   label: "Calories", unit: "kcal" },
  { key: "protein_g",  label: "Protein",  unit: "g"    },
  { key: "fat_g",      label: "Fat",      unit: "g"    },
  { key: "carbs_g",    label: "Carbs",    unit: "g"    },
  { key: "fiber_g",    label: "Fiber",    unit: "g"    },
  { key: "sugar_g",    label: "Sugar",    unit: "g"    },
  { key: "sodium_mg",  label: "Sodium",   unit: "mg"   },
] as const

function toSearchProduct(src: any): Product {
  // union tags + dietaryTags (keep both; tags used for generic chips/search)
  const tags = Array.isArray(src?.tags) ? src.tags : []
  const dietary = Array.isArray(src?.dietaryTags) ? src.dietaryTags : []
  const allTags = [...new Set([...tags, ...dietary])]

  // ingredients may come as string or array
  const ingredients =
    Array.isArray(src?.ingredients) ? src.ingredients.join(", ") :
    typeof src?.ingredients === "string" ? src.ingredients :
    null

  // serving size / per-container fields can have different casings
  const servingSize = src?.serving_size ?? src?.servingSize ?? null
  const servingsPerContainer = src?.servings_per_container ?? src?.servingsPerContainer ?? null

  // prefer externalId as SKU, else fall back
  const sku = String(src?.externalId ?? src?.sku ?? src?.barcode ?? "No SKU")

  return {
    id: String(src?.id ?? src?.product_id ?? ""),
    name: String(src?.name ?? src?.title ?? ""),
    sku,
    brand: src?.brand ?? src?.manufacturer ?? undefined,
    category: String(src?.category ?? src?.category_name ?? "No Category"),
    status: normStatus(src?.status),
    image: src?.image ?? src?.image_url ?? src?.imageUrl ?? undefined,

    tags: allTags,
    dietaryTags: dietary,

    barcode: src?.barcode ?? undefined,
    packageWeight: src?.packageWeight ?? null,
    servingSize,
    servingsPerContainer,
    description: src?.description ?? null,
    ingredients,

    price: typeof src?.price === "number" ? src.price : null,
    currency: src?.currency ?? null,

    nutrition: src?.nutrition
      ? {
          calories:   src.nutrition.calories   ?? src.nutrition.calories_g   ?? undefined,
          protein_g:  src.nutrition.protein_g  ?? undefined,
          fat_g:      src.nutrition.fat_g      ?? undefined,
          carbs_g:    src.nutrition.carbs_g    ?? undefined,
          fiber_g:    src.nutrition.fiber_g    ?? undefined,
          sugar_g:    src.nutrition.sugar_g    ?? undefined,
          sodium_mg:  src.nutrition.sodium_mg  ?? undefined,
        }
      : undefined,
  }
}

function toSearchCustomer(src: any): Customer {
  const name =
    src?.fullName ||
    [src?.firstName, src?.lastName].filter(Boolean).join(" ") ||
    src?.name ||
    "Unnamed Customer";

  // Tags can arrive as customTags or tags
  const tags = Array.isArray(src?.customTags)
    ? src.customTags
    : Array.isArray(src?.tags)
    ? src.tags
    : [];

  // Location can be nested (location: { city, state, postal, country }) or flat
  const location =
    src?.location ?? {
      city: src?.city,
      state: src?.state,
      postal: src?.postal,
      country: src?.country,
    };

  return {
    id: String(src?.id ?? src?.customer_id ?? ""),
    name,
    type: (src?.type ?? src?.customer_type ?? "Retailer") as Customer["type"],
    status: normStatus(src?.status),
    tags,
    matchCount: Number(src?.match_count ?? src?.matches ?? 0) || 0,
    email: src?.email ?? undefined,
    phone: src?.phone ?? undefined,
    location,
  };
}

// Accept arrays or objects like {data: [...]} / {items: [...]}
const pluckItems = (raw: any): any[] =>
  Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);

// Small debounce hook for search-as-you-type
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const dummyProducts: Product[] = [
  {
    id: "1",
    name: "Organic Quinoa",
    sku: "ORG-QUIN-001",
    brand: "Nature's Best",
    category: "Grains",
    status: "Active",
    tags: ["organic", "gluten-free", "vegan"],
    image: "/organic-quinoa.png",
  },
  {
    id: "2",
    name: "Almond Milk",
    sku: "ALM-MLK-002",
    brand: "Pure Harvest",
    category: "Dairy Alternatives",
    status: "Active",
    tags: ["dairy-free", "vegan", "unsweetened"],
    image: "/almond-milk-pouring.png",
  },
  {
    id: "3",
    name: "Protein Bar",
    sku: "PROT-BAR-003",
    brand: "FitLife",
    category: "Snacks",
    status: "Inactive",
    tags: ["high-protein", "low-sugar"],
    image: "/protein-bar.png",
  },
]

const dummyCustomers: Customer[] = [
  {
    id: "1",
    name: "Whole Foods Market",
    type: "Retailer",
    status: "Active",
    tags: ["organic", "premium"],
    matchCount: 45,
  },
  {
    id: "2",
    name: "Fresh Direct",
    type: "Distributor",
    status: "Active",
    tags: ["online", "delivery"],
    matchCount: 23,
  },
  {
    id: "3",
    name: "Green Leaf Cafe",
    type: "Restaurant",
    status: "Pending",
    tags: ["local", "sustainable"],
    matchCount: 8,
  },
]

const dummyJobs: Job[] = [
  {
    id: "1",
    name: "Product Import - January 2024",
    type: "Import",
    status: "Completed",
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Customer Matching",
    type: "Match",
    status: "Running",
    createdAt: "2024-01-15T14:20:00Z",
    progress: 65,
  },
  {
    id: "3",
    name: "Export to CSV",
    type: "Export",
    status: "Failed",
    createdAt: "2024-01-14T16:45:00Z",
  },
]

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [activeTab, setActiveTab] = useState("products")
  const [isLoading, setIsLoading] = useState(false)
  const debouncedQ = useDebounced(query, 350);

  // Filters state
  const [productFilters, setProductFilters] = useState({
    status: "all",
    category: "all",
    tags: [] as string[],
  })

  const [customerFilters, setCustomerFilters] = useState({
    status: "all",
    type: "all",
    tags: [] as string[],
  })

  const [jobFilters, setJobFilters] = useState({
    status: "all",
    type: "all",
  })

  // Data state with safe defaults
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [jobs, setJobs] = useState<Job[]>([])

  // Load initial data
  useEffect(() => {
  setIsLoading(true);
  const load = async () => {
    try {
      const [pr, cr] = await Promise.all([
        apiFetch("/products?limit=200"),
        apiFetch("/customers?limit=200"),
      ]);
      const [pjson, cjson] = await Promise.all([
        pr.json().catch(() => null),
        cr.json().catch(() => null),
      ]);

      setProducts(pluckItems(pjson).map(toSearchProduct));
      setCustomers(pluckItems(cjson).map(toSearchCustomer));
      setJobs(Array.isArray(dummyJobs) ? dummyJobs : []); // keep Jobs tab as-is
    } finally {
      setIsLoading(false);
    }
  };
  load();
}, []);

  // Update URL when query changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set("q", query)
    } else {
      params.delete("q")
    }
    router.replace(`/search?${params.toString()}`)
  }, [query, router, searchParams])

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        document.getElementById("search-input")?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Remote search whenever the debounced query changes
  useEffect(() => {
    let aborted = false;

    const run = async () => {
      // If query is empty → reload baseline (no q)
      if (!debouncedQ) {
        const [pr, cr] = await Promise.all([
          apiFetch("/products?limit=200"),
          apiFetch("/customers?limit=200"),
        ]);
        const [pjson, cjson] = await Promise.all([
          pr.json().catch(() => null),
          cr.json().catch(() => null),
        ]);
        if (aborted) return;
        setProducts(pluckItems(pjson).map(toSearchProduct));
        setCustomers(pluckItems(cjson).map(toSearchCustomer));
        return;
      }

      // Active query → ask backend with ?q=
      setIsLoading(true);
      try {
        const [pr, cr] = await Promise.all([
          apiFetch(`/products?q=${encodeURIComponent(debouncedQ)}&limit=200`),
          apiFetch(`/customers?q=${encodeURIComponent(debouncedQ)}&limit=200`),
        ]);
        const [pjson, cjson] = await Promise.all([
          pr.json().catch(() => null),
          cr.json().catch(() => null),
        ]);
        if (aborted) return;
        setProducts(pluckItems(pjson).map(toSearchProduct));
        setCustomers(pluckItems(cjson).map(toSearchCustomer));
      } finally {
        if (!aborted) setIsLoading(false);
      }
    };

    run();
    return () => {
      aborted = true;
    };
  }, [debouncedQ]);

  // Safe filtering functions with null checks
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return []

    return products.filter((product) => {
      if (!product) return false
      const hay = [
        product.name,
        product.sku,
        product.brand,
        product.category,
        product.barcode,
        product.description,
        product.ingredients,
        ...(product.tags || []),
        ...(product.dietaryTags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      const matchesQuery = !query || hay.includes(query.toLowerCase())

      const matchesStatus = productFilters.status === "all" || product.status === productFilters.status
      const matchesCategory = productFilters.category === "all" || product.category === productFilters.category
      const matchesTags =
        productFilters.tags.length === 0 ||
        (Array.isArray(product.tags) && productFilters.tags.some((tag) => product.tags.includes(tag)))

      return matchesQuery && matchesStatus && matchesCategory && matchesTags
    })
  }, [products, query, productFilters])

  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return []

    return customers.filter((customer) => {
      if (!customer) return false

      const matchesQuery =
        !query ||
        (customer.name || "").toLowerCase().includes(query.toLowerCase()) ||
        (customer.type || "").toLowerCase().includes(query.toLowerCase()) ||
        (customer.email || "").toLowerCase().includes(query.toLowerCase()) ||
        (
          ((customer.location?.city || "") + " " + (customer.location?.state || "")).trim()
        ).toLowerCase().includes(query.toLowerCase())

      const matchesStatus = customerFilters.status === "all" || customer.status === customerFilters.status
      const matchesType = customerFilters.type === "all" || customer.type === customerFilters.type
      const matchesTags =
        customerFilters.tags.length === 0 ||
        (Array.isArray(customer.tags) && customerFilters.tags.some((tag) => customer.tags.includes(tag)))

      return matchesQuery && matchesStatus && matchesType && matchesTags
    })
  }, [customers, query, customerFilters])

  const filteredJobs = useMemo(() => {
    if (!Array.isArray(jobs)) return []

    return jobs.filter((job) => {
      if (!job) return false

      const matchesQuery =
        !query ||
        (job.name || "").toLowerCase().includes(query.toLowerCase()) ||
        (job.type || "").toLowerCase().includes(query.toLowerCase())

      const matchesStatus = jobFilters.status === "all" || job.status === jobFilters.status
      const matchesType = jobFilters.type === "all" || job.type === jobFilters.type

      return matchesQuery && matchesStatus && matchesType
    })
  }, [jobs, query, jobFilters])

  // Get unique values for filters with safe array operations
  const getUniqueCategories = () => {
    if (!Array.isArray(products)) return []
    return [...new Set(products.map((p) => p?.category).filter(Boolean))]
  }

  const getUniqueProductTags = () => {
    if (!Array.isArray(products)) return []
    return [...new Set(products.flatMap((p) => (Array.isArray(p?.tags) ? p.tags : [])).filter(Boolean))]
  }

  const getUniqueCustomerTags = () => {
    if (!Array.isArray(customers)) return []
    return [...new Set(customers.flatMap((c) => (Array.isArray(c?.tags) ? c.tags : [])).filter(Boolean))]
  }

  const clearAllFilters = () => {
    setProductFilters({ status: "all", category: "all", tags: [] })
    setCustomerFilters({ status: "all", type: "all", tags: [] })
    setJobFilters({ status: "all", type: "all" })
    toast({
      title: "Filters cleared",
      description: "All search filters have been reset",
    })
  }

  const hasActiveFilters = () => {
    return (
      productFilters.status !== "all" ||
      productFilters.category !== "all" ||
      productFilters.tags.length > 0 ||
      customerFilters.status !== "all" ||
      customerFilters.type !== "all" ||
      customerFilters.tags.length > 0 ||
      jobFilters.status !== "all" ||
      jobFilters.type !== "all"
    )
  }

  const removeProductTag = (tagToRemove: string) => {
    setProductFilters((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const removeCustomerTag = (tagToRemove: string) => {
    setCustomerFilters((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  return (
    <AppShell title="Search">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Search className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Search</h1>
        </div>

        {/* Search Input */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Search products, customers, jobs... (Press '/' to focus)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Filters */}
        {hasActiveFilters() && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {productFilters.status !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Status: {productFilters.status}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setProductFilters((prev) => ({ ...prev, status: "all" }))}
                      />
                    </Badge>
                  )}
                  {productFilters.category !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Category: {productFilters.category}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setProductFilters((prev) => ({ ...prev, category: "all" }))}
                      />
                    </Badge>
                  )}
                  {productFilters.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      Tag: {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeProductTag(tag)} />
                    </Badge>
                  ))}
                  {customerFilters.status !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Customer Status: {customerFilters.status}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setCustomerFilters((prev) => ({ ...prev, status: "all" }))}
                      />
                    </Badge>
                  )}
                  {customerFilters.type !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Customer Type: {customerFilters.type}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setCustomerFilters((prev) => ({ ...prev, type: "all" }))}
                      />
                    </Badge>
                  )}
                  {customerFilters.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      Customer Tag: {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeCustomerTag(tag)} />
                    </Badge>
                  ))}
                  {jobFilters.status !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Job Status: {jobFilters.status}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setJobFilters((prev) => ({ ...prev, status: "all" }))}
                      />
                    </Badge>
                  )}
                  {jobFilters.type !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Job Type: {jobFilters.type}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setJobFilters((prev) => ({ ...prev, type: "all" }))}
                      />
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products ({filteredProducts.length})
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers ({filteredCustomers.length})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Jobs ({filteredJobs.length})
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            {/* Product Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Product Filters</span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Select
                    value={productFilters.status}
                    onValueChange={(value) => setProductFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={productFilters.category}
                    onValueChange={(value) => setProductFilters((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {getUniqueCategories().map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !productFilters.tags.includes(value)) {
                        setProductFilters((prev) => ({ ...prev, tags: [...prev.tags, value] }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add Tag Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUniqueProductTags().map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Products Results */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No products found</h3>
                  <p className="text-muted-foreground">
                    {query ? `No products match "${query}"` : "No products match your current filters"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={product.image || "/placeholder.svg?height=64&width=64&query=product"}
                          alt={product.name || "Product"}
                          className="h-16 w-16 rounded object-cover"
                        />
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold text-lg">{product.name || "Unnamed Product"}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>SKU: {product.sku || "No SKU"}</span>
                            <span>•</span>
                            <span>{product.brand || "No Brand"}</span>
                            <span>•</span>
                            <span>{product.category || "No Category"}</span>
                          </div>
                          {/* Package / Serving meta */}
                          {(product.packageWeight || product.servingSize) && (
                            <div className="text-sm text-muted-foreground">
                              {product.packageWeight && <span>Package: {product.packageWeight}</span>}
                              {product.packageWeight && product.servingSize && <span> • </span>}
                              {product.servingSize && (
                                <span>
                                  Serving: {product.servingSize}
                                  {product.servingsPerContainer ? ` × ${product.servingsPerContainer}/pkg` : ""}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Description */}
                          {product.description && (
                            <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {product.description}
                            </div>
                          )}

                          {/* Ingredients */}
                          {product.ingredients && (
                            <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              <span className="font-medium text-foreground">Ingredients: </span>
                              {product.ingredients}
                            </div>
                          )}

<<<<<<< HEAD
                          {/* Dietary tags (chips) */}
                          {product.dietaryTags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {product.dietaryTags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full border px-2 py-0.5 text-xs"
                                  aria-label={`dietary tag ${t}`}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}

=======
>>>>>>> frontend-ready-vercel-v2
                          {/* Nutrition grid */}
                          {product.nutrition && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                              {NUT_ORDER.map(({ key, label, unit }) => {
                                const v = (product.nutrition as any)?.[key]
                                if (v == null) return null
                                return (
                                  <div key={key} className="rounded-md border p-2">
                                    <div className="text-xs text-muted-foreground">{label}</div>
                                    <div className="text-sm font-medium">
                                      {v} {unit}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {Array.isArray(product.tags) && product.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {product.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={product.status === "Active" ? "default" : "secondary"}
                          className={product.status === "Active" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}
                        >
                          {product.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            {/* Customer Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Customer Filters</span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Select
                    value={customerFilters.status}
                    onValueChange={(value) => setCustomerFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={customerFilters.type}
                    onValueChange={(value) => setCustomerFilters((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Retailer">Retailer</SelectItem>
                      <SelectItem value="Distributor">Distributor</SelectItem>
                      <SelectItem value="Restaurant">Restaurant</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !customerFilters.tags.includes(value)) {
                        setCustomerFilters((prev) => ({ ...prev, tags: [...prev.tags, value] }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add Tag Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUniqueCustomerTags().map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Customers Results */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No customers found</h3>
                  <p className="text-muted-foreground">
                    {query ? `No customers match "${query}"` : "No customers match your current filters"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-semibold">{customer.name || "Unnamed Customer"}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{customer.type || "No Type"}</span>
                            <span>•</span>
                            <span>{customer.matchCount || 0} matches</span>
                          </div>
                          {(customer.email || customer.location?.city || customer.location?.state) && (
                          <div className="text-sm text-muted-foreground">
                            {customer.email && <span>{customer.email}</span>}
                            {customer.email && (customer.location?.city || customer.location?.state) && <span> • </span>}
                            {(customer.location?.city || customer.location?.state) && (
                              <span>
                                {[customer.location?.city, customer.location?.state].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                          )}
                          {Array.isArray(customer.tags) && customer.tags.length > 0 && (
                            <div className="flex gap-1">
                              {customer.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {customer.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{customer.tags.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                          {customer.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            {/* Job Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Job Filters</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    value={jobFilters.status}
                    onValueChange={(value) => setJobFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Running">Running</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={jobFilters.type}
                    onValueChange={(value) => setJobFilters((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Import">Import</SelectItem>
                      <SelectItem value="Export">Export</SelectItem>
                      <SelectItem value="Match">Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Jobs Results */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                  <p className="text-muted-foreground">
                    {query ? `No jobs match "${query}"` : "No jobs match your current filters"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded bg-green-100 flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-semibold">{job.name || "Unnamed Job"}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{job.type || "No Type"}</span>
                            <span>•</span>
                            <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "No Date"}</span>
                            {job.progress !== undefined && (
                              <>
                                <span>•</span>
                                <span>{job.progress}% complete</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={
                            job.status === "Completed"
                              ? "default"
                              : job.status === "Running"
                                ? "secondary"
                                : job.status === "Failed"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
