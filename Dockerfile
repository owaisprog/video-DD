FROM node:22-alpine

WORKDIR /usr/src/app/frontend

COPY --chown=node:node package*.json ./

RUN chown -R node:node /usr/src/app/frontend

USER node

RUN --mount=type=cache,target=/home/node/.npm-frontend npm ci

COPY --chown=node:node . .

RUN npm run build 

EXPOSE 5173

CMD ["npm","start"]
