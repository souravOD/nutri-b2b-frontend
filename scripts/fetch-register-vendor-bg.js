#!/usr/bin/env node
/**
 * Fetches the Register Vendor background image (Figma node 745-4941) from the
 * Figma API and saves it to public/assets/register-vendor-bg.png.
 *
 * Requires FIGMA_ACCESS_TOKEN environment variable.
 * Create one at: Figma → Settings → Account → Personal access tokens
 *
 * Usage:
 *   FIGMA_ACCESS_TOKEN=your_token node scripts/fetch-register-vendor-bg.js
 *   Or: npm run fetch:register-vendor-bg (add FIGMA_ACCESS_TOKEN to .env.local)
 */

const { mkdir, writeFile } = require("fs/promises");
const { readFileSync } = require("fs");
const { dirname, join } = require("path");

// Load FIGMA_ACCESS_TOKEN from .env.local if present
try {
  const envPath = join(__dirname, "..", ".env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch (_) {}

const FIGMA_FILE_KEY = "SOnmoasSGvCmu7ri0z129N";
const NODE_ID = "745:4941";
const OUTPUT_PATH = join(__dirname, "..", "public", "assets", "register-vendor-bg.png");

async function main() {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    console.error("Error: FIGMA_ACCESS_TOKEN environment variable is required.");
    console.error("Create one at: Figma → Settings → Account → Personal access tokens");
    process.exit(1);
  }

  console.log("Fetching image URL from Figma API...");
  const apiUrl = `https://api.figma.com/v1/images/${FIGMA_FILE_KEY}?ids=${encodeURIComponent(NODE_ID)}&format=png`;
  const apiRes = await fetch(apiUrl, {
    headers: { "X-FIGMA-TOKEN": token },
  });

  if (!apiRes.ok) {
    console.error(`Figma API error: ${apiRes.status} ${apiRes.statusText}`);
    const body = await apiRes.text();
    console.error(body);
    process.exit(1);
  }

  const data = await apiRes.json();
  const imageUrl = data?.images?.[NODE_ID];
  if (!imageUrl) {
    console.error("Error: No image URL in response for node", NODE_ID);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("Downloading image...");
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    console.error(`Image fetch error: ${imageRes.status} ${imageRes.statusText}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await imageRes.arrayBuffer());
  const outputDir = dirname(OUTPUT_PATH);
  await mkdir(outputDir, { recursive: true });
  await writeFile(OUTPUT_PATH, buffer);

  console.log(`Saved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
