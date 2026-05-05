/**
 * Job scraper dispatcher Lambda.
 *
 * Reads all fingerprinted sponsors from Typesense, sends one SQS message
 * per sponsor to the sponsormap-jobs-queue. Each scraper Lambda filters
 * by atsType in the message.
 *
 * EventBridge trigger: daily at 09:00 UTC (sponsormap-job-scraper-daily)
 */

import https from "https";
import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const REGION = process.env.AWS_REGION || "eu-west-2";
const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "fui5vhorsa9be0jtp-1.a1.typesense.net";
const QUEUE_URL = process.env.SQS_QUEUE_URL;

const smClient = new SecretsManagerClient({ region: REGION });
const sqsClient = new SQSClient({ region: REGION });

const _secretCache = {};
async function getSecret(id) {
  if (_secretCache[id]) return _secretCache[id];
  const res = await smClient.send(new GetSecretValueCommand({ SecretId: id }));
  _secretCache[id] = res.SecretString;
  return res.SecretString;
}

const SUPPORTED_ATS = new Set(["Greenhouse", "Lever", "Workday", "Ashby"]);

function tsRequest(method, path, adminKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TYPESENSE_HOST,
      path,
      method,
      headers: { "X-TYPESENSE-API-KEY": adminKey },
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
    req.end();
  });
}

async function fetchAllFingerprintedSponsors(adminKey) {
  const sponsors = [];
  const perPage = 250;
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      q: "*",
      query_by: "name",
      filter_by: "fingerprintStatus:=done",
      per_page: String(perPage),
      page: String(page),
    });
    const res = await tsRequest("GET", `/collections/sponsors/documents/search?${params}`, adminKey);
    if (res.status !== 200) throw new Error(`Typesense search failed: ${JSON.stringify(res.body)}`);
    const hits = res.body.hits || [];
    for (const hit of hits) {
      const doc = hit.document;
      if (doc.atsType && SUPPORTED_ATS.has(doc.atsType) && doc.careersUrl) {
        sponsors.push(doc);
      }
    }
    if (hits.length < perPage) break;
    page++;
  }

  return sponsors;
}

async function sendBatch(messages) {
  // SQS SendMessageBatch allows max 10 messages per call
  for (let i = 0; i < messages.length; i += 10) {
    const chunk = messages.slice(i, i + 10);
    const entries = chunk.map((msg, idx) => ({
      Id: String(idx),
      MessageBody: JSON.stringify(msg),
      MessageAttributes: {
        atsType: {
          DataType: "String",
          StringValue: msg.atsType,
        },
      },
    }));
    const cmd = new SendMessageBatchCommand({ QueueUrl: QUEUE_URL, Entries: entries });
    const result = await sqsClient.send(cmd);
    if (result.Failed?.length) {
      console.warn(`SQS batch failures: ${result.Failed.length}`, result.Failed);
    }
  }
}

export async function handler() {
  if (!QUEUE_URL) throw new Error("SQS_QUEUE_URL env var required");

  const adminKey = process.env.TYPESENSE_ADMIN_KEY ?? await getSecret("prod/typesense-admin-key");

  console.log("Fetching fingerprinted sponsors...");
  const sponsors = await fetchAllFingerprintedSponsors(adminKey);
  console.log(`Found ${sponsors.length} sponsors to dispatch`);

  const messages = sponsors.map(s => ({
    sponsorSlug:  s.slug,
    atsType:      s.atsType,
    careersUrl:   s.careersUrl,
    name:         s.name,
    sector:       s.sector || "",
    region:       s.region || "",
    rating:       s.rating || "",
    primaryRoute: s.primaryRoute || "",
  }));

  await sendBatch(messages);

  const byType = {};
  for (const m of messages) byType[m.atsType] = (byType[m.atsType] || 0) + 1;
  console.log("Dispatched:", byType);

  return {
    statusCode: 200,
    body: JSON.stringify({ dispatched: messages.length, breakdown: byType }),
  };
}
