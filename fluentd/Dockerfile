FROM fluent/fluentd

USER root
RUN apk update && apk add g++ musl-dev make ruby-dev
RUN gem install fluent-plugin-websocket
USER fluent

COPY fluent.conf /fluentd/etc/
COPY plugins /fluentd/plugins/
