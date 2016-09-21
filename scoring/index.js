#!/usr/bin/env node

const WebSocket = require('ws')

const Teams = ['alpha', 'bravo']
const WinningScore = 2

let matches = new Map()

const main = () => {
  const ws = new WebSocket(process.env.WEBSOCKET)

  console.log(JSON.stringify({
    type: 'Startup',
    service: 'scoring',
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
  'MatchStart': event => {
    const match = event.match
    Teams.forEach(team => {
      match.teams[team].score = 0
    })
    matches.set(match.id, match)
  },
  'MatchRoundStart': event => {
    const match = matches.get(event.match.id)
    match.round = event.match.round
    match.playersUp = new Set(playersIn(match))
  },
  'GamePlayerDown': event => {
    const match = matches.get(event.match.id)
    match.playersUp.delete(event.player)
    checkRoundWinner(match)
  },
  'GamePlayerRevived': event => {
    const match = matches.get(event.match.id)
    match.playersUp.add(event.player)
  },
  'ScoringRoundWinner': event => {
    const match = matches.get(event.match.id)
    match.teams[event.winner].score += 1
    checkMatchWinner(match)
  }
}

const noHandler = () => {}

const playersIn = match => Array.prototype.concat.apply([], Teams.map(team => match.teams[team].players))

const checkRoundWinner = match => {
  Teams.forEach(team => {
    if (!match.teams[team].players.some(player => match.playersUp.has(player))) {
      console.log(JSON.stringify({
        type: 'ScoringRoundWinner',
        match: {
          id: match.id
        },
        round: match.round,
        winner: other(team)
      }))
    }
  })
}

const checkMatchWinner = match => {
  Teams.forEach(team => {
    if (match.teams[team].score >= WinningScore) {
      console.log(JSON.stringify({
        type: 'ScoringMatchWinner',
        match: {
          id: match.id
        },
        winner: team
      }))
    }
  })
}

const other = team => {
  switch (team) {
    case Teams[0]:
      return Teams[1]
    case Teams[1]:
      return Teams[0]
  }
}

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
