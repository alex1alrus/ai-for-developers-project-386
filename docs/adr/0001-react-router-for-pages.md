# Pages are routed with react-router

The app has several pages (home, event type catalog, slot selection, owner views) that guests should be able to open and share by URL. We use `react-router` in declarative mode with `BrowserRouter` instead of switching views with React state (no URLs, no back button) or a hand-written router (reinventing matching and links for no gain).

## Consequences

Every page has its own path, so the production server must return `index.html` for unknown non-API paths (SPA fallback).
