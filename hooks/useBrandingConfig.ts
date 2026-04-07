"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/backend";
import { getVendorDisplayName } from "@/lib/vendor-config";

export type BrandingConfig = {
  vendorName: string;
  copyrightText: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontUrl: string | null;
  ga4MeasurementId: string | null;
};

const DEFAULT_COPYRIGHT = "© 2024. All rights reserved.";

/**
 * Fetches branding config from backend.
 * When vendorSlug is provided, backend resolves vendorName from gold.vendors by slug.
 * Falls back to frontend vendor-config when backend is unreachable.
 */
export function useBrandingConfig(vendorSlug?: string): BrandingConfig {
  const [config, setConfig] = useState<BrandingConfig>(() => ({
    vendorName: getVendorDisplayName(vendorSlug),
    copyrightText:
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_VENDOR_COPYRIGHT) ||
      DEFAULT_COPYRIGHT,
    logoUrl: null,
    faviconUrl: null,
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
    fontUrl: null,
    ga4MeasurementId: null,
  }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = vendorSlug
          ? `/api/config/branding?slug=${encodeURIComponent(vendorSlug)}`
          : "/api/config/branding";
        const res = await apiFetch(url);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setConfig({
            vendorName: data?.vendorName?.trim() || getVendorDisplayName(vendorSlug),
            copyrightText: data?.copyrightText?.trim() || DEFAULT_COPYRIGHT,
            logoUrl: data?.logoUrl || null,
            faviconUrl: data?.faviconUrl || null,
            primaryColor: data?.primaryColor || null,
            secondaryColor: data?.secondaryColor || null,
            accentColor: data?.accentColor || null,
            fontUrl: data?.fontUrl || null,
            ga4MeasurementId: data?.ga4MeasurementId || null,
          });
        }
      } catch {
        /* keep fallback */
      }
    })();
    return () => { cancelled = true; };
  }, [vendorSlug]);

  return config;
}
