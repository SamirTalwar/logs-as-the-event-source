require 'json'
require 'fluent/parser'

module Fluent
  class TextParser
    class JsonInStringParser < Parser
      Plugin.register_parser('json_in_string', self)

      def parse(text)
        object = JSON.parse(text)
        yield nil, {event: object}
      end
    end
  end
end
