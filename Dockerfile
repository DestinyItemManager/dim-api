FROM node:22-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

USER node
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --production && pnpm store prune
COPY --chown=node:node run.sh .
COPY --chown=node:node dist .
COPY --chown=node:node api/dim-gg/views api/dim-gg/views
COPY --chown=node:node dim-gg-static dim-gg-static

EXPOSE 3000

CMD [ "./run.sh" ]
