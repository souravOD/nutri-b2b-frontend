"use client"

import Image from "next/image"
import { ZoomIn } from "lucide-react"

export default function ProductImageCard({ product }: { product: any }) {
  const imageUrl = product?.imageUrl ?? product?.image_url ?? product?.image
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[16px] overflow-hidden shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <div className="bg-[#f1f5f9] flex items-center justify-center p-8 relative">
        <div className="relative w-[200px] h-[200px]">
          <Image
            src={imageUrl || "/placeholder.svg?height=200&width=200"}
            alt={product?.name ?? "Product"}
            width={200}
            height={200}
            className="object-contain"
          />
          <div className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-sm">
            <ZoomIn className="h-4 w-4 text-[#64748b]" />
          </div>
        </div>
      </div>
      <div className="flex gap-2 p-4 border-t border-[#e2e8f0]">
        <div className="w-12 h-12 rounded-lg border-2 border-[#00438f] bg-[#f8fafc] flex items-center justify-center overflow-hidden">
          <Image
            src={imageUrl || "/placeholder.svg?height=48&width=48"}
            alt=""
            width={48}
            height={48}
            className="object-cover"
          />
        </div>
        <div className="w-12 h-12 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-center">
          <span className="text-[#cbd5e1] text-xs">+</span>
        </div>
      </div>
    </div>
  )
}
