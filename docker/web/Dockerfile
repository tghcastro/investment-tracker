FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
COPY packages/bonds-domain/package.json packages/bonds-domain/
COPY packages/web/package.json packages/web/

RUN npm ci

COPY packages/bonds-domain packages/bonds-domain
COPY packages/web packages/web

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build -w bonds-domain && npm run build -w @investment-tracker/web

FROM nginx:1.27-alpine

COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

EXPOSE 80
