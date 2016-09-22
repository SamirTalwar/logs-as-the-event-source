#!/usr/bin/env node

const Logger = require('microservice-logging')
const WebSocket = require('ws')

const Teams = ['alpha', 'bravo']
const WinningScore = 2
const Started = {}
const Ended = {}

const log = new Logger({now: Date.now, output: console, events: {
  serviceStarted: 'ServiceStarted',
  scoringRoundWon: 'ScoringRoundWon',
  scoringMatchWon: 'ScoringMatchWon',
  unhandled: 'Error'
}}).with({service: 'scoring'})

let matches = new Map()

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
  'MatchStarted': event => {
    const match = event.match
    match.state = Ended
    Teams.forEach(team => {
      match.teams[team].score = 0
    })
    matches.set(match.id, match)
  },
  'MatchRoundStarted': event => {
    const match = matches.get(event.match.id)
    match.state = Started
    match.round = event.match.round
    match.playersUp = new Set(playersIn(match))
  },
  'GamePlayerDown': event => {
    const match = matches.get(event.match.id)
    match.playersUp.delete(event.player)
    checkRoundWinner(match)
  },
  'GamePlayerUp': event => {
    const match = matches.get(event.match.id)
    match.playersUp.add(event.player)
  },
  'ScoringRoundWon': event => {
    const match = matches.get(event.match.id)
    match.teams[event.winner].score += 1
    checkMatchWinner(match)
  }
}

const noHandler = () => {}

const playersIn = match => Array.prototype.concat.apply([], Object.keys(match.teams).map(team => match.teams[team].players)).map(player => player.id)

const checkRoundWinner = match => {
  Teams.forEach(team => {
    if (match.state === Started && !match.teams[team].players.some(player => match.playersUp.has(player.id))) {
      match.state = Ended
      log.scoringRoundWon.info({
        match: {
          id: match.id
        },
        round: match.round,
        winner: other(team)
      })
    }
  })
}

const checkMatchWinner = match => {
  Teams.forEach(team => {
    if (match.teams[team].score >= WinningScore) {
      log.scoringMatchWon.info({
        match: {
          id: match.id
        },
        winner: team
      })
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
  log.unhandled.error({message: error.message, stack: error.stack.split(/\n/)})
  process.exitCode = 1
}

main()
