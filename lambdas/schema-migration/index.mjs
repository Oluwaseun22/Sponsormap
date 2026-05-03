/**
 * One-time migration: adds ATS fingerprinting fields to Typesense sponsors collection
 * and sets fingerprintStatus="pending" on all existing documents.
 *
 * Run locally:
 *   TYPESENSE_HOST=... TYPESENSE_ADMIN_KEY=... node lambdas/schema-migration/index.mjs
 */

import https from "https";

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const TYPESENSE_ADMIN_KEY = process.env.TYPESENSE_ADMIN_KEY;

const NEW_FIELDS = [
  { name: "atsType",           type: "string", facet: true,  optional: true },
  { name: "careersUrl",        type: "string",               optional: true },
  { name: "websiteUrl",        type: "string",               optional: true },
  { name: "fingerprintStatus", type: "string", facet: true,  optional: true },
  { name: "fingerprintedAt",   type: "string",               optional: true },
  { name: "jobCount",          type: "int32",                optional: true },
];

function typesenseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: TYPESENSE_HOST,
      path,
      method,
      headers: {
        "X-TYPESENSE-API-KEY": TYPESENSE_ADMIN_KEY,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function typesenseExport() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TYPESENSE_HOST,
      path: "/collections/sponsors/documents/export",
      method: "GET",
      headers: { "X-TYPESENSE-API-KEY": TYPESENSE_ADMIN_KEY },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.end();
  });
}

function typesenseImportBatch(ndjson) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TYPESENSE_HOST,
      path: "/collections/sponsors/documents/import?action=update",
      method: "POST",
      headers: {
        "X-TYPESENSE-API-KEY": TYPESENSE_ADMIN_KEY,
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(ndjson),
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        const lines = data.trim().split("\n");
        const results = lines.map(l => { try { return JSON.parse(l); } catch { return { success: false, error: l }; } });
        const failed = results.filter(r => !r.success).length;
        resolve({ total: results.length, failed });
      });
    });
    req.on("error", reject);
    req.write(ndjson);
    req.end();
  });
}

async function run() {
  if (!TYPESENSE_ADMIN_KEY) throw new Error("TYPESENSE_ADMIN_KEY env var required");

  // 1. Patch schema to add new fields
  console.log("Patching Typesense schema with ATS fingerprinting fields...");
  const patchRes = await typesenseRequest("PATCH", "/collections/sponsors", { fields: NEW_FIELDS });
  if (patchRes.status !== 200) {
    throw new Error(`Schema patch failed (${patchRes.status}): ${JSON.stringify(patchRes.body)}`);
  }
  console.log("Schema patched successfully.");

  // 2. Export all documents
  console.log("Exporting all documents...");
  const exportData = await typesenseExport();
  const lines = exportData.trim().split("\n").filter(Boolean);
  console.log(`Exported ${lines.length} documents.`);

  // 3. Build update payloads — only id + fingerprintStatus + jobCount defaults
  const BATCH_SIZE = 1000;
  let totalUpdated = 0;
  let totalFailed = 0;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const chunk = lines.slice(i, i + BATCH_SIZE);
    const updates = chunk.map(line => {
      const doc = JSON.parse(line);
      return JSON.stringify({
        id: doc.id,
        fingerprintStatus: "pending",
        jobCount: 0,
      });
    });
    const result = await typesenseImportBatch(updates.join("\n"));
    totalUpdated += result.total - result.failed;
    totalFailed += result.failed;
    process.stdout.write(`\r  Updated ${totalUpdated} | Failed ${totalFailed} | ${Math.min(i + BATCH_SIZE, lines.length)}/${lines.length}`);
  }

  console.log("\n\nDone!");
  console.log(`  Total updated: ${totalUpdated}`);
  console.log(`  Total failed:  ${totalFailed}`);
}

run().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
