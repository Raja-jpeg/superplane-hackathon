# Blast Radius HIGH-Risk Demo

This branch adds `/api/render-preview` as a controlled SSRF-style demo.

Why the factory should flag this as HIGH:

- The endpoint accepts a user-controlled URL.
- The backend makes a server-side request to that URL.
- There is no hostname allowlist.
- There is no private-network or metadata-address block.
- The endpoint changes the backend API surface area.

Human mitigation decision:

- Do not approve a raw arbitrary URL fetch.
- Require an allowlist of approved domains.
- Reject private IP ranges, localhost, and link-local targets.
- Keep strict request timeouts and response-size limits.
- Disable redirects so the backend cannot be bounced to unsafe targets.
- Add tests proving unsafe destinations are blocked.

The endpoint is disabled unless `DEMO_INSECURE_ENDPOINTS=true`, so it is suitable
for demonstrating the review gate without enabling it in production.

Mitigation added in this branch:

- `PREVIEW_ALLOWED_HOSTS` controls the allowed hosts.
- DNS results are checked before fetching.
- Private IPv4, localhost, link-local, and private IPv6 targets are rejected.
- Redirects are disabled.
- Response size is capped.
