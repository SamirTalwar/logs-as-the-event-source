FROM ruby:slim

ARG FILE

WORKDIR /app
COPY app.rb app.rb
COPY $FILE events.yaml

CMD ["./app.rb", "events.yaml"]
