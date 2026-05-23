FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY packages/bonds-domain/package.json packages/bonds-domain/
COPY packages/api/package.json packages/api/

RUN npm ci

COPY packages/bonds-domain packages/bonds-domain
COPY packages/api packages/api

RUN npm run build -w bonds-domain && npm run build -w @investment-tracker/api

FROM node:22-bookworm-slim AS production

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY packages/bonds-domain/package.json packages/bonds-domain/
COPY packages/api/package.json packages/api/

RUN npm ci --omit=dev

COPY --from=build /app/packages/bonds-domain/dist packages/bonds-domain/dist
COPY --from=build /app/packages/api/dist packages/api/dist
COPY packages/api/src/migrations packages/api/src/migrations
COPY docker/api/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
ENV DATABASE_URL=/data/data.db

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
