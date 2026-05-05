/**
 * One-time setup: creates the `jobs` Typesense collection.
 *
 * Run locally:
 *   TYPESENSE_HOST=... TYPESENSE_ADMIN_KEY=... node lambdas/create-jobs-collection/index.mjs
 */

import https from "https";

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const TYPESENSE_ADMIN_KEY = process.env.TYPESENSE_ADMIN_KEY;

const JOBS_SCHEMA = {
  name: "jobs",
  fields: [
    { name: "id",            type: "string" },
    { name: "sponsorSlug",   type: "string", facet: true },
    { name: "sponsorName",   type: "string" },
    { name: "title",         type: "string" },
    { name: "location",      type: "string", facet: true },
    { name: "salary",        type: "string", optional: true },
    { name: "salaryMin",     type: "int32" },
    { name: "salaryMax",     type: "int32" },
    { name: "sector",        type: "string", facet: true, optional: true },
    { name: "region",        type: "string", facet: true, optional: true },
    { name: "atsType",       type: "string", facet: true },
    { name: "careersUrl",    type: "string" },
    { name: "postedAt",      type: "string", optional: true },
    { name: "scrapedAt",     type: "string" },
    { name: "status",        type: "string", facet: true },
    { name: "sponsorRating", type: "string", facet: true, optional: true },
    { name: "route",         type: "string", facet: true, optional: true },
  ],
  default_sorting_field: "",
};

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

async function run() {
  if (!TYPESENSE_ADMIN_KEY) throw new Error("TYPESENSE_ADMIN_KEY env var required");

  // Check if collection already exists
  const existing = await typesenseRequest("GET", "/collections/jobs");
  if (existing.status === 200) {
    console.log("Collection 'jobs' already exists. Dropping and recreating...");
    const del = await typesenseRequest("DELETE", "/collections/jobs");
    if (del.status !== 200) throw new Error(`Failed to delete: ${JSON.stringify(del.body)}`);
    console.log("Dropped existing 'jobs' collection.");
  }

  console.log("Creating 'jobs' collection...");
  const res = await typesenseRequest("POST", "/collections", JOBS_SCHEMA);
  if (res.status !== 201) {
    throw new Error(`Failed to create collection (${res.status}): ${JSON.stringify(res.body)}`);
  }
  console.log("Collection 'jobs' created successfully.");
  console.log(JSON.stringify(res.body, null, 2));
}

run().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
