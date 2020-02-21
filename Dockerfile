FROM node:lts

RUN npm install && npm test && npm run clean
