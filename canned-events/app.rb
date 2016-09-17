#!/usr/bin/env ruby

require 'json'
require 'yaml'

events = YAML.load_file(ARGV[0])['events']
time = 0
events.each do |event|
  sleep(event['timestamp'] - time)
  time = event['timestamp']
  event.delete('timestamp')
  puts event.to_json
  $stdout.flush
end

sleep(60 * 60 * 24)
