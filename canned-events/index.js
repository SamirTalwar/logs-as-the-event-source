#!/usr/bin/env node

const fs = require('fs')
const yaml = require('js-yaml')
const Logger = require('microservice-logging')

const speed = process.env.SPEED || 1

const main = () => {
  fs.readFile(process.argv[2], (error, contents) => {
    if (error) {
      console.error(error)
      process.exitCode = 1
      return
    }
    const events = yaml.safeLoad(contents).events
    const eventTypes = {serviceStarted: 'ServiceStarted'}
    new Set(events.map(event => event.type)).forEach(type => {
      eventTypes[type] = type
    })

    const log = new Logger({now: Date.now, output: console, events: eventTypes})
      .with({service: process.env.SERVICE})

    log.serviceStarted.info({
      hostname: process.env.HOSTNAME
    })

    emit(log, events, 0)
  })
}

const emit = (log, events, time) => {
  const event = events[0]
  if (!event) {
    return
  }

  setTimeout(() => {
    const eventType = event.type
    const currentTime = event.timestamp
    delete event.type
    delete event.timestamp
    log[eventType].info(event)

    const rest = events.slice(1)
    emit(log, rest, currentTime)
  }, (event.timestamp - time) * 1000 / speed)
}

setTimeout(main, 1000)

setTimeout(() => {}, 100 * 60 * 60 * 24)
