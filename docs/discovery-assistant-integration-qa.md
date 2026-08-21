# Discovery Assistant Homepage Integration QA

## Local verification

The Gbolix homepage was opened at `http://localhost:4173/` with the assistant closed by default. The hero now presents the copy “Have a problem with your business but don't know exactly what you need?” followed by “Tell Gbolix what's happening. We'll help you figure it out.” and a `Problem Discovery — Tell us what's happening` CTA.

The assistant did not open automatically on page load. Clicking the hero CTA opened the assistant in an accessible modal overlay with the live Discovery Assistant embedded, a clear title, a close control, and an optional “Open in a new tab” link. The persistent floating `Talk to Gbolix` button is visible behind the closed state and is hidden while the modal is open.

After closing the modal, the floating `Talk to Gbolix` button remained visible in the lower-right corner. Clicking it reopened the same assistant modal successfully. This confirms the intended hero-first, persistent-access flow without an automatic popup.
