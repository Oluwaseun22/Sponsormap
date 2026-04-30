import https from "https";
import http from "http";

// ─── Config ───────────────────────────────────────────────────────────────────

const CSV_URL =
  "https://assets.publishing.service.gov.uk/media/69f318074b0f7395324fbb2d/2026-04-30_-_Worker_and_Temporary_Worker.csv";

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const TYPESENSE_ADMIN_KEY = process.env.TYPESENSE_ADMIN_KEY;

const BATCH_SIZE = 1000;

// ─── Region mapping ───────────────────────────────────────────────────────────

const SCOTLAND_COUNTIES = new Set([
  "Glasgow City", "City of Edinburgh", "Aberdeen City", "Highland", "Fife",
  "North Lanarkshire", "South Lanarkshire", "Aberdeenshire", "Edinburgh",
  "East Lothian", "West Lothian", "Dundee City", "Perth and Kinross",
  "Stirling", "Scottish Borders", "Dumfries and Galloway", "Angus",
  "Argyll and Bute", "East Ayrshire", "North Ayrshire", "South Ayrshire",
  "East Dunbartonshire", "West Dunbartonshire", "East Renfrewshire",
  "Renfrewshire", "Inverclyde", "Falkirk", "Clackmannanshire",
  "Moray", "Na h-Eileanan Siar", "Orkney Islands", "Shetland Islands",
  "Midlothian",
]);

const WALES_COUNTIES = new Set([
  "Cardiff", "Swansea", "Newport", "Wrexham", "Bridgend", "Rhondda Cynon Taf",
  "Carmarthenshire", "Caerphilly", "Vale of Glamorgan", "Powys", "Neath Port Talbot",
  "Ceredigion", "Pembrokeshire", "Flintshire", "Denbighshire", "Conwy",
  "Gwynedd", "Isle of Anglesey", "Torfaen", "Blaenau Gwent", "Merthyr Tydfil",
  "Monmouthshire",
]);

const NI_COUNTIES = new Set([
  "Belfast", "Antrim", "Derry", "Down", "Armagh", "Tyrone",
  "Londonderry", "Fermanagh", "County Antrim", "County Down",
  "County Armagh", "County Tyrone", "County Fermanagh",
  "Antrim and Newtownabbey", "Ards and North Down", "Armagh City, Banbridge and Craigavon",
  "Causeway Coast and Glens", "Derry City and Strabane", "Fermanagh and Omagh",
  "Mid and East Antrim", "Mid Ulster", "Newry, Mourne and Down", "North Down and Ards",
]);

function countyToRegion(county) {
  if (!county || county === "Not set" || county === "NULL") return "England";
  if (SCOTLAND_COUNTIES.has(county)) return "Scotland";
  if (WALES_COUNTIES.has(county)) return "Wales";
  if (NI_COUNTIES.has(county)) return "Northern Ireland";
  return "England";
}

// ─── Sector classification ────────────────────────────────────────────────────

function classifySector(name) {
  const n = name.toLowerCase();
  if (/nhs|hospital|health|medical|care|dental|pharmacy|clinic|surgery|therapeutic|physiother/.test(n)) return "Healthcare";
  if (/university|college|school|academy|education|institute of|learning|teaching/.test(n)) return "Education";
  if (/bank|financial|insurance|investment|capital|finance|asset management|fund|securities|credit|lending|mortgage|wealth/.test(n)) return "Finance";
  if (/tech|software|digital|data|cyber|systems|computing|cloud|platform|app|saas|ai |artificial intelligence|machine learning|blockchain|semiconductor/.test(n)) return "Technology";
  if (/engineering|construction|civil|mechanical|infrastructure|structural|electrical|aerospace|defence|manufacturing|fabricat/.test(n)) return "Engineering";
  if (/transport|logistics|aviation|rail|shipping|freight|courier|haulage|fleet|supply chain/.test(n)) return "Transport";
  if (/retail|store|shop|supermarket|fashion|food|restaurant|hospitality|hotel|catering|leisure|sport/.test(n)) return "Retail";
  return "Professional Services";
}

// ─── Slug generation ──────────────────────────────────────────────────────────

function makeSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    let data = "";
    const req = client.get(url, { headers: { "User-Agent": "SponsorMap-Ingestor/1.0" } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      res.setEncoding("utf8");
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
  });
}

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

