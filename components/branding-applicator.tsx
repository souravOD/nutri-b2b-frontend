"use client";

import { useEffect } from "react";
import { useBrandingConfig } from "@/hooks/useBrandingConfig";

/** Convert a 6-digit hex color to an OKLCH CSS string for Tailwind v4 compatibility. */
function hexToOklch(hex: string): string | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);

  // Linear sRGB → XYZ D65
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  // XYZ → Oklab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);

  const okL = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const okA = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const okB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(okA * okA + okB * okB);
  const H = (Math.atan2(okB, okA) * 180) / Math.PI;
  return `oklch(${okL.toFixed(4)} ${C.toFixed(4)} ${(H < 0 ? H + 360 : H).toFixed(2)})`;
}

/**
 * Mounts in the layout and applies vendor branding to CSS variables + favicon.
 * Renders nothing visible — side-effects only.
 */
export default function BrandingApplicator() {
  const { primaryColor, faviconUrl } = useBrandingConfig();

  useEffect(() => {
    if (!primaryColor) return;
    const color = primaryColor.trim();
    const cssValue = color.startsWith("#") ? (hexToOklch(color) ?? color) : color;
    document.documentElement.style.setProperty("--primary", cssValue);
    document.documentElement.style.setProperty("--ring", cssValue);
  }, [primaryColor]);

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);

  return null;
}
