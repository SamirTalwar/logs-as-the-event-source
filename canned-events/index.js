#!/usr/bin/env node

const fs = require('fs')
const yaml = require('js-yaml')

const speed = process.env.SPEED || 1

const main = () => {
  fs.readFile(process.argv[2], (error, contents) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
      return
    }

    console.log(JSON.stringify({
      type: 'ServiceStarted',
      service: process.env.SERVICE,
      hostname: process.env.HOSTNAME
    }))

    const events = yaml.safeLoad(contents).events
    emit(events, 0)
  })
}

const emit = (events, time) => {
  const event = events[0]
  if (!event) {
    return
  }

  setTimeout(() => {
    let currentTime = event.timestamp
    delete event.timestamp
    console.log(JSON.stringify(event))

    const rest = events.slice(1)
    emit(rest, currentTime)
  }, (event.timestamp - time) * 1000 / speed)
}

setTimeout(main, 1000)

setTimeout(() => {}, 100 * 60 * 60 * 24)
