FROM node:18-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY yarn.lock ./
USER node
RUN yarn install --frozen-lockfile --production && yarn cache clean
COPY --chown=node:node run.sh .
COPY --chown=node:node dist .
COPY --chown=node:node api/dim-gg/views api/dim-gg/views
COPY --chown=node:node dim-gg-static dim-gg-static

EXPOSE 3000

CMD [ "./run.sh" ]
