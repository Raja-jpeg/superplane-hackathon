# Blast Radius

Blast Radius is a real-time software factory control plane for pull requests.

Traditional CI answers one question: "Does this code pass tests?" Blast Radius asks the next question: "What could this change break when it ships?"

It uses SuperPlane to inspect every pull request, fetch the diff, score deployment risk with an LLM, route low-risk changes through an automated lane, and hold high-risk changes at a human review gate with context. Render hosts the backend and frontend dashboard used during the demo.

## What It Does

- Listens for GitHub pull request events.
- Fetches the PR diff.
- Uses an OpenAI-powered risk analyzer to classify the change as `LOW` or `HIGH`.
- Detects API contract changes, removed fields, renamed endpoints, and cross-service dependency risk.
- Auto-approves low-risk changes.
- Pauses high-risk changes for human review.
- Posts GitHub PR comments and commit statuses.
- Records the latest analyses for a live dashboard.
- Deploys through Render and verifies service health.

## Live Services

Frontend dashboard:

```text
https://superplane-hackathon-blast-radius-app.onrender.com
```

Backend API:

```text
https://superplane-hackathon.onrender.com
```

Backend health:

```text
https://superplane-hackathon.onrender.com/health
```

Backend status feed:

```text
https://superplane-hackathon.onrender.com/status
```

## Architecture

```mermaid
flowchart LR
  A[GitHub Pull Request] --> B[SuperPlane PR Trigger]
  B --> C[Fetch Diff]
  C --> D[OpenAI Risk Analyzer]
  D --> E{HIGH risk?}
  E -- No --> F[Notify Backend /approve]
  F --> G[Auto-Approve Lane]
  G --> H[Render Deploy Hook]
  H --> I[Health Check]
  I --> J[GitHub Status + Comment]
  E -- Yes --> K[Notify Backend /block]
  K --> L[Human Review Gate]
  L -- Approved --> H
  L -- Rejected --> M[GitHub Rejected Status]
  F --> N[Dashboard /status]
  K --> N
```

## SuperPlane Flow

The SuperPlane canvas is named:

```text
blast-radius-pipeline
```

Core flow:

```text
github.onPullRequest
→ Fetch Diff
→ openai.textPrompt
→ if HIGH?
   ├─ true  → Comment HIGH → POST /block → human approval gate
   └─ false → Comment LOW  → POST /approve → deploy
→ Deploy to Render
→ Health Check
→ Final GitHub comment/status
```

Recommended HIGH path:

```text
if HIGH? true
→ Comment: HIGH Factory
→ Notify Factory - Block
→ Status: Awaiting Review
→ Gate: Human Review
```

Recommended LOW path:

```text
if HIGH? false
→ Comment: LOW Factory
→ Notify Factory - Approve LOW
→ Status: Auto-Approved
→ Deploy to Render
→ Health Check
```

## Risk Analyzer Prompt

The LLM receives the fetched diff and is asked to return a risk verdict.

```text
You are a code risk analyzer. Given this git diff, identify:
1. Any API contract changes: renamed endpoints, removed fields, changed types
2. Cross-service dependencies that could break

Return JSON only:
{
  "risk": "LOW" or "HIGH",
  "reason": "one sentence explanation",
  "contracts_broken": []
}

Diff:
{{root().data.body}}
```

For the demo canvas, the branch condition can be:

```text
hasPrefix(upper($['openai.textPrompt'].data.text), "HIGH")
```

## Backend API

The backend is a small Express service.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health and frontend dashboard URL |
| `GET` | `/status` | Latest risk analyses for the dashboard |
| `POST` | `/webhook` | Basic event intake/debug endpoint |
| `POST` | `/approve` | Records LOW-risk auto-approved PRs |
| `POST` | `/block` | Records HIGH-risk blocked PRs |

Example LOW payload:

```json
{
  "prNumber": 4,
  "repo": "Raja-jpeg/superplane-hackathon",
  "reason": "Frontend copy-only change with no API contract impact.",
  "contracts_broken": [],
  "impacted_components": [],
  "architecture_impact": "Change is isolated; no downstream service contracts are impacted.",
  "health_status": "healthy"
}
```

Example HIGH payload:

```json
{
  "prNumber": 5,
  "repo": "Raja-jpeg/superplane-hackathon",
  "reason": "The PR removes fields from /health that deployment checks and dashboards depend on.",
  "contracts_broken": ["Removed /health.status", "Removed /health.frontend_url"],
  "impacted_components": ["backend API", "frontend dashboard", "deployment health check"],
  "architecture_impact": "The deployment verification contract changes and can break monitoring, dashboards, and release automation.",
  "health_status": "blocked before deploy"
}
```

