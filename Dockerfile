FROM node:16-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY yarn.lock ./
USER node
RUN yarn install --frozen-lockfile --production && yarn cache clean
COPY --chown=node:node run.sh .
COPY --chown=node:node dist dist

EXPOSE 3000

# TODO: make a dev docker image that hot-reloads?

CMD [ "./run.sh" ]
