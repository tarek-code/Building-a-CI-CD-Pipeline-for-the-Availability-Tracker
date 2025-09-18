# Builder: install prod deps
FROM node:20-alpine AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
# Use npm install to allow building even if lockfile is not yet updated
RUN npm install --omit=dev && npm cache clean --force
COPY server.js ./ 
COPY public/ ./public/
COPY input/ ./input/
# Runtime: node alpine (with sh)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app /app
ENV PORT=3000 NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
