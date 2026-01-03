# Pint — React + Express + Postgres + Docker

A tiny full-stack project to learn real backend + Docker production patterns.

## Tech Stack
- Frontend: React (Vite)
- Backend: Node.js + Express
- Database: Postgres
- Reverse proxy / static hosting: Nginx
- Containers: Docker Compose

## Architecture (prod)
Browser -> Nginx (serves React build) -> /api/* proxied to Express -> Postgres

```mermaid
flowchart LR
  B[Browser] -->|HTTP :5173| N[Nginx (web)]
  N -->|/api/*| A[Express (api) :3001]
  A -->|SQL| D[(Postgres :5432)]