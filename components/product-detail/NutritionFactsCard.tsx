"use client"

const fmt = (x?: number, unit = "") =>
  typeof x === "number" && Number.isFinite(x) ? `${x}${unit}` : "—"

export default function NutritionFactsCard({ product }: { product: any }) {
  const n = product?.nutrition ?? {}
  const servingSize = product?.servingSize ?? "—"

  const pct = (val: number | undefined, daily: number) =>
    val != null && Number.isFinite(val) ? Math.round((val / daily) * 100) : null

  return (
    <div className="bg-white border-2 border-[rgba(15,23,42,0.05)] rounded-[16px] p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[rgba(0,67,143,0.05)] rounded-bl-full" />
      <h3 className="font-black text-[20px] text-[#0f172a] mb-2">Nutrition Facts</h3>
      <div className="border-b-4 border-[#0f172a] pb-2 mb-3">
        <span className="text-xs text-[#64748b]">Per {servingSize} serving</span>
      </div>
      <div className="space-y-0">
        <div className="flex justify-between items-end py-2 border-b border-[#e2e8f0]">
          <span className="font-black text-lg text-[#0f172a]">Calories</span>
          <span className="font-black text-xl text-[#0f172a]">{fmt(n.calories ?? n.calories_g)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
          <span className="font-bold text-base text-[#0f172a]">Total Fat {fmt(n.fat_g ?? n.fat, "g")}</span>
          <span className="font-bold text-base text-[#0f172a]">{pct(n.fat_g ?? n.fat, 78) ?? "—"}%</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#f1f5f9] pl-4">
          <span className="font-normal text-sm text-[#0f172a]">Saturated Fat {fmt(n.saturated_fat_g ?? n.saturated_fat, "g")}</span>
          <span className="font-bold text-sm text-[#0f172a]">{pct(n.saturated_fat_g ?? n.saturated_fat, 20) ?? "—"}%</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
          <span className="font-bold text-base text-[#0f172a]">Sodium {fmt(n.sodium_mg ?? n.sodium, "mg")}</span>
          <span className="font-bold text-base text-[#0f172a]">{pct(n.sodium_mg ?? n.sodium, 2300) ?? "—"}%</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#f1f5f9]">
          <span className="font-bold text-base text-[#0f172a]">Total Carbohydrate {fmt(n.carbs_g ?? n.carbs, "g")}</span>
          <span className="font-bold text-base text-[#0f172a]">{pct(n.carbs_g ?? n.carbs, 275) ?? "—"}%</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#f1f5f9] pl-4">
          <span className="font-normal text-sm text-[#0f172a]">Total Sugars {fmt(n.sugar_g ?? n.sugar, "g")}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#f1f5f9] pl-8">
          <span className="font-normal text-sm text-[#0f172a]">Includes {fmt(n.added_sugar_g, "g")} Added Sugars</span>
          <span className="font-bold text-sm text-[#0f172a]">—</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b-8 border-[#0f172a]">
          <span className="font-bold text-base text-[#0f172a]">Protein</span>
          <span className="font-bold text-base text-[#0f172a]">{fmt(n.protein_g ?? n.protein, "g")}</span>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="font-normal text-xs text-[#0f172a]">Potassium</span>
          <span className="font-bold text-xs text-[#0f172a]">{fmt(n.potassium_mg, "mg")}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="font-normal text-xs text-[#0f172a]">Phosphorus</span>
          <span className="font-bold text-xs text-[#0f172a]">{fmt(n.phosphorus_mg, "mg")}</span>
        </div>
      </div>
    </div>
  )
}
