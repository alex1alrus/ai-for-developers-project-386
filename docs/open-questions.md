# Open questions for the next map

Raised while designing the home page, deliberately not decided yet.

- Owner entry point: where the owner reaches their pages (header link, separate path) without authentication.
- Production serving: one Fastify process serving the API and the built frontend, or separate services; SPA fallback follows from ADR-0001.
- Browser end-to-end tests (Playwright) for the booking scenario.
- Guest pages after the event type catalog (`/book`): slot selection and booking form, and their paths.
