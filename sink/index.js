#!/usr/bin/env node

const WebSocket = require('ws')
const ws = new WebSocket(process.env.WEBSOCKET)
ws.on('message', data => {
  process.stdout.write(data)
  process.stdout.write('\n')
})
ws.on('error', error => {
  process.stderr.write(error)
  process.stderr.write('\n')
})
