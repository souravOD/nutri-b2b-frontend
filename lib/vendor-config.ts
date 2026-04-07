/**
 * Vendor display name resolution for auth pages.
 * Priority: (1) env, (2) static map, (3) titleCase fallback.
 */

const VENDOR_DISPLAY_NAMES: Record<string, string> = {
  "sams-club": "Sam's Club",
  walmart: "Walmart",
  target: "Target",
  kroger: "Kroger",
  costco: "Costco",
  wholefoods: "Whole Foods Market",
  aldi: "ALDI (US)",
  lidl: "Lidl (US)",
  traderjoes: "Trader Joe's",
  publix: "Publix",
  heb: "H-E-B",
  albertsons: "Albertsons",
  odysseyts: "Odyssey",
}

function titleCase(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Get display name for a vendor.
 * @param vendorSlug - Optional slug from URL (e.g. "sams-club"). Omit for main /login.
 */
export function getVendorDisplayName(vendorSlug?: string): string {
  const envName = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_VENDOR_NAME
  if (envName?.trim()) return envName.trim()

  if (vendorSlug?.trim()) {
    const key = vendorSlug.trim().toLowerCase()
    const mapped = VENDOR_DISPLAY_NAMES[key]
    if (mapped) return mapped
    return titleCase(key)
  }

  return "B2B Portal"
}
