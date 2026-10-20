# Archivo de prueba del tema: Dockerfile.
# syntax=docker/dockerfile:1
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS build
LABEL org.opencontainers.image.title="bureau" maintainer="Normalxxnavi"

WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts && \
    npm cache clean --force
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine
ENV NODE_ENV=production \
    SECTOR="research"
COPY --from=build /app/dist ./dist
EXPOSE 8080/tcp
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:8080/health || exit 1
USER node
ENTRYPOINT ["node", "dist/server.js"]
CMD ["--sector", "research"]
