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

The focused card successfully called the production Discovery Assistant API from the local Gbolix origin and rendered a streamed response inside the card. The response remained within the conversation UI; no landing page or external navigation was introduced.

A 390×844 mobile render was generated successfully. The hero typography remains readable, the navigation collapses to the mobile menu, and the floating `Talk to Gbolix` button remains visible and reachable at the bottom-right. The focused card uses mobile-first single-column classes and a compact progress strip in place of the desktop side rail.

## Final production deployment

The refined Vercel deployment for commit `e9b1618` reached `READY` and is serving the canonical `https://gbolix.site/` domain. The initial live page shows the Problem Discovery hero CTA and the floating `Talk to Gbolix` button, with no assistant landing page or automatic popup visible.

On the canonical production homepage, selecting the hero `Problem Discovery` CTA opens a modal containing only the self-contained Gbolix Discovery conversation card. The assistant landing page is not embedded. A built-in suggestion (`Something in my operations is too manual`) produced a live Gemini reply in the card: `Manual processes can take up a lot of time and energy. Which specific part of your daily operations requires the most manual effort right now, and what ideal outcome are you hoping to achieve?`
