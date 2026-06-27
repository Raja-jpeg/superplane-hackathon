require('dotenv').config()
const express = require('express')
const app = express()

app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'blast-radius' })
})

app.post('/webhook', (req, res) => {
  console.log('PR event received:', req.body?.action)
  res.json({ received: true })
})

// Add this at the bottom of app.js, before app.listen
const RENDER_URL = process.env.RENDER_URL || ''
if (RENDER_URL) {
  setInterval(async () => {
    try {
      await axios.get(`${RENDER_URL}/health`)
      console.log('keepalive ping sent')
    } catch (e) {
      console.log('keepalive failed:', e.message)
    }
  }, 840000) // ping every 14 minutes
}

app.listen(process.env.PORT || 3000, () => {
  console.log('Running on 3000')
})

