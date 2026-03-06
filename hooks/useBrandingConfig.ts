"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/backend";
import { getVendorDisplayName } from "@/lib/vendor-config";

export type BrandingConfig = {
  vendorName: string;
  copyrightText: string;
};

const DEFAULT_COPYRIGHT = "© 2024. All rights reserved.";

/**
 * Fetches branding config from backend.
 * When vendorSlug is provided, backend resolves vendorName from gold.vendors by slug.
 * Copyright is generic. Falls back to frontend vendor-config when backend is unreachable.
 */
export function useBrandingConfig(vendorSlug?: string): BrandingConfig {
  const [config, setConfig] = useState<BrandingConfig>(() => ({
    vendorName: getVendorDisplayName(vendorSlug),
    copyrightText:
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_VENDOR_COPYRIGHT) ||
      DEFAULT_COPYRIGHT,
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
        const backendVendor = data?.vendorName?.trim();
        const backendCopyright = data?.copyrightText?.trim();
        if (!cancelled) {
          setConfig({
            vendorName: backendVendor || getVendorDisplayName(vendorSlug),
            copyrightText: backendCopyright || DEFAULT_COPYRIGHT,
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
