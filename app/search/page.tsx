"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import AppShell from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Package, Users, Briefcase, X, Plus, ChevronLeft, ChevronRight } from "lucide-react"
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

// Map backend ingestion job -> Search page Job shape
function toSearchJob(src: any): Job {
  const rawStatus = String(src?.status ?? "queued").toLowerCase();
  const statusMap: Record<string, Job["status"]> = {
    queued: "Pending",
    pending: "Pending",
    running: "Running",
    processing: "Running",
    completed: "Completed",
    failed: "Failed",
    canceled: "Failed",
  };
  const mode: string = String(src?.mode ?? "products");
  const type: Job["type"] = (mode === "export")
    ? "Export"
    : (mode === "match" || mode === "matching")
      ? "Match"
      : "Import"; // products/customers/api_sync map to Import for now

  const created = src?.createdAt ?? src?.created_at ?? new Date().toISOString();
  const friendly =
    (src?.params?.name ?? src?.name)
      || (type === "Match" ? `Customer Matching` : type === "Export" ? `Export` : `Import ${mode}`);

  return {
    id: String(src?.id ?? ""),
    name: friendly,
    type,
    status: statusMap[rawStatus] ?? "Pending",
    createdAt: String(created),
    progress: typeof src?.progressPct === "number" ? src.progressPct : (typeof src?.progress === "number" ? src.progress : undefined),
  };
}

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

  const PAGE_SIZE = 20
  const [currentPage, setCurrentPage] = useState(1)

  // Data state with safe defaults
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [jobs, setJobs] = useState<Job[]>([])

  // Load initial data
  useEffect(() => {
  setIsLoading(true);
  const load = async () => {
    try {
      const [pr, cr, jr] = await Promise.all([
        apiFetch("/products?limit=200"),
        apiFetch("/customers?limit=200"),
        apiFetch("/jobs?limit=100"),
      ]);
      const [pjson, cjson, jjson] = await Promise.all([
        pr.json().catch(() => null),
        cr.json().catch(() => null),
        jr.json().catch(() => null),
      ]);

      setProducts(pluckItems(pjson).map(toSearchProduct));
      setCustomers(pluckItems(cjson).map(toSearchCustomer));
      setJobs(pluckItems(jjson).map(toSearchJob));
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
        const [pr, cr, jr] = await Promise.all([
          apiFetch("/products?limit=200"),
          apiFetch("/customers?limit=200"),
          apiFetch("/jobs?limit=100"),
        ]);
        const [pjson, cjson, jjson] = await Promise.all([
          pr.json().catch(() => null),
          cr.json().catch(() => null),
          jr.json().catch(() => null),
        ]);
        if (aborted) return;
        setProducts(pluckItems(pjson).map(toSearchProduct));
        setCustomers(pluckItems(cjson).map(toSearchCustomer));
        setJobs(pluckItems(jjson).map(toSearchJob));
        return;
      }

      // Active query → ask backend with ?q=
      setIsLoading(true);
      try {
        const [pr, cr, jr] = await Promise.all([
          apiFetch(`/products?q=${encodeURIComponent(debouncedQ)}&limit=200`),
          apiFetch(`/customers?q=${encodeURIComponent(debouncedQ)}&limit=200`),
          // Ask server to prefilter jobs as well
          apiFetch(`/jobs?q=${encodeURIComponent(debouncedQ)}&limit=100`),
        ]);
        const [pjson, cjson, jjson] = await Promise.all([
          pr.json().catch(() => null),
          cr.json().catch(() => null),
          jr.json().catch(() => null),
        ]);
        if (aborted) return;
        setProducts(pluckItems(pjson).map(toSearchProduct));
        setCustomers(pluckItems(cjson).map(toSearchCustomer));
        setJobs(pluckItems(jjson).map(toSearchJob));
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

  // Paginated results (client-side)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredProducts.slice(start, start + PAGE_SIZE)
  }, [filteredProducts, currentPage])

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredCustomers.slice(start, start + PAGE_SIZE)
  }, [filteredCustomers, currentPage])

  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredJobs.slice(start, start + PAGE_SIZE)
  }, [filteredJobs, currentPage])

  const totalPages = useMemo(() => {
    const total = activeTab === "products" ? filteredProducts.length : activeTab === "customers" ? filteredCustomers.length : filteredJobs.length
    return Math.max(1, Math.ceil(total / PAGE_SIZE))
  }, [activeTab, filteredProducts.length, filteredCustomers.length, filteredJobs.length])

  // Reset to page 1 when filters or tab change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, productFilters, customerFilters, jobFilters, query])

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
      <div className="container mx-auto p-10 space-y-6 bg-[#f5f7f8] min-h-screen">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[12px]">
          <Link href="/dashboard" className="font-medium text-[#64748b] hover:text-[#0f172a]">
            Portal
          </Link>
          <span className="text-[#64748b]">/</span>
          <span className="font-medium text-[#0f172a]">Search</span>
        </nav>

        {/* Page Title */}
        <h1 className="text-[36px] font-extrabold text-[#0f172a] leading-10">Search</h1>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#6b7280]" />
          <Input
            id="search-input"
            placeholder="Search products, customers, jobs... (Press '/' to focus)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-[56px] pl-12 bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] text-[18px] placeholder:text-[#6b7280]"
          />
        </div>

        {/* Active Filters */}
        {hasActiveFilters() && (
          <Card className="bg-white border-[#e2e8f0] rounded-[12px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex flex-wrap gap-2">
                  {productFilters.status !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-[#f1f5f9] text-[#334155] border-[#e2e8f0]">
                      Status: {productFilters.status}
                      <button
                        onClick={() => setProductFilters((prev) => ({ ...prev, status: "all" }))}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        aria-label="Remove status filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {productFilters.category !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Category: {productFilters.category}
                      <button
                        onClick={() => setProductFilters((prev) => ({ ...prev, category: "all" }))}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        aria-label="Remove category filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {productFilters.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      Tag: {tag}
                      <button
                        onClick={() => removeProductTag(tag)}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {customerFilters.status !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Customer Status: {customerFilters.status}
                      <button
                        onClick={() => setCustomerFilters((prev) => ({ ...prev, status: "all" }))}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        aria-label="Remove customer status filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {customerFilters.type !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Customer Type: {customerFilters.type}
                      <button
                        onClick={() => setCustomerFilters((prev) => ({ ...prev, type: "all" }))}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        aria-label="Remove customer type filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {customerFilters.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      Customer Tag: {tag}
                      <button
                        onClick={() => removeCustomerTag(tag)}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        aria-label={`Remove customer tag ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {jobFilters.status !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Job Status: {jobFilters.status}
                      <button
                        onClick={() => setJobFilters((prev) => ({ ...prev, status: "all" }))}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        aria-label="Remove job status filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {jobFilters.type !== "all" && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Job Type: {jobFilters.type}
                      <button
                        onClick={() => setJobFilters((prev) => ({ ...prev, type: "all" }))}
                        className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                        aria-label="Remove job type filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
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
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1) }}>
          <div className="border-b border-[#e2e8f0]">
            <TabsList className="h-auto p-0 bg-transparent border-0 flex gap-0">
              <TabsTrigger
                value="products"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-[#00438f] pb-[14px] pt-[12px] px-6 data-[state=active]:text-[#00438f] data-[state=inactive]:text-[#64748b] font-semibold text-[14px] bg-transparent shadow-none"
              >
                Products
                <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${activeTab === "products" ? "bg-[rgba(0,67,143,0.1)] text-[#00438f]" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                  {filteredProducts.length.toLocaleString()}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-[#00438f] pb-[14px] pt-[12px] px-6 data-[state=active]:text-[#00438f] data-[state=inactive]:text-[#64748b] font-semibold text-[14px] bg-transparent shadow-none"
              >
                Customers
                <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${activeTab === "customers" ? "bg-[rgba(0,67,143,0.1)] text-[#00438f]" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                  {filteredCustomers.length.toLocaleString()}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="jobs"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-[#00438f] pb-[14px] pt-[12px] px-6 data-[state=active]:text-[#00438f] data-[state=inactive]:text-[#64748b] font-semibold text-[14px] bg-transparent shadow-none"
              >
                Jobs
                <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${activeTab === "jobs" ? "bg-[rgba(0,67,143,0.1)] text-[#00438f]" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                  {filteredJobs.length.toLocaleString()}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4 mt-0">
            {/* Product Filters - Inline */}
            <div className="flex flex-wrap gap-3 items-center py-[29px]">
              <Select
                value={productFilters.status}
                onValueChange={(value) => setProductFilters((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="h-[38px] w-[123px] rounded-[8px] border-[#e2e8f0] bg-white">
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
                <SelectTrigger className="h-[38px] w-[151px] rounded-[8px] border-[#e2e8f0] bg-white">
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
                <SelectTrigger className="h-[38px] rounded-[8px] border-[#e2e8f0] bg-[#f1f5f9] gap-2 font-medium text-[#334155] text-[14px] w-auto min-w-[140px] [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                  <Plus className="h-3.5 w-3.5 shrink-0" />
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
              <Card className="bg-white border-[#e2e8f0] rounded-[12px]">
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
                {paginatedProducts.map((product) => (
                  <Link key={product.id} href={`/products/${product.id}`}>
                    <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-6 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-0">
                        <div className="flex gap-6">
                          <div className="size-[128px] rounded-[8px] bg-[#f1f5f9] border border-[#e2e8f0] shrink-0 overflow-hidden flex items-center justify-center">
                            <img
                              src={product.image || "/placeholder.svg?height=128&width=128&query=product"}
                              alt={product.name || "Product"}
                              className="size-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-[20px] font-bold text-[#0f172a] leading-7">{product.name || "Unnamed Product"}</h3>
                                <div className="text-[14px] text-[#64748b]">
                                  SKU: {product.sku || "No SKU"} • {product.brand || "No Brand"} • {product.category || "No Category"}
                                </div>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${product.status === "Active" ? "bg-[#d1fae5] text-[#065f46]" : "bg-gray-100 text-gray-700"}`}>
                                {product.status}
                              </span>
                            </div>
                            {product.description && (
                              <p className="text-[14px] text-[#475569] line-clamp-2">{product.description}</p>
                            )}
                            {(product.dietaryTags?.length || product.tags?.length) ? (
                              <div className="flex flex-wrap gap-2 pt-2 pb-5">
                                {(product.dietaryTags || product.tags || []).slice(0, 5).map((t) => (
                                  <span key={t} className="bg-[#f1f5f9] rounded-full px-3 py-1 text-[12px] font-medium text-[#475569]">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            {product.nutrition && (
                              <div className="flex flex-wrap gap-4 pt-4 border-t border-[#f1f5f9]">
                                {NUT_ORDER.map(({ key, label, unit }) => {
                                  const v = (product.nutrition as any)?.[key]
                                  if (v == null) return null
                                  return (
                                    <div key={key} className="min-w-[80px]">
                                      <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">{label}</div>
                                      <div className="text-[14px] font-semibold text-[#0f172a]">
                                        {v} {unit}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4 mt-0">
            {/* Customer Filters - Inline */}
            <div className="flex flex-wrap gap-3 items-center py-[29px]">
              <Select
                value={customerFilters.status}
                onValueChange={(value) => setCustomerFilters((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="h-[38px] w-[123px] rounded-[8px] border-[#e2e8f0] bg-white">
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
                <SelectTrigger className="h-[38px] w-[151px] rounded-[8px] border-[#e2e8f0] bg-white">
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
                <SelectTrigger className="h-[38px] rounded-[8px] border-[#e2e8f0] bg-[#f1f5f9] gap-2 font-medium text-[#334155] text-[14px] w-auto min-w-[140px] [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                  <Plus className="h-3.5 w-3.5 shrink-0" />
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
              <Card className="bg-white border-[#e2e8f0] rounded-[12px]">
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
                {paginatedCustomers.map((customer) => (
                  <Link key={customer.id} href={`/customers/${customer.id}`}>
                    <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-6 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-[#e6ecf4] flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5 text-[#00438f]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[#0f172a]">{customer.name || "Unnamed Customer"}</h3>
                            <div className="text-sm text-[#64748b]">
                              {customer.type || "No Type"} • {customer.matchCount || 0} matches
                            </div>
                            {(customer.email || customer.location?.city || customer.location?.state) && (
                              <div className="text-sm text-[#64748b] mt-1">
                                {customer.email}
                                {(customer.email && (customer.location?.city || customer.location?.state)) && " • "}
                                {[customer.location?.city, customer.location?.state].filter(Boolean).join(", ")}
                              </div>
                            )}
                            {Array.isArray(customer.tags) && customer.tags.length > 0 && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {customer.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="bg-[#f1f5f9] rounded-full px-2 py-0.5 text-xs text-[#475569]">
                                    {tag}
                                  </span>
                                ))}
                                {customer.tags.length > 3 && (
                                  <span className="bg-[#f1f5f9] rounded-full px-2 py-0.5 text-xs text-[#475569]">
                                    +{customer.tags.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${customer.status === "Active" ? "bg-[#d1fae5] text-[#065f46]" : "bg-gray-100 text-gray-700"}`}>
                            {customer.status}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4 mt-0">
            {/* Job Filters - Inline */}
            <div className="flex flex-wrap gap-3 items-center py-[29px]">
              <Select
                value={jobFilters.status}
                onValueChange={(value) => setJobFilters((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="h-[38px] w-[123px] rounded-[8px] border-[#e2e8f0] bg-white">
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
                <SelectTrigger className="h-[38px] w-[151px] rounded-[8px] border-[#e2e8f0] bg-white">
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
              <Card className="bg-white border-[#e2e8f0] rounded-[12px]">
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
                {paginatedJobs.map((job) => (
                  <Link key={job.id} href={`/jobs?job=${job.id}`}>
                    <Card className="bg-white border border-[#e2e8f0] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-6 hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-[8px] bg-[#d1fae5] flex items-center justify-center shrink-0">
                            <Briefcase className="h-5 w-5 text-[#065f46]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[#0f172a]">{job.name || "Unnamed Job"}</h3>
                            <div className="text-sm text-[#64748b]">
                              {job.type || "No Type"} • {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "No Date"}
                              {job.progress !== undefined && ` • ${job.progress}% complete`}
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
                            className={job.status === "Completed" ? "bg-[#d1fae5] text-[#065f46] border-0" : ""}
                          >
                            {job.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Pagination */}
        {((activeTab === "products" && filteredProducts.length > 0) ||
          (activeTab === "customers" && filteredCustomers.length > 0) ||
          (activeTab === "jobs" && filteredJobs.length > 0)) && totalPages > 1 && (
          <div className="flex justify-center items-center pt-10 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-[8px]"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {totalPages <= 5 ? (
              Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-[8px] text-[16px] font-medium ${
                    currentPage === pageNum ? "bg-[#00438f] text-white hover:bg-[#00438f] hover:text-white" : "text-[#0f172a]"
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-[8px] text-[16px] font-medium ${
                    currentPage === 1 ? "bg-[#00438f] text-white hover:bg-[#00438f] hover:text-white" : "text-[#0f172a]"
                  }`}
                  onClick={() => setCurrentPage(1)}
                >
                  1
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-[8px] text-[16px] font-medium ${
                    currentPage === 2 ? "bg-[#00438f] text-white hover:bg-[#00438f] hover:text-white" : "text-[#0f172a]"
                  }`}
                  onClick={() => setCurrentPage(2)}
                >
                  2
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-[8px] text-[16px] font-medium ${
                    currentPage === 3 ? "bg-[#00438f] text-white hover:bg-[#00438f] hover:text-white" : "text-[#0f172a]"
                  }`}
                  onClick={() => setCurrentPage(3)}
                >
                  3
                </Button>
                <span className="px-2 text-[16px] text-[#94a3b8]">...</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-10 w-10 rounded-[8px] text-[16px] font-medium ${
                    currentPage === totalPages ? "bg-[#00438f] text-white hover:bg-[#00438f] hover:text-white" : "text-[#0f172a]"
                  }`}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-[8px]"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
