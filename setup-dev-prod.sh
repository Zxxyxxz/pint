#!/usr/bin/env bash
set -euo pipefail

# Create docker-compose.dev.yml
cat > docker-compose.dev.yml <<'YML'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: pint
      POSTGRES_PASSWORD: pintpass
      POSTGRES_DB: pintdb
    ports:
      - "5432:5432"
    volumes:
      - pint_pgdata:/var/lib/postgresql/data

  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    environment:
      PORT: 3001
      PGHOST: db
      PGPORT: 5432
      PGUSER: pint
      PGPASSWORD: pintpass
      PGDATABASE: pintdb
    ports:
      - "3001:3001"
    depends_on:
      - db
    volumes:
      - ./api:/app
      - /app/node_modules

  web:
    build:
      context: ./web
      dockerfile: Dockerfile.dev
    environment:
      VITE_PROXY_TARGET: "http://api:3001"
    ports:
      - "5173:5173"
    depends_on:
      - api
    volumes:
      - ./web:/app
      - /app/node_modules

volumes:
  pint_pgdata:
YML

# Create docker-compose.prod.yml
cat > docker-compose.prod.yml <<'YML'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: pint
      POSTGRES_PASSWORD: pintpass
      POSTGRES_DB: pintdb
    ports:
      - "5432:5432"
    volumes:
      - pint_pgdata:/var/lib/postgresql/data

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    environment:
      PORT: 3001
      PGHOST: db
      PGPORT: 5432
      PGUSER: pint
      PGPASSWORD: pintpass
      PGDATABASE: pintdb
    ports:
      - "3001:3001"
    depends_on:
      - db

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "5173:80"
    depends_on:
      - api

volumes:
  pint_pgdata:
YML

# Create api/Dockerfile.dev
cat > api/Dockerfile.dev <<'DOCKER'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm","run","dev"]
DOCKER

# Create web/Dockerfile.dev
cat > web/Dockerfile.dev <<'DOCKER'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm","run","dev","--","--host","0.0.0.0"]
DOCKER

echo "✅ Created: docker-compose.dev.yml, docker-compose.prod.yml, api/Dockerfile.dev, web/Dockerfile.dev"
echo "Next: install nodemon in api and add npm run dev script."