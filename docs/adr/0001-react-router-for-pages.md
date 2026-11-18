# Pages are routed with react-router

The app has several pages (home, event type catalog, slot selection, owner views) that guests should be able to open and share by URL. We use `react-router` in declarative mode with `BrowserRouter`.

## Considered Options

- **Switching views with React state**: no URLs, no shareable links, no browser back button.
- **Hand-written router**: reinvents path matching and links for no gain.
- **TanStack Router**: type-safe routes, but more setup (route tree, code generation) than a handful of simple pages needs.

## Consequences

Every page has its own path, so the production server must return `index.html` for unknown non-API paths (SPA fallback).
