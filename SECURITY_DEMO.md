# Blast Radius HIGH-Risk Demo

This branch adds `/api/render-preview` as a controlled SSRF-style demo.

Why the factory should flag this as HIGH:

- The endpoint accepts a user-controlled URL.
- The backend makes a server-side request to that URL.
- There is no hostname allowlist.
- There is no private-network or metadata-address block.
- The endpoint changes the backend API surface area.

Human mitigation decision:

- Do not approve this implementation as-is.
- Require an allowlist of approved domains.
- Reject private IP ranges, localhost, and link-local targets.
- Keep strict request timeouts and response-size limits.
- Add tests proving unsafe destinations are blocked.

The endpoint is disabled unless `DEMO_INSECURE_ENDPOINTS=true`, so it is suitable
for demonstrating the review gate without enabling it in production.
