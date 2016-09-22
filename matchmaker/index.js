#!/usr/bin/env node

const Logger = require('microservice-logging')
const WebSocket = require('ws')

const Teams = ['alpha', 'bravo']
const PlayersPerTeam = 3
const PlayersPerMatch = Teams.length * PlayersPerTeam

const speed = process.env.SPEED || 1
const log = new Logger({now: Date.now, output: console, events: {
  serviceStarted: 'ServiceStarted',
  matchStarted: 'MatchStarted',
  matchRoundStarted: 'MatchRoundStarted',
  matchRoundEnded: 'MatchRoundEnded',
  matchEnded: 'MatchEnded',
  unhandled: 'Error'
}}).with({service: 'matchmaker'})

let players = []
let matches = new Map()
let lastMatchId = 0

const main = () => {
  const ws = new WebSocket(process.env.WEBSOCKET)

  log.serviceStarted.info({
    hostname: process.env.HOSTNAME
  })

  ws.on('error', report)

  ws.on('message', attempt(data => {
    const event = JSON.parse(data)[1].event
    if (!event || !event.event_type) {
      report(new Error('Event with no type.'))
      return
    }
    const handle = handlers[event.event_type] || noHandler
    handle(event)
  }))
}

const handlers = {
  'PlayerJoined': event => {
    players.push(event.player)
    setTimeout(startMatchIfPossible, 3000 / speed)
  },
  'MatchStarted': event => {
    const match = matches.get(event.match.id)
    match.round = 1
    log.matchRoundStarted.info({
      match: match
    })
  },
  'ScoringRoundWon': event => {
    const match = matches.get(event.match.id)
    log.matchRoundEnded.info({
      match: match
    })
  },
  'ScoringMatchWon': event => {
    const match = matches.get(event.match.id)
    match.winner = event.winner
  },
  'MatchRoundEnded': event => {
    setTimeout(() => {
      const match = matches.get(event.match.id)
      if (match.winner) {
        log.matchEnded.info({
          match: match
        })
      } else {
        match.round += 1
        log.matchRoundStarted.info({
          match: match
        })
      }
    }, 3000 / speed)
  }
}

const noHandler = () => {}

const startMatchIfPossible = () => {
  if (players.length < PlayersPerMatch) {
    return
  }

  const match = {
    id: nextMatchId(),
    teams: {
    }
  }
  Teams.forEach(team => {
    match.teams[team] = {
      players: []
    }
  })
  for (let i = 0; i < PlayersPerTeam; i += 1) {
    Teams.forEach(team => {
      match.teams[team].players.push(players.shift())
    })
  }
  matches.set(match.id, match)
  log.matchStarted.info({
    match: match
  })
}

const nextMatchId = () => ++lastMatchId

const attempt = behaviour => (...args) => {
  try {
    return behaviour(...args)
  } catch (error) {
    report(error)
  }
}

const report = error => {
  log.unhandled.error({message: error.message, stack: error.stack.split(/\n/)})
  process.exitCode = 1
}

main()
