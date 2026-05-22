FROM node:20-slim

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/tsconfig.json ./
COPY backend/src/ ./src/

RUN npm install typescript
RUN npx tsc

RUN npm prune --production && rm -rf src tsconfig.json

EXPOSE 3001

CMD ["node", "dist/server.js"]
