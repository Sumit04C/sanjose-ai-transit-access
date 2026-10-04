---
name: 511 rider-facing metadata
description: Provider quirks affecting station service resolution and safe departure answers.
---
Do not infer transit mode from the stop catalog's StopType. Resolve service mode using the verified line referenced by a timetable or monitored journey.

**Why:** During natural-language checks, 511 tagged Winchester and Diridon light-rail stops as onstreetBus, even though their journeys referenced verified metro lines.

**How to apply:** Keep all matching station platforms until verified journey/line data can distinguish bus from rail.

Preserve primary-station versus numbered-bay name quality when ranking station aliases.

**Why:** 511's Winchester rail entries are named “Winchester Station,” while nearby bus entries are “Winchester Station (Bay 1/2).” Stripping bay suffixes makes all names equal and can incorrectly turn a clear station query into a bus-versus-rail clarification.

**How to apply:** Query the relevant candidates first. When stronger primary-station matches share one verified line mode, infer that mode; do not infer it from the misleading StopType or hardcode station IDs.

Prefer the stop-specific DestinationDisplay or public VehicleJourneyName over DestinationName when displaying a direction.

**Why:** Verified Green Line journeys named an internal pocket track marked “NOT A PUBLIC STOP” as their endpoint, while the public headsign correctly said “OLD IRONSIDES.”

**How to apply:** Use provider-supplied public headsigns; do not derive destinations from route descriptions or direct riders to internal facilities.

Treat epoch RecordedAtTime values as missing/stale, not fresh predictions.

**Why:** Actual 511 responses included Monitored=true and expected departures but a 1970 recording timestamp. Labeling these as confidently live would hide uncertainty.

**How to apply:** Retain conservative freshness checks and explicitly label scheduled fallback. An HTTP 200 response alone is not evidence of usable live data.