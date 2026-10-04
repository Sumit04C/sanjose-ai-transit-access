import assert from "node:assert/strict";
import test from "node:test";
import { parseTransitMessage, decodeDepartures, resolveRiderRequest } from "../../dist/test/natural-transit.mjs";

const now = Date.parse("2026-10-03T09:50:00-07:00");
const checked = new Date(now).toISOString();
const route = { id: "verified-green", name: "Green Line", raw: { TransportMode: "metro", PublicCode: "Green Line" } };
const stop = { id: "verified-platform", name: "Winchester Station", lineIds: [route.id] };
const reference = { operatorId: "verified-operator", routes: [route], stops: [stop] };
const visit = (time, source = "scheduled", destination = "Old Ironsides", overrides = {}) => ({
  MonitoringRef: stop.id, RecordedAtTime: checked,
  [source === "live" ? "MonitoredVehicleJourney" : "TargetedVehicleJourney"]: {
    LineRef: route.id, OperatorRef: reference.operatorId, Monitored: true,
    DirectionRef: "outbound", DestinationName: destination,
    [source === "live" ? "MonitoredCall" : "TargetedCall"]: {
      StopPointRef: stop.id,
      [source === "live" ? "ExpectedDepartureTime" : "AimedDepartureTime"]: time,
    }, ...overrides,
  },
});
const deps = (live = []) => ({
  now: () => now, reference: async () => reference,
  payload: async ({ source }) => ({ httpStatus: 200, retrievedAt: checked, value: source === "live" ? live : [
    visit("2026-10-03T09:55:00-07:00"), visit("2026-10-03T10:02:00-07:00"),
    visit("2026-10-03T10:25:00-07:00"), visit("2026-10-03T10:03:00-07:00", "scheduled", "Winchester Station"),
  ] }),
});
const question = "I just left my house at 9:50 AM. I am going to miss the light rail departure at 9:55 AM from Winchester Station. When is the next departure?";

test("all four brief examples extract their intent, mode, station, and relevant time", () => {
  const a = parseTransitMessage(question, now);
  assert.equal(a.station_name, "Winchester Station");
  assert.equal(a.referenced_time, "2026-10-03T16:55:00.000Z");
  for (const message of ["I just missed the train at Winchester. When is the next one?", "When is the next light rail from Winchester?"]) {
    const p = parseTransitMessage(message, now);
    assert.equal(p.intent, "next_departure");
    assert.equal(p.station_name, "Winchester");
    assert.equal(p.mode, "light_rail");
  }
  const bus = parseTransitMessage("My bus at Diridon was supposed to come 10 minutes ago. Is another one coming?", now);
  assert.equal(bus.mode, "bus");
  assert.equal(bus.station_name, "Diridon");
  assert.equal(bus.referenced_time, "2026-10-03T16:40:00.000Z");
});

test("unique terminal service resolves automatically; scheduled fallback is explicit and strictly after referenced departure", async () => {
  const result = await resolveRiderRequest({ message: question, language: "en", debug: true }, deps());
  assert.equal(result.status, "resolved");
  assert.equal(result.departures[0].dateTime.toISOString(), "2026-10-03T17:02:00.000Z");
  assert.equal(result.departures[0].source, "scheduled");
  assert.match(result.message, /schedule, not live vehicle data/);
  assert.equal(result.debug.clarificationRequired, false);
  assert.deepEqual(result.debug.resolvedStopIds, [stop.id]);
});

test("fresh verified live departures take precedence; earlier and next-day departures are excluded", async () => {
  const result = await resolveRiderRequest({ message: question, language: "en", debug: true }, deps([
    visit("2026-10-03T09:54:00-07:00", "live"),
    visit("2026-10-03T10:07:00-07:00", "live"),
    visit("2026-10-04T10:00:00-07:00", "live"),
  ]));
  assert.equal(result.departures[0].source, "live");
  assert.equal(result.departures[0].dateTime.toISOString(), "2026-10-03T17:07:00.000Z");
  assert.equal(result.debug.retrievalTimestamp, checked);
});

test("genuine direction ambiguity asks one human-readable question and accepts a verified choice", async () => {
  const multiple = deps();
  multiple.payload = async ({ source }) => ({ httpStatus: 200, retrievedAt: checked, value: source === "live" ? [] : [
    visit("2026-10-03T10:02:00-07:00", "scheduled", "Old Ironsides"),
    visit("2026-10-03T10:12:00-07:00", "scheduled", "Mountain View", { DirectionRef: "other" }),
  ] });
  const input = { message: "When is the next light rail from Winchester?", language: "en", debug: true };
  const a = await resolveRiderRequest(input, multiple);
  assert.equal(a.status, "clarification");
  assert.equal(a.choices.length, 2);
  assert.equal(a.departures.length, 0);
  assert.doesNotMatch(a.message, /stop ID|route ID|bay/i);
  const selected = await resolveRiderRequest({ ...input, choice: a.choices[0].id }, multiple);
  assert.equal(selected.status, "resolved");
  assert.equal(selected.departures[0].direction, "Old Ironsides");
  const forged = await resolveRiderRequest({ ...input, choice: "unverified|route" }, multiple);
  assert.equal(forged.status, "clarification");
});

test("stale, wrong-stop, wrong-operator, cancelled, unmonitored, and arrival-only rows never become live departures", () => {
  const invalid = [
    { ...visit("2026-10-03T10:07:00-07:00", "live"), MonitoringRef: "wrong-stop" },
    { ...visit("2026-10-03T10:07:00-07:00", "live"), RecordedAtTime: "2026-10-03T08:00:00-07:00" },
    visit("2026-10-03T10:07:00-07:00", "live", "Old Ironsides", { OperatorRef: "wrong-operator" }),
    visit("2026-10-03T10:07:00-07:00", "live", "Old Ironsides", { Monitored: false }),
    visit("2026-10-03T10:07:00-07:00", "live", "Old Ironsides", { MonitoredCall: { StopPointRef: stop.id, ExpectedArrivalTime: "2026-10-03T10:07:00-07:00" } }),
    visit("2026-10-03T10:07:00-07:00", "live", "Old Ironsides", { JourneyStatus: "cancelled" }),
  ];
  assert.deepEqual(decodeDepartures(invalid, stop.id, [route], "live", checked, reference.operatorId, now), []);
});

test("the rider-facing headsign replaces internal non-public journey endpoints", () => {
  const row = visit("2026-10-03T10:02:00-07:00", "scheduled", "Pocket Track (NOT A PUBLIC STOP)", {
    VehicleJourneyName: "OLD IRONSIDES",
  });
  const decoded = decodeDepartures([row], stop.id, [route], "scheduled", checked, reference.operatorId, now);
  assert.equal(decoded[0].direction, "OLD IRONSIDES");
  const internalOnly = visit("2026-10-03T10:02:00-07:00", "scheduled", "Pocket Track (NOT A PUBLIC STOP)");
  assert.deepEqual(decodeDepartures([internalOnly], stop.id, [route], "scheduled", checked, reference.operatorId, now), []);
});

test("current time, requested count, unavailable data, and hidden debugging are handled without fabricated times", async () => {
  const result = await resolveRiderRequest({ message: "Next 2 trains from Winchester?", language: "en" }, deps());
  assert.equal(result.departures.length, 2);
  assert.equal(result.debug, null);
  const unavailable = deps();
  unavailable.payload = async () => { throw new Error("provider unavailable"); };
  const failed = await resolveRiderRequest({ message: question, language: "en" }, unavailable);
  assert.equal(failed.status, "unavailable");
  assert.deepEqual(failed.departures, []);
});