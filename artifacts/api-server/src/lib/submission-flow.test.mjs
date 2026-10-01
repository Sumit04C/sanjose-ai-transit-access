// Isolated HTTP verification uses dummy gate credentials, never the real access code.
// External credentials are inherited only by the backend application process.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const port = 18809;
const base = `http://127.0.0.1:${port}/api`;
const server = spawn(process.execPath, ["dist/index.mjs"], {
  cwd: fileURLToPath(new URL("../../", import.meta.url)),
  env: {
    ...process.env, PORT: String(port), NODE_ENV: "production",
    TRANSIT_REPORT_PASSCODE: "1357", SESSION_SECRET: "isolated-transit-test-only",
  },
  stdio: "ignore",
});
const created = [];
const marker = `transit-smoke-${randomUUID()}`;

try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      ready = (await fetch(`${base}/healthz`)).ok;
      if (ready) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.equal(ready, true, "Isolated API must start");
  assert.equal((await fetch(`${base}/submissions`)).status, 401);
  assert.equal((await fetch(`${base}/transit/matches?route=22`)).status, 401);
  const unlock = await fetch(`${base}/access/unlock`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ passcode: "1357" }),
  });
  assert.equal(unlock.status, 200);
  const cookie = unlock.headers.get("set-cookie").split(";")[0];
  const headers = { cookie, "content-type": "application/json" };
  const match = await fetch(`${base}/transit/matches?route=60&stop=Santa%20Clara%20Transit%20Center%20%28Bay%201%29`, { headers });
  assert.equal(match.status, 200);
  const matches = await match.json();
  assert.ok(Array.isArray(matches.routes) && Array.isArray(matches.stops));
  assert.equal(matches.routes.length, 1, "Test route must resolve to one actual provider candidate");
  assert.equal(matches.stops.length, 1, "Test bay must resolve to one actual provider candidate");

  const response = await fetch(`${base}/submissions`, {
    method: "POST", headers,
    body: JSON.stringify({
      description: `[242] Classroom test ${marker}: I waited for route 60 at Santa Clara Transit Center (Bay 1).`,
      language: "en", imageName: null, issueCategory: "delay",
      route: "60", stop: "Santa Clara Transit Center (Bay 1)", inputIsSynthetic: false,
      routeId: matches.routes[0].id, stopId: matches.stops[0].id,
    }),
  });
  assert.equal(response.status, 201);
  const first = await response.json();
  created.push(first.id);
  assert.equal(first.inputIsSynthetic, true);
  assert.equal(first.inputSource, "synthetic classroom test");
  assert.equal(first.issueCategory, "delay");
  assert.equal(first.vtaOpenDataUsed, true, "Verified VTA dataset should supply historical context");
  assert.equal(first.vtaOpenDataDatasetTitle, "VTA Stops And Routes October 2025");
  assert.equal(first.vtaOpenDataPublisher, "Santa Clara Valley Transportation Authority");
  assert.ok(first.vtaOpenDataSnapshot);
  assert.ok(first.sourceRetrievedAt);
  assert.equal(first.responseKind, "ai_generated", "AI integration must be tested, not inferred from configuration");
  assert.ok(first.assistantResponse.length > 30);
  assert.equal(first.sfBay511DataUsed, true, "Authenticated 511 response must actually be used");
  assert.equal(first.routeId, matches.routes[0].id);
  assert.equal(first.stopId, matches.stops[0].id);
  assert.equal(first.liveArrivalSnapshot.httpStatus, 200, "StopMonitoring must be exercised successfully");
  assert.ok(["available", "empty"].includes(first.liveArrivalSnapshot.status));

  const imageResponse = await fetch(`${base}/submissions`, {
    method: "POST", headers,
    body: JSON.stringify({ description: "", language: "vi", imageName: `${marker}.png` }),
  });
  assert.equal(imageResponse.status, 201, "Route/stop must remain optional and image-only reports allowed");
  const second = await imageResponse.json();
  created.push(second.id);
  assert.equal(second.route, "");
  assert.equal(second.stop, "");
  assert.equal(second.inputIsSynthetic, false);
  assert.equal(second.imageName, `${marker}.png`);
  assert.equal(Object.hasOwn(second, "imageData"), false);

  const history = await (await fetch(`${base}/submissions`, { headers })).json();
  assert.ok(history.findIndex((row) => row.id === second.id) < history.findIndex((row) => row.id === first.id));
  const saved = history.find((row) => row.id === first.id);
  assert.deepEqual(saved.liveArrivalSnapshot, first.liveArrivalSnapshot);
  assert.deepEqual(saved.serviceAlertSnapshot, first.serviceAlertSnapshot);
  assert.deepEqual(saved.vtaOpenDataSnapshot, first.vtaOpenDataSnapshot);
  assert.equal(saved.assistantResponse, first.assistantResponse);
  process.stdout.write(JSON.stringify({
    result: "passed", syntheticMarkerDetection: true, optionalFieldsAndImageOnly: true,
    snapshotPersistence: true, newestFirst: true, accessProtected: true,
    aiResponseKind: first.responseKind, sfBay511DataUsed: first.sfBay511DataUsed,
    aiResponseExcerpt: first.assistantResponse,
    verifiedOperatorId: first.operatorId, vtaDataset: first.vtaOpenDataDatasetTitle,
    arrivalStatus: first.liveArrivalSnapshot.status,
    normalizedArrivalCount: first.liveArrivalSnapshot.arrivals.length,
  }, null, 2) + "\n");
} finally {
  server.kill("SIGTERM");
  if (created.length) {
    const requireDb = createRequire(new URL("../../../../lib/db/package.json", import.meta.url));
    const { Client } = requireDb("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await client.connect();
      await client.query("DELETE FROM rider_submissions WHERE id = ANY($1::text[])", [created]);
    } finally {
      await client.end();
    }
  }
}