function typesenseImportBatch(docs) {
  return new Promise((resolve, reject) => {
    const ndjson = docs.map(d => JSON.stringify(d)).join("\n");
    const options = {
      hostname: TYPESENSE_HOST,
      path: "/collections/sponsors/documents/import?action=upsert",
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

// ─── Parse Type & Rating column ───────────────────────────────────────────────
// Example values: "Worker (A)", "Worker (A (Premium))", "Worker (B)", "Temporary Worker (A)"

function parseTypeRating(raw) {
  if (!raw) return { status: "Active", rating: "" };
  const lower = raw.toLowerCase();
  const status = lower.includes("suspend") ? "Suspended" : "Active";
  const match = raw.match(/\(\s*([AB])\s*[\s)]/);
  const rating = match ? match[1] : "";
  return { status, rating };
}

// ─── Collection schema ────────────────────────────────────────────────────────

const COLLECTION_SCHEMA = {
  name: "sponsors",
  fields: [
    { name: "name",         type: "string"   },
    { name: "slug",         type: "string"   },
    { name: "town",         type: "string",   facet: true, optional: true },
    { name: "county",       type: "string",   facet: true, optional: true },
    { name: "region",       type: "string",   facet: true, optional: true },
    { name: "sector",       type: "string",   facet: true, optional: true },
    { name: "rating",       type: "string",   facet: true, optional: true },
    { name: "primaryRoute", type: "string",   facet: true, optional: true },
    { name: "routes",       type: "string[]", facet: true, optional: true },
    { name: "status",       type: "string",   facet: true, optional: true },
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  if (!TYPESENSE_ADMIN_KEY) throw new Error("TYPESENSE_ADMIN_KEY env var is required");

  // 1. Download CSV
  console.log("Downloading Home Office sponsor register...");
  const csv = await fetchText(CSV_URL);
  const allLines = csv.split("\n").filter(l => l.trim());
  console.log(`Downloaded ${allLines.length - 1} rows`);

  const headers = parseCSVLine(allLines[0]).map(h => h.toLowerCase().trim());
  const col = {
    name:       headers.indexOf("organisation name"),
    town:       headers.indexOf("town/city"),
    county:     headers.indexOf("county"),
    typeRating: headers.indexOf("type & rating"),
    route:      headers.indexOf("route"),
  };
  if (col.name === -1) throw new Error("Could not find 'Organisation Name' column. Headers: " + headers.join(", "));

  // 2. Parse and deduplicate by organisation name
  // Key = lowercased name. First row wins for all fields except routes (merged).
  const orgMap = new Map();

  for (let i = 1; i < allLines.length; i++) {
    const fields = parseCSVLine(allLines[i]);
    const rawName = fields[col.name]?.trim() || "";
    if (!rawName) continue;

    const key = rawName.toLowerCase();

    if (!orgMap.has(key)) {
      const town      = fields[col.town]?.trim()       || "";
      const county    = fields[col.county]?.trim()     || "";
      const typeRating = fields[col.typeRating]?.trim() || "";
      const { status, rating } = parseTypeRating(typeRating);
      orgMap.set(key, {
        name:   rawName,
        town,
        county,
        region: countyToRegion(county),
        sector: classifySector(rawName),
        rating,
        status,
        routes: new Set(),
      });
    }

    const route = fields[col.route]?.trim() || "";
    if (route) orgMap.get(key).routes.add(route);
  }

  const totalRaw    = allLines.length - 1;
  const totalUnique = orgMap.size;
  console.log(`Unique organisations after dedup: ${totalUnique} (from ${totalRaw} rows, ${totalRaw - totalUnique} duplicates removed)`);

  // 3. Drop and recreate collection
  console.log("Recreating Typesense collection...");
  await typesenseRequest("DELETE", "/collections/sponsors", null);
  const createRes = await typesenseRequest("POST", "/collections", COLLECTION_SCHEMA);
  if (createRes.status !== 201) throw new Error("Failed to create collection: " + JSON.stringify(createRes.body));
  console.log("Collection created.");

  // 4. Build docs and import in batches
  let totalImported = 0;
  let totalFailed   = 0;
  let batch         = [];
  let docIndex      = 0;

  for (const entry of orgMap.values()) {
    const routes = [...entry.routes];
    const slug   = makeSlug(entry.name);
    batch.push({
      id:           slug,
      name:         entry.name,
      slug,
      town:         entry.town,
      county:       entry.county,
      region:       entry.region,
      sector:       entry.sector,
      rating:       entry.rating,
      primaryRoute: routes[0] || "",
      routes,
      status:       entry.status,
    });
    docIndex++;

    if (batch.length >= BATCH_SIZE) {
      const result = await typesenseImportBatch(batch);
      totalImported += result.total - result.failed;
      totalFailed   += result.failed;
      process.stdout.write(`\r  Imported ${totalImported} | Failed ${totalFailed} | ${docIndex}/${totalUnique}`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    const result = await typesenseImportBatch(batch);
    totalImported += result.total - result.failed;
    totalFailed   += result.failed;
  }

  console.log(`\n\nDone!`);
  console.log(`  Total imported: ${totalImported}`);
  console.log(`  Total failed:   ${totalFailed}`);

  const countRes = await typesenseRequest("GET", "/collections/sponsors", null);
  console.log(`  Typesense count: ${countRes.body.num_documents}`);
}

run().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
