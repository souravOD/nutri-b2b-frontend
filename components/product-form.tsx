"use client"

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
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

const schema = z.object({
  name: z.string().min(2),
  sku: z.string().min(1),
  status: z.enum(["active", "inactive"]),
  category: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
})

type FormValues = z.infer<typeof schema>
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
    defaultValues: {
      name: initialValues.name ?? "",
      sku: initialValues.sku ?? "",
      status: (initialValues.status as any) ?? "active",
      category: initialValues.category ?? "",
      description: initialValues.description ?? "",
      tags: initialValues.tags ?? [],
    },
  })
  const [tag, setTag] = React.useState("")
  const onSubmit = async (values: FormValues) => {
    try {
      if (mode === "create") {
        await fetch("/api/products", {
          method: "POST",
          body: JSON.stringify(values),
        })
      } else {
        // For demo, just POST (would be PUT with id in real use)
        await fetch("/api/products", {
          method: "POST",
          body: JSON.stringify(values),
        })
      }
      toast({ title: "Saved", description: "Product has been saved." })
      setOpen(false)
      onSaved()
    } catch (e) {
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
              <Label htmlFor="name">{"Name"}</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <span className="text-xs text-rose-600">{form.formState.errors.name.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sku">{"SKU"}</Label>
              <Input id="sku" {...form.register("sku")} />
              {form.formState.errors.sku && (
                <span className="text-xs text-rose-600">{form.formState.errors.sku.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label>{"Status"}</Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{"Active"}</SelectItem>
                  <SelectItem value="inactive">{"Inactive"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{"Category"}</Label>
              <Input {...form.register("category")} />
              {form.formState.errors.category && (
                <span className="text-xs text-rose-600">{form.formState.errors.category.message}</span>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{"Description"}</Label>
            <Textarea rows={4} {...form.register("description")} />
          </div>
          <div className="grid gap-2">
            <Label>{"Tags"}</Label>
            <div className="flex gap-2">
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Add tag"
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
                variant="secondary"
                onClick={() => {
                  if (tag.trim()) {
                    form.setValue("tags", [...(form.getValues("tags") ?? []), tag.trim()])
                    setTag("")
                  }
                }}
              >
                {"Add"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(form.watch("tags") ?? []).map((t, i) => (
                <Badge key={`${t}-${i}`} className="gap-1">
                  {t}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      const next = (form.getValues("tags") ?? []).filter((x) => x !== t)
                      form.setValue("tags", next)
                    }}
                    aria-label={`Remove ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {"Cancel"}
            </Button>
            <Button type="submit">{mode === "create" ? "Create" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
