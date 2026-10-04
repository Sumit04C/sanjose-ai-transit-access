---
name: Transit intent routing
description: Product distinction between transit information requests and rider issue reports.
---
Transit information requests must not be stored or presented as rider complaints. A missed-service question asking for the next departure is a lookup, not automatically an issue report.

**Why:** A separate “check departures” button did not solve the product problem: users naturally submitted questions through the main form and those questions were still saved as reports.

**How to apply:** Keep intent routing on the main input workflow, with a server-side persistence guard as well. Preserve genuine issue reporting; a factual complaint about a broken ramp or a bus that never showed up remains a report.

Not knowing a stop ID is not genuine station ambiguity.

**Why:** Riders use names such as Winchester; the user requires provider-dataset search before requesting any technical identifier.

**How to apply:** Resolve station names and check relevant platforms first. Clarify only when the direction would materially change the answer; never substitute an exact-ID requirement for name resolution.