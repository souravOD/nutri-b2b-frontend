"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Eye, FileText, X, Grid, List } from "lucide-react"
import Image from "next/image"
import ProductDetailsDrawer from "@/components/product-details-drawer"
import ProductNotesDialog from "@/components/product-notes-dialog"
import MatchProgress from "@/components/match-progress"
import DietaryRestrictionSelector, { type DietarySelection } from "@/components/dietary-restriction-selector"
import { useToast } from "@/hooks/use-toast"

type Customer = {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  notes: string
}

type Product = {
  id: string
  name: string
  sku: string
  category: string
  brand: string
  imageUrl: string
  matchScore: number
  diets: string[]
  certifications: string[]
  allergens: string[]
  barcode: string
  servingSize: string
  packageSize: string
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    sugar: number
    sodium: number
  }
  ingredients: string
}

type Props = {
  customerId: string | number
}

export default function CustomerDetailView({ customerId }: Props) {
  const { toast } = useToast()

  // Customer data state
  const [customer, setCustomer] = React.useState<Customer>({
    id: String(customerId),
    name: "John Doe",
    email: "john@example.com",
    phone: "+1-555-1234",
    avatar: "/diverse-avatars.png",
    notes: "Prefers low sugar",
  })

  // Dietary restrictions state
  const [dietary, setDietary] = React.useState<DietarySelection>({
    required: ["No Peanuts"],
    preferred: ["Vegan", "Organic"],
    allergens: ["Peanuts", "Dairy"],
    conditions: ["Celiac"],
  })

  // Product matches data
  const [products] = React.useState<Product[]>([
    {
      id: "1",
      name: "Product 1",
      sku: "SKU-1000",
      category: "Beverages",
      brand: "Nature's Best",
      imageUrl: "/diverse-products-still-life.png",
      matchScore: 70,
      diets: ["Organic"],
      certifications: ["USDA Organic"],
      allergens: [],
      barcode: "123456789012",
      servingSize: "1 cup (240ml)",
      packageSize: "32 fl oz",
      nutrition: {
        calories: 120,
        protein: 8,
        carbs: 12,
        fat: 5,
        sugar: 6,
        sodium: 150,
      },
      ingredients:
        "Organic almonds, filtered water, organic cane sugar, sea salt, natural vanilla flavor, locust bean gum, sunflower lecithin, gellan gum.",
    },
    {
      id: "2",
      name: "Product 2",
      sku: "SKU-1001",
      category: "Snacks",
      brand: "Pure Harvest",
      imageUrl: "/diverse-products-still-life.png",
      matchScore: 70,
      diets: ["Vegan"],
      certifications: ["Non-GMO"],
      allergens: [],
      barcode: "123456789013",
      servingSize: "1 bar (40g)",
      packageSize: "12 bars",
      nutrition: {
        calories: 190,
        protein: 12,
        carbs: 22,
        fat: 7,
        sugar: 8,
        sodium: 200,
      },
      ingredients:
        "Organic dates, almonds, organic brown rice protein, organic cocoa powder, organic coconut oil, sea salt, natural vanilla extract.",
    },
    {
      id: "3",
      name: "Product 3",
      sku: "SKU-1002",
      category: "Dairy",
      brand: "Farm Fresh",
      imageUrl: "/diverse-products-still-life.png",
      matchScore: 70,
      diets: [],
      certifications: ["Grass-Fed"],
      allergens: ["Dairy"],
      barcode: "123456789014",
      servingSize: "1 cup (240ml)",
      packageSize: "64 fl oz",
      nutrition: {
        calories: 150,
        protein: 8,
        carbs: 12,
        fat: 8,
        sugar: 12,
        sodium: 120,
      },
      ingredients: "Grade A pasteurized whole milk, vitamin D3.",
    },
    {
      id: "4",
      name: "Product 4",
      sku: "SKU-1003",
      category: "Bakery",
      brand: "Artisan Bakers",
      imageUrl: "/diverse-products-still-life.png",
      matchScore: 70,
      diets: [],
      certifications: [],
      allergens: ["Gluten", "Eggs"],
      barcode: "123456789015",
      servingSize: "1 slice (28g)",
      packageSize: "20 oz loaf",
      nutrition: {
        calories: 80,
        protein: 3,
        carbs: 15,
        fat: 1,
        sugar: 2,
        sodium: 160,
      },
      ingredients:
        "Enriched wheat flour, water, yeast, salt, sugar, soybean oil, calcium propionate, monoglycerides, enzymes.",
    },
  ])

  // UI state
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [filter, setFilter] = React.useState("all")
  const [matching, setMatching] = React.useState(false)

  // Details drawer state
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [detailsProduct, setDetailsProduct] = React.useState<Product | null>(null)

  // Notes dialog state
  const [notesOpen, setNotesOpen] = React.useState(false)
  const [activeNotesId, setActiveNotesId] = React.useState<string | null>(null)
  const [notesMap, setNotesMap] = React.useState<Record<string, string>>({})

  // Event handlers
  const openDetails = (product: Product) => {
    console.log("Opening details for:", product.name)
    setDetailsProduct(product)
    setDetailsOpen(true)
  }

  const openNotes = (product: Product) => {
    console.log("Opening notes for:", product.name)
    setActiveNotesId(product.id)
    setNotesOpen(true)
  }

  const saveNotes = (text: string) => {
    if (activeNotesId) {
      console.log("Saving notes for product:", activeNotesId, text)
      setNotesMap((prev) => ({ ...prev, [activeNotesId]: text }))
      toast({
        title: "Notes saved",
        description: "Product notes have been saved successfully.",
      })
    }
  }

  const runMatch = () => {
    console.log("Running new match...")
    setMatching(true)
    setTimeout(() => {
      setMatching(false)
      toast({
        title: "Match completed",
        description: "New product matches have been generated.",
      })
    }, 2000)
  }

  const handleCustomerUpdate = (field: keyof Customer, value: any) => {
    setCustomer((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    toast({
      title: "Saved (demo)",
      description: "Customer profile has been updated.",
    })
  }

  const filteredProducts = products.filter((product) => {
    switch (filter) {
      case ">=80%":
        return product.matchScore >= 80
      case ">=60%":
        return product.matchScore >= 60
      case ">=40%":
        return product.matchScore >= 40
      default:
        return true
    }
  })

  // Load customer data on mount
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}`)
        if (response.ok) {
          const customerData = await response.json()
          setCustomer(customerData)
        }
      } catch (error) {
        console.log("Using mock customer data")
      }
    }

    loadData()
  }, [customerId])

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - Customer Profile */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Profile</h2>
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <Image
                  src={customer.avatar || "/diverse-avatars.png"}
                  alt={customer.name}
                  width={64}
                  height={64}
                  className="rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold">{customer.name}</h3>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={customer.name}
                    onChange={(e) => handleCustomerUpdate("name", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customer.email}
                    onChange={(e) => handleCustomerUpdate("email", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={customer.phone}
                    onChange={(e) => handleCustomerUpdate("phone", e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave}>Save</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <h3 className="font-semibold mb-4">Dietary Restrictions</h3>
            <Card className="p-6">
              <DietaryRestrictionSelector value={dietary} onChange={setDietary} />
            </Card>
          </div>

          {/* Notes */}
          <div>
            <h3 className="font-semibold mb-4">Notes</h3>
            <Card className="p-4">
              <Textarea
                value={customer.notes}
                onChange={(e) => handleCustomerUpdate("notes", e.target.value)}
                placeholder="Add notes about this customer..."
                className="min-h-[80px]"
              />
            </Card>
          </div>
        </div>

        {/* Right Panel - Product Matches */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value=">=80%">≥ 80%</TabsTrigger>
                  <TabsTrigger value=">=60%">≥ 60%</TabsTrigger>
                  <TabsTrigger value=">=40%">≥ 40%</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")}>
                <TabsList>
                  <TabsTrigger value="grid">
                    <Grid className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button onClick={runMatch} disabled={matching} className="bg-black text-white hover:bg-gray-800">
              {matching ? "Running..." : "Run New Match"}
            </Button>
          </div>

          <MatchProgress running={matching} />

          <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.category} • {product.sku}
                      </p>
                    </div>
                  </div>

                  <div className="relative mb-4">
                    <Image
                      src={product.imageUrl || "/placeholder.svg"}
                      alt={product.name}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute bottom-2 left-2">
                      <div className="bg-orange-500 text-white px-2 py-1 rounded text-sm font-medium">
                        {product.matchScore}%
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {product.diets.map((diet) => (
                      <Badge key={diet} variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        {diet}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetails(product)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openNotes(product)}
                      className="flex items-center gap-1"
                    >
                      <FileText className="h-4 w-4" />
                      Notes
                      {notesMap[product.id] && <span className="ml-1 text-xs">📝</span>}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 ml-auto">
                      <X className="h-4 w-4" />
                      Exclude
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProductDetailsDrawer open={detailsOpen} onOpenChange={setDetailsOpen} product={detailsProduct} />

      <ProductNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        initial={activeNotesId ? (notesMap[activeNotesId] ?? "") : ""}
        onSave={saveNotes}
      />
    </div>
  )
}
