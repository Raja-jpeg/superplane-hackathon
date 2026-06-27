require('dotenv').config()
const express = require('express')
const axios = require('axios')
const app = express()
 
app.use(express.json())
 
// CORS — lets frontend fetch from backend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})
 
// In-memory store of last 10 analyses
const analyses = []
 
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'blast-radius' })
})
 
// Frontend polls this for live data
app.get('/status', (req, res) => {
  res.json({ analyses: analyses.slice(0, 10) })
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
  const { prNumber, repo, reason, contracts_broken } = req.body
  const entry = {
    prNumber,
    repo: repo || process.env.GITHUB_REPO,
    risk: 'LOW',
    reason: reason || 'No broken contracts detected. Safe to ship.',
    contracts_broken: contracts_broken || [],
    status: 'deployed',
    timestamp: new Date().toISOString()
  }
  analyses.unshift(entry)
 
  const frontendUrl = process.env.RENDER_FRONTEND_URL || ''
  await postComment(entry.repo, prNumber,
    `✅ **Blast Radius: LOW RISK**\n\n${entry.reason}\n\nAuto-deploying now.${frontendUrl ? `\n\n[View full analysis](${frontendUrl})` : ''}`
  )
  res.json({ approved: true, pr: prNumber })
})
 
// SuperPlane calls this for HIGH risk PRs
app.post('/block', async (req, res) => {
  const { prNumber, repo, reason, contracts_broken } = req.body
  const entry = {
    prNumber,
    repo: repo || process.env.GITHUB_REPO,
    risk: 'HIGH',
    reason: reason || 'Broken contracts detected. Human approval required.',
    contracts_broken: contracts_broken || [],
    status: 'blocked',
    timestamp: new Date().toISOString()
  }
  analyses.unshift(entry)
 
  const frontendUrl = process.env.RENDER_FRONTEND_URL || ''
  await postComment(entry.repo, prNumber,
    `🚨 **Blast Radius: HIGH RISK**\n\n${entry.reason}\n\nMerge blocked pending human review.${frontendUrl ? `\n\n[View full analysis](${frontendUrl})` : ''}`
  )
  res.json({ blocked: true, pr: prNumber })
})
 
// Posts a comment on a GitHub PR
async function postComment(repo, prNumber, body) {
  try {
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
  } catch (e) {
    console.error('Failed to post comment:', e.message)
  }
}
 
// Keepalive — prevents Render free tier from sleeping
if (process.env.RENDER_URL) {
  setInterval(async () => {
    try { await axios.get(`${process.env.RENDER_URL}/health`) }
    catch (e) { console.log('keepalive failed:', e.message) }
  }, 840000)
}
 
app.listen(process.env.PORT || 3000, () => console.log('Blast Radius running'))