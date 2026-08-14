// scripts/build-webboard.mjs
//
// Fetches the live GitHub contribution chart and bakes it into
// assets/vtracker-webboard.svg as an inline base64 data URI.
//
// Why: GitHub serves raw/embedded SVGs with a strict CSP
// (default-src 'none'), which blocks any <image href="https://..."> the
// SVG tries to load itself. Baking the chart in as a data URI at build
// time sidesteps that entirely — there's no external fetch left for the
// browser to block. This script is meant to be run by the GitHub Action
// in .github/workflows/update-webboard.yml, which runs on a schedule so
// the chart stays fresh.

import { readFile, writeFile } from "node:fs/promises";

const USERNAME = "Vinod650754";
const ACCENT_HEX = "ff1f3d"; // no leading '#'
const CHART_URL = `https://ghchart.rshah.org/${ACCENT_HEX}/${USERNAME}`;

const TEMPLATE_PATH = new URL("../assets/vtracker-webboard.template.svg", import.meta.url);
const OUTPUT_PATH = new URL("../assets/vtracker-webboard.svg", import.meta.url);

async function main() {
  console.log(`Fetching chart: ${CHART_URL}`);
  const res = await fetch(CHART_URL, {
    headers: { "User-Agent": "vtracker-webboard-bot" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch chart: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") || "image/svg+xml";
  const buffer = Buffer.from(await res.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUri = `data:${contentType.split(";")[0]};base64,${base64}`;

  const template = await readFile(TEMPLATE_PATH, "utf8");

  if (!template.includes("{{CHART_DATA_URI}}")) {
    throw new Error("Template is missing the {{CHART_DATA_URI}} placeholder.");
  }

  const output = template.replace("{{CHART_DATA_URI}}", dataUri);

  await writeFile(OUTPUT_PATH, output, "utf8");
  console.log(`Wrote ${OUTPUT_PATH.pathname} (${(output.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

