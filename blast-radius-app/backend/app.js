require('dotenv').config()
const express = require('express')
const axios = require('axios')
const app = express()

app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'blast-radius' })
})

// GitHub sends PR events here
app.post('/webhook', async (req, res) => {
  const { action, pull_request, repository } = req.body
  if (action !== 'opened') return res.json({ skipped: true })

  const prNumber = pull_request.number
  const repo = repository.full_name

  console.log(`PR #${prNumber} opened on ${repo}`)

  await postComment(repo, prNumber,
    `⚡ **Blast Radius analysis running...**\n\nAnalyzing diff for broken contracts and risky surfaces.`
  )

  res.json({ received: true, pr: prNumber })
})

// SuperPlane calls this for LOW risk PRs
app.post('/approve', async (req, res) => {
  const { prNumber, repo } = req.body
  await postComment(repo || process.env.GITHUB_REPO, prNumber,
    `✅ **Blast Radius: LOW RISK**\n\nNo broken contracts detected. Safe to ship.`
  )
  res.json({ approved: true, pr: prNumber })
})

// SuperPlane calls this for HIGH risk PRs
app.post('/block', async (req, res) => {
  const { prNumber, repo, reason } = req.body
  await postComment(repo || process.env.GITHUB_REPO, prNumber,
    `🚨 **Blast Radius: HIGH RISK**\n\n${reason || 'Broken contracts detected. Human approval required.'}`
  )
  res.json({ blocked: true, pr: prNumber })
})

// Posts a comment on a GitHub PR
async function postComment(repo, prNumber, body) {
  await axios.post(
    `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`,
    { body },
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json'
      }
    }
  )
}

// Keepalive — prevents Render free tier from sleeping
if (process.env.RENDER_URL) {
  setInterval(async () => {
    try { await axios.get(`${process.env.RENDER_URL}/health`) }
    catch (e) { console.log('keepalive failed:', e.message) }
  }, 840000)
}

app.listen(process.env.PORT || 3000, () => console.log('Blast Radius running'))