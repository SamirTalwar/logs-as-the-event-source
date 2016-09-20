FROM node:onbuild

ARG FILE
COPY $FILE events.yaml

ENTRYPOINT ["npm", "--silent"]
CMD ["start", "events.yaml"]
