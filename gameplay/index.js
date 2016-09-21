#!/usr/bin/env node

const WebSocket = require('ws')

const Started = {}
const Ended = {}

let matches = new Map()

const main = () => {
  const ws = new WebSocket(process.env.WEBSOCKET)

  console.log(JSON.stringify({
    type: 'Startup',
    service: 'gameplay',
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
  'MatchRoundStart': event => {
    matches.set(event.match.id, {
      state: Started,
      id: event.match.id,
      playersUp: new Set(playersIn(event.match)),
      playersDown: new Set()
    })
    makeAMove(event.match.id)
  },
  'MatchRoundEnd': event => {
    matches.set(event.match.id, {state: Ended})
  }
}

const noHandler = () => {}

const makeAMove = matchId => {
  setTimeout(attempt(() => {
    const match = matches.get(matchId)
    if (match.state === Ended) {
      return
    }

    const nextMove = Math.random()
    if (nextMove < 0.02) {
      bringSomeoneUp(match)
    } else if (nextMove < 0.1) {
      takeSomeoneDown(match)
    }
    makeAMove(matchId)
  }), 100)
}

const bringSomeoneUp = match => {
  const playerId = move(match.playersDown, match.playersUp)
  if (!playerId) {
    return
  }

  console.log(JSON.stringify({
    type: 'GamePlayerUp',
    match: {
      id: match.id
    },
    player: playerId
  }))
}

const takeSomeoneDown = match => {
  const playerId = move(match.playersUp, match.playersDown)
  if (!playerId) {
    return
  }

  console.log(JSON.stringify({
    type: 'GamePlayerDown',
    match: {
      id: match.id
    },
    player: playerId
  }))
}

const move = (from, to) => {
  const randomIndex = (Math.random() * from.size) | 0
  const value = Array.from(from)[randomIndex]
  if (value === undefined) {
    return false
  }
  from.delete(value)
  to.add(value)
  return value
}

const playersIn = match => Array.prototype.concat.apply([], Object.keys(match.teams).map(team => match.teams[team].players)).map(player => player.id)

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
