---
name: Synthetic report authorization
description: Product rule for trusted synthetic classification and staff visibility.
---

Only authenticated, server-verified classroom/test mode may assign synthetic input status or a synthetic data-source label. User text, including `[242]`, and browser-supplied flags are not classification authority.

**Why:** The user explicitly requires ordinary rider text and untrusted client fields to be unable to misclassify real reports.

**How to apply:** Preserve this boundary in submission handling, authentication, AI response instructions, and source labels. Distinguish the app being a classroom prototype from a particular report being synthetic.

Real safety and accessibility reports must remain visible to staff regardless of synthetic markers, including historical inconsistent metadata.

**Why:** Synthetic-origin filtering must not suppress reports of genuine safety or accessibility problems.

**How to apply:** Keep staff retrieval inclusive and ensure synthetic-marker checks in source filters cannot hide safety/accessibility reports. Do not blindly relabel historical records without confirming their origin.