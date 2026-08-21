# Discovery Assistant Homepage Integration QA

## Local verification

The Gbolix homepage was opened at `http://localhost:4173/` with the assistant closed by default. The hero now presents the copy “Have a problem with your business but don't know exactly what you need?” followed by “Tell Gbolix what's happening. We'll help you figure it out.” and a `Problem Discovery — Tell us what's happening` CTA.

The assistant did not open automatically on page load. Clicking the hero CTA opened the assistant in an accessible modal overlay with the live Discovery Assistant embedded, a clear title, a close control, and an optional “Open in a new tab” link. The persistent floating `Talk to Gbolix` button is visible behind the closed state and is hidden while the modal is open.

After closing the modal, the floating `Talk to Gbolix` button remained visible in the lower-right corner. Clicking it reopened the same assistant modal successfully. This confirms the intended hero-first, persistent-access flow without an automatic popup.

## Production verification

The main Gbolix Vercel deployment for commit `5cfb10c` reached `READY` and now serves `https://gbolix.site/`. The production homepage visibly includes the Problem Discovery hero CTA and the floating `Talk to Gbolix` control. The initial production page state does not show the assistant modal automatically.

The live production hero CTA opened the assistant modal successfully, showing the embedded Discovery Assistant and the new Gbolix framing. Closing the modal returned to the homepage and left `Talk to Gbolix` visible for persistent reopening. Production behavior matches the requested hero-first, no-automatic-popup interaction model.

## Focused-card redesign verification

The revised local homepage no longer embeds the Discovery Assistant landing page. The hero CTA opens only a focused conversation card with a Gbolix Discovery header, welcome message, suggestion chips, composer, discovery-path rail, consent control, working-picture action, and restart control. The card has a restrained dark operations-console treatment and collapses naturally for smaller screens.
