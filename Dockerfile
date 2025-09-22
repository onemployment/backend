FROM node:23-alpine

# Install curl for ECS health checks
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npm run nest:build

EXPOSE 3000

CMD ["npm", "run", "nest:start:prod"]