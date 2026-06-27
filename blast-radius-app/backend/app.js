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

app.listen(process.env.PORT || 3000, () => {
  console.log('Running on 3000')
})

