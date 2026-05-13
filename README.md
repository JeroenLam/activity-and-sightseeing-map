# Activiteiten & Bezienswaardigheden Map

A full-stack web application for tracking visited and unvisited activities, museums, and sightseeing locations on an interactive map.

## Features

- **Interactive Leaflet map** with colored markers per location type (circles for unvisited, squares for visited)
- **Filter & sort** by year range, view mode (all / visited / unvisited), marker size, and opacity
- **Toggleable legend** — click a type to show/hide its markers
- **Dark mode** — full UI and map tile support (CartoDB dark tiles)
- **CSV import** with streaming progress bar and automatic geocoding (Nominatim + Photon fallback)
- **Manage tab** — compact sortable table with inline edit, delete, and geocode retry
- **Location types** — fully customizable with name and color
- **Bilingual** — Dutch (NL) and English (EN)
- **Authentication** — local email/password, Google OAuth, GitHub OAuth
- **User profile** — change password
- **Progress bar** — shows % of locations visited in the header
- **Docker** — single-container deployment with data volume
- **CI/CD** — GitHub Actions with tests + GHCR image publishing

## Tech Stack

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| Frontend   | Vue 3 (Composition API), TypeScript, Vite, Pinia |
| Map        | Leaflet + OpenStreetMap / CartoDB tiles          |
| Backend    | Express 4, TypeScript, Passport.js, JWT          |
| Geocoding  | Nominatim (primary) + Photon/Komoot (fallback)   |
| Storage    | JSON files (per-user directories)                |
| i18n       | vue-i18n 10                                      |
| Testing    | Jest + supertest (server), Vitest (client)       |
| Deployment | Docker (Node 20 Alpine, multi-stage build)       |

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Development

```bash
# Install dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..

# Start server (with hot reload)
cd server && npm run dev

# Start client (in a second terminal)
cd client && npm run dev
```

The client runs on `http://localhost:5173` and proxies API requests to the server on port `3000`.

### Docker

```bash
docker compose up --build
```

The app is then available at `http://localhost:3000`.

### Environment Variables

| Variable               | Default                 | Description                   |
| ---------------------- | ----------------------- | ----------------------------- |
| `PORT`                 | `3000`                  | Server port                   |
| `DATA_DIR`             | `./data`                | Directory for JSON data files |
| `JWT_SECRET`           | (required)              | Secret for signing JWT tokens |
| `JWT_EXPIRY`           | `7d`                    | JWT token expiry duration     |
| `GOOGLE_CLIENT_ID`     | _(empty = disabled)_    | Google OAuth client ID        |
| `GOOGLE_CLIENT_SECRET` | _(empty = disabled)_    | Google OAuth client secret    |
| `GITHUB_CLIENT_ID`     | _(empty = disabled)_    | GitHub OAuth client ID        |
| `GITHUB_CLIENT_SECRET` | _(empty = disabled)_    | GitHub OAuth client secret    |
| `OAUTH_CALLBACK_URL`   | `http://localhost:3000` | Base URL for OAuth callbacks  |

## Testing

```bash
# Server tests (Jest)
cd server && npm test

# Client tests (Vitest)
cd client && npm test
```

## Project Structure

```
├── client/                 # Vue 3 frontend
│   ├── src/
│   │   ├── assets/         # Global CSS
│   │   ├── components/     # Reusable components (map, layout, filters)
│   │   ├── i18n/           # NL and EN translations
│   │   ├── router/         # Vue Router config
│   │   ├── stores/         # Pinia stores (auth, locations, types, theme)
│   │   ├── types/          # TypeScript interfaces
│   │   └── views/          # Page views
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # Passport strategies
│   │   ├── middleware/      # Auth middleware
│   │   ├── routes/         # API routes (auth, locations, types)
│   │   ├── services/       # Business logic (user, file store)
│   │   ├── types/          # TypeScript interfaces
│   │   └── utils/          # File I/O helpers
│   └── ...
├── .github/workflows/      # CI/CD pipeline
├── Dockerfile              # Multi-stage production build
├── docker-compose.yml      # Docker Compose config
└── README.md
```

## License

Private project.
