import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

// Resolve target Appwrite endpoint and project id from env
const RAW_ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || "").trim().replace(/\/+$/, "");
const PROJECT = (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT || process.env.APPWRITE_PROJECT_ID || "").trim();

function targetUrl(req: NextRequest, path: string[]) {
  const suffix = path.join("/");
  const qs = new URL(req.url).search || "";
  const base = RAW_ENDPOINT || "https://cloud.appwrite.io/v1"; // safe fallback
  return `${base}/${suffix}${qs}`;
}

function rewriteSetCookie(setCookieValues: string[] | undefined) {
  if (!setCookieValues || setCookieValues.length === 0) return [] as string[];
  return setCookieValues.map((v) => {
    // Drop Domain attribute so cookie becomes first‑party (current host)
    let c = v.replace(/;\s*Domain=[^;]*/gi, "");
    // Constrain Path to the proxy base to avoid leaking to whole site
    if (/;\s*Path=/i.test(c)) {
      c = c.replace(/;\s*Path=[^;]*/i, "; Path=/api/appwrite");
    } else {
      c += "; Path=/api/appwrite";
    }
    return c;
  });
}

async function handle(req: NextRequest, ctx: { params: { path: string[] } }) {
  const { path } = ctx.params;
  const url = targetUrl(req, path);

  // Clone incoming headers and forward subset to Appwrite
  const fwd = new Headers();
  // Project header is required for most endpoints
  if (PROJECT) fwd.set("X-Appwrite-Project", PROJECT);
  // Pass content type if present
  const ct = req.headers.get("content-type");
  if (ct) fwd.set("content-type", ct);
  // Forward cookies from our domain to upstream
  const ck = req.headers.get("cookie");
  if (ck) fwd.set("cookie", ck);
  // Pass authorization if any (rarely used on browser SDK flows)
  const auth = req.headers.get("authorization");
  if (auth) fwd.set("authorization", auth);

  // Stream body directly when present
  const init: RequestInit = {
    method: req.method,
    headers: fwd,
    body: req.body as any, // Web stream is fine for fetch
    redirect: "manual",
  };

  const upstream = await fetch(url, init);

  // Copy response headers except Set-Cookie which we rewrite
  const outHeaders = new Headers();
  upstream.headers.forEach((val, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    outHeaders.set(key, val);
  });

  // Gather and rewrite all Set-Cookie headers from upstream
  const setCookies: string[] = (upstream.headers as any).getSetCookie
    ? (upstream.headers as any).getSetCookie()
    : (() => {
        const raw = upstream.headers.get("set-cookie");
        if (!raw) return [] as string[];
        // Split on comma not part of Expires attribute
        return raw.split(/,(?=[^;]+?=)/g);
      })();

  const rewritten = rewriteSetCookie(setCookies);
  for (const sc of rewritten) outHeaders.append("set-cookie", sc);

  // Stream body back
  const body = upstream.body ? upstream.body : undefined;
  return new NextResponse(body, { status: upstream.status, headers: outHeaders });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
