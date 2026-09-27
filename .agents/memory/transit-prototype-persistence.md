---
name: Transit prototype persistence
description: Product constraints for stored rider submissions and responses
---

Save the response already used by the prototype, in the selected language; do not infer that a request to store "AI output" authorizes generating a new answer. Images remain browser-local, so only their filename metadata belongs in saved submissions under the current prototype requirements.

**Why:** The user explicitly chose "Save the current prototype response" when asked whether to use live AI, and the earlier prototype brief required images to stay in the browser.

**How to apply:** Preserve these constraints when changing submission storage or history. If a later request needs actual AI output or persistent image contents, confirm that the prototype behavior is being changed before implementing either.