# HIGH-Risk Contract Break Demo

This branch intentionally changes the `/health` API response shape.

Removed fields:

- `status`
- `service`
- `frontend_url`
- `checked_at`

Added/renamed fields:

- `state`
- `app`
- `checkedAt`

Why this should be HIGH risk:

- SuperPlane health checks expect `/health` to return `status: "ok"`.
- PR comments and dashboard links use `frontend_url`.
- Monitoring, deploy verification, and dashboards can break when contract fields are renamed.

Human mitigation:

- Do not merge as-is.
- Preserve old fields during migration.
- Add new fields only as additive changes.
- Version the response if breaking changes are required.
