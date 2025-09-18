# Builder: install prod deps
FROM node:20-alpine AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server.js ./ 
COPY --chown=node:node public/ ./public/
COPY --chown=node:node input/ ./input/
COPY --chown=node:node output/ ./output/
# Runtime: node alpine (with sh)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app /app
ENV PORT=3000 NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
