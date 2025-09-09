# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS deps
# if you’re in a workspace, also COPY pnpm-workspace.yaml
COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

FROM deps AS build
ENV NODE_ENV=development
# copy the whole repo, filtered via .dockerignore so we include swagger/*
COPY . .
# run your TS build (adjust if your script name differs)
RUN pnpm build

FROM base AS prod
COPY pnpm-lock.yaml package.json ./
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
EXPOSE 8080
# adjust entrypoint to your compiled app
CMD ["node","dist/main.js"]
