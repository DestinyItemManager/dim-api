FROM node:13-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY yarn.lock ./
USER node
RUN yarn install
COPY --chown=node:node api api
COPY --chown=node:node tsconfig.json .
COPY --chown=node:node run.sh .
RUN yarn build:api

EXPOSE 3000

# TODO: make a dev docker image that hot-reloads?

CMD [ "./run.sh" ]
