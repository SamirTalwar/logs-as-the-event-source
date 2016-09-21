#!/usr/bin/env node

const WebSocket = require('ws')
const ws = new WebSocket(process.env.WEBSOCKET)
ws.on('message', data => {
  console.log(data)
})
ws.on('error', error => {
  console.log(JSON.stringify({type: 'Error', message: error.message, stack: error.stack.split(/\n/)}))
  process.exitCode = 1
})
