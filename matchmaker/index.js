#!/usr/bin/env node

const WebSocket = require('ws')

const Teams = ['alpha', 'bravo']
const PlayersPerTeam = 3
const PlayersPerMatch = Teams.length * PlayersPerTeam

let players = []
let matches = new Map()
let lastMatchId = 0

const main = () => {
  const ws = new WebSocket(process.env.WEBSOCKET)

  console.log(JSON.stringify({
    type: 'ServiceStarted',
    service: 'matchmaker',
    hostname: process.env.HOSTNAME
  }))

  ws.on('error', report)

  ws.on('message', attempt(data => {
    const event = JSON.parse(data)[1].event
    if (!event || !event.type) {
      report(new Error('Event with no type.'))
      return
    }
    const handle = handlers[event.type] || noHandler
    handle(event)
  }))
}

const handlers = {
  'PlayerJoined': event => {
    players.push(event.player)
    startMatchIfPossible()
  },
  'MatchStarted': event => {
    const match = matches.get(event.match.id)
    match.round = 1
    console.log(JSON.stringify({
      type: 'MatchRoundStarted',
      match: match
    }))
  },
  'ScoringRoundWon': event => {
    const match = matches.get(event.match.id)
    console.log(JSON.stringify({
      type: 'MatchRoundEnded',
      match: match
    }))
  },
  'ScoringMatchWon': event => {
    const match = matches.get(event.match.id)
    match.winner = event.winner
  },
  'MatchRoundEnded': event => {
    const match = matches.get(event.match.id)
    if (match.winner) {
      console.log(JSON.stringify({
        type: 'MatchEnd',
        match: match
      }))
    } else {
      match.round += 1
      console.log(JSON.stringify({
        type: 'MatchRoundStarted',
        match: match
      }))
    }
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
  console.log(JSON.stringify({
    type: 'MatchStarted',
    match: match
  }))
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
  console.log(JSON.stringify({type: 'Error', message: error.message, stack: error.stack.split(/\n/)}))
  process.exitCode = 1
}

main()
