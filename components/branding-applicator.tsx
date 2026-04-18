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
  const { primaryColor, secondaryColor, accentColor, faviconUrl, fontUrl, ga4MeasurementId, mixpanelToken } = useBrandingConfig();

  useEffect(() => {
    if (!primaryColor) return;
    const color = primaryColor.trim();
    const cssValue = color.startsWith("#") ? (hexToOklch(color) ?? color) : color;
    document.documentElement.style.setProperty("--primary", cssValue);
    document.documentElement.style.setProperty("--ring", cssValue);
  }, [primaryColor]);

  useEffect(() => {
    if (!secondaryColor) return;
    const color = secondaryColor.trim();
    const cssValue = color.startsWith("#") ? (hexToOklch(color) ?? color) : color;
    document.documentElement.style.setProperty("--secondary", cssValue);
  }, [secondaryColor]);

  useEffect(() => {
    if (!accentColor) return;
    const color = accentColor.trim();
    const cssValue = color.startsWith("#") ? (hexToOklch(color) ?? color) : color;
    document.documentElement.style.setProperty("--accent", cssValue);
  }, [accentColor]);

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

  useEffect(() => {
    if (!fontUrl) return;
    const id = "vendor-font-stylesheet";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = fontUrl;
      document.head.appendChild(link);
    } else {
      (document.getElementById(id) as HTMLLinkElement).href = fontUrl;
    }
    document.documentElement.style.setProperty("--font-family", "var(--vendor-font, sans-serif)");
  }, [fontUrl]);

  useEffect(() => {
    if (!ga4MeasurementId) return;
    const scriptId = "vendor-ga4-script";
    if (document.getElementById(scriptId)) return; // already injected
    // Async gtag loader
    const loaderScript = document.createElement("script");
    loaderScript.id = scriptId;
    loaderScript.async = true;
    loaderScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4MeasurementId)}`;
    document.head.appendChild(loaderScript);
    // Inline gtag init
    const initScript = document.createElement("script");
    initScript.id = "vendor-ga4-init";
    initScript.textContent = [
      "window.dataLayer = window.dataLayer || [];",
      "function gtag(){dataLayer.push(arguments);}",
      "gtag('js', new Date());",
      `gtag('config', '${ga4MeasurementId}');`,
    ].join("\n");
    document.head.appendChild(initScript);
  }, [ga4MeasurementId]);

  // Mixpanel — inject CDN snippet and initialise with per-vendor token.
  // Uses the same deferred-script pattern as GA4.
  // window.mixpanel is then available globally for trackEvent() in analytics.ts.
  useEffect(() => {
    if (!mixpanelToken) return;
    if (document.getElementById("vendor-mixpanel-script")) return; // already injected

    // Mixpanel's official snippet (minified stub) — queues calls until the
    // async bundle loads, so trackEvent() calls made during page init are safe.
    const stub = document.createElement("script");
    stub.id = "vendor-mixpanel-script";
    stub.textContent = [
      `(function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;`,
      `b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");`,
      `2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(`,
      `Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==`,
      `typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];`,
      `a.toString=function(a){var d="mixpanel";"mixpanel"!==c&&(d+="."+c);`,
      `a||(d+=" (stub)");return d};a.people.toString=function(){return`,
      `a.toString(1)+".people (stub)"};i="disable time_event track`,
      `track_pageview track_links track_forms track_with_groups add_group`,
      `set_group remove_group register register_once alias unregister`,
      `identify name_tag set_config reset opt_in_tracking opt_out_tracking`,
      `has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking`,
      `start_batch_senders people.set people.set_once people.unset`,
      `people.increment people.append people.union people.track_charge`,
      `people.clear_charges people.delete_user people.remove".split(" ");`,
      `for(h=0;h<i.length;h++)g(a,i[h]);b._i.push([e,f,c])};`,
      `b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";`,
      `e.async=!0;e.src="https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";`,
      `g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)`,
      `}})(document,window.mixpanel||[]);`,
      `mixpanel.init("${mixpanelToken.replace(/"/g, "")}",{persistence:"localStorage"});`,
    ].join("");
    document.head.appendChild(stub);
  }, [mixpanelToken]);

  return null;
}