## Tech Stack

- GitHub pull requests for source events.
- SuperPlane for orchestration, branching, approval gates, comments, status checks, and durable workflow execution.
- OpenAI text generation for diff risk analysis.
- Node.js and Express for the backend API.
- Render Web Service for backend hosting.
- Render Static Site for frontend hosting.
- Tailwind CSS CDN for the dashboard UI.

## Environment Variables

Backend Render service:

```text
GITHUB_TOKEN=github_pat_or_app_token_with_issue_comment_access
GITHUB_REPO=Raja-jpeg/superplane-hackathon
RENDER_FRONTEND_URL=https://superplane-hackathon-blast-radius-app.onrender.com
RENDER_URL=https://superplane-hackathon.onrender.com
```

Optional demo/security variables:

```text
LEGACY_BLAST_COMMENTS=false
DEMO_INSECURE_ENDPOINTS=false
PREVIEW_ALLOWED_HOSTS=example.com
```

Frontend:

The frontend polls the backend status API. Its default backend is:

```text
https://superplane-hackathon.onrender.com
```

You can override it at runtime:

```text
https://superplane-hackathon-blast-radius-app.onrender.com?backend=https://your-backend.onrender.com
```

## Demo PRs

Use two pull requests to show both lanes.

LOW-risk example:

```text
demo/low-risk-dashboard-copy
```

This changes frontend copy only. Expected result:

```text
LOW → /approve → auto-approved → deploy → health check
```

HIGH-risk example:

```text
demo/high-risk-health-contract
```

This intentionally changes the `/health` response contract. Expected result:

```text
HIGH → /block → dashboard blocked lane → human review gate
```

Do not merge the HIGH-risk demo branch as-is. It intentionally breaks the health contract.

## Why This Matters

In real systems, the most dangerous deploys are not always syntax failures. They are small-looking changes that alter contracts:

- A field is renamed.
- An endpoint changes shape.
- A service starts making outbound network calls.
- A dashboard or deployment health check loses the field it expects.
- A low-level API change silently affects downstream consumers.

Blast Radius turns those changes into visible release decisions before they reach production.

## Real-Time Value

Blast Radius is useful during active development because it runs at PR time:

- Developers get immediate feedback on architectural risk.
- Reviewers see why a change is gated.
- Low-risk changes do not wait behind manual process.
- High-risk changes are contained before deployment.
- GitHub comments and statuses keep the decision close to the code.
- The dashboard gives non-technical stakeholders a live picture of release risk.

## Scaling The Pattern

At larger scale, this pattern can expand into a true software factory:

- Maintain a registry of service contracts and known consumers.
- Compare diffs against OpenAPI, GraphQL, protobuf, or database schemas.
- Route changes by ownership, service tier, or deployment environment.
- Require different approval policies for production, staging, or customer-facing services.
- Add Slack/PagerDuty notifications for high-risk changes.
- Store audit history in a durable database instead of memory.
- Feed deployment and incident outcomes back into the risk model.
- Add policy-as-code checks for security-sensitive changes.

The important idea is not just "AI reviews code." The important idea is that PR risk becomes an operational signal that can route work through the right factory lane.

## Screenshots To Capture

For a strong demo submission, capture these:

1. SuperPlane canvas full view
   - Show `github.onPullRequest → Fetch Diff → OpenAI → if HIGH?`.
   - Make the LOW and HIGH branches visible.

2. LOW-risk PR
   - Show GitHub comment saying LOW risk or factory lane cleared.
   - Show successful `blast-radius/review` status.

3. HIGH-risk PR
   - Show GitHub comment explaining the contract break.
   - Show pending `blast-radius/review` status.
   - Show the human approval gate in SuperPlane.

4. Dashboard
   - Show PR count, HIGH/LOW counts, latest analysis, architecture impact, and service graph.

5. Backend health
   - Open `/health` and show `status: "ok"` plus `frontend_url`.

6. Backend status feed
   - Open `/status` and show the `analyses` array populated after SuperPlane calls `/approve` or `/block`.

## Local Development

Backend:

```bash
cd blast-radius-app/backend
npm install
node app.js
```

Frontend:

Open:

```text
blast-radius-app/frontend/index.html
```

Or deploy it as a Render Static Site.

## Project Structure

```text
blast-radius-app/
  backend/
    app.js
    package.json
  frontend/
    index.html
README.md
```

## One-Line Pitch

Blast Radius is a SuperPlane-powered software factory that predicts deployment risk, auto-ships safe changes, and gates risky PRs before they can break production.
