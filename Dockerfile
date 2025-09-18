# Builder: install prod deps
FROM node:20-alpine AS builder
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server.js ./ 
COPY --chown=node:node public/ ./public/

# Runtime: distroless node (no shell, minimal)
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=builder /app /app
ENV PORT=3000 NODE_ENV=production
EXPOSE 3000
# distroless node image has entrypoint=node; only pass script
CMD ["node","server.js"]
