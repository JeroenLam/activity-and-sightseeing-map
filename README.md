# Activities & Sightseeing Map

A full-stack web application for tracking visited and planned activities, museums, and sightseeing locations on an interactive Leaflet map.

## Architecture

The application uses a **split-container architecture**:

- **Backend** — Python FastAPI with SQLAlchemy (async SQLite), JWT authentication, GeoJSON API
- **Frontend** — Vue 3 SPA with TypeScript, served by Vite (dev) or Nginx (prod)

Both services run as separate Docker containers, orchestrated via Docker Compose.

## Features

- **Interactive Leaflet map** with colored markers per location type (squares for visited, circles for unvisited)
- **Sidebar** with progress bar, type legend with counts, and visible-locations list
- **Filters** — year range, show unvisited only, adjustable marker size and opacity
- **Location management** — sortable/searchable table with inline edit, delete, geocode retry, CSV export
- **Add location** — geocoding search, click-to-place pin map, device location, star rating, notes
- **GeoJSON import/export** — full data portability in standard GeoJSON FeatureCollection format
- **CSV import** — legacy format with column mapping and automatic geocoding
- **Location types** — customizable name and color per type
- **Dark mode** — full UI support with CSS variables
- **Bilingual** — English and Dutch (vue-i18n)
- **Authentication** — email/password with bcrypt, Google OAuth support
- **Public profiles** — shareable read-only map view

## Tech Stack

| Layer     | Technology                                             |
| --------- | ------------------------------------------------------ |
| Backend   | FastAPI, Python 3.12, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| Auth      | JWT (httpOnly cookies), bcrypt, python-jose, Google OAuth |
| Database  | SQLite (aiosqlite, async)                              |
| Frontend  | Vue 3 (Composition API), TypeScript, Vite 6, Pinia    |
| Map       | Leaflet + OpenStreetMap tiles                          |
| i18n      | vue-i18n 10 (EN + NL)                                 |
| Testing   | pytest + httpx (backend), Vitest (frontend)            |
| Deploy    | Docker Compose (uvicorn + nginx/vite)                  |

## Quick Start

### Prerequisites

- Docker & Docker Compose

### Development

```bash
# Start both services with hot reload
docker compose -f docker-compose-dev.yaml up --build
```

The frontend is available at `http://localhost:5173`, proxying API requests to the backend on port `8000`.

### Production

```bash
docker compose up --build
```

The app is served at `http://localhost:80` (nginx serves the built frontend and proxies `/api` to the backend).

### Without Docker

```bash
# Backend
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables

| Variable            | Default              | Description                    |
| ------------------- | -------------------- | ------------------------------ |
| `SECRET_KEY`        | (required)           | Secret for signing JWT tokens  |
| `DATABASE_URL`      | `sqlite+aiosqlite:///./data/app.db` | Database connection string |
| `GOOGLE_CLIENT_ID`  | _(empty = disabled)_ | Google OAuth client ID         |
| `GOOGLE_CLIENT_SECRET` | _(empty = disabled)_ | Google OAuth client secret  |

## API Format

The locations API uses **GeoJSON** as the data format:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "uuid",
      "geometry": {
        "type": "Point",
        "coordinates": [4.9163, 52.3660]
      },
      "properties": {
        "name": "Artis Zoo",
        "type": { "id": "uuid", "name": "Zoo", "color": "#4CAF50", "icon": "" },
        "city": "Amsterdam",
        "country": "Netherlands",
        "years_visited": [2019, 2022],
        "visited_unknown_year": false,
        "rating": 4,
        "comments": "Great day out",
        "tags": [],
        "link": "https://www.artis.nl/"
      }
    }
  ]
}
```

## Testing

```bash
# Backend tests (pytest)
cd backend && uv run pytest

# Frontend type-check
cd frontend && npx vue-tsc --noEmit
```

## Project Structure

```
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── routers/        # API routes
│   │   └── middleware/     # Auth middleware
│   ├── alembic/            # Database migrations
│   └── tests/              # pytest tests
├── frontend/               # Vue 3 frontend
│   ├── src/
│   │   ├── assets/         # Global CSS
│   │   ├── components/     # UI components (map, layout, auth, locations)
│   │   ├── composables/    # Vue composables (geocoding)
│   │   ├── i18n/           # EN and NL translations
│   │   ├── router/         # Vue Router
│   │   ├── stores/         # Pinia stores (auth, locations, types, theme)
│   │   ├── types/          # TypeScript interfaces
│   │   └── views/          # Page views
│   └── ...
├── docker-compose.yaml     # Production compose
├── docker-compose-dev.yaml # Development compose (hot reload)
└── README.md
```

## CSV Import Format

The CSV import accepts files with the following columns. Only `name` is required.

| Column      | Description                                                        | Example         |
| ----------- | ------------------------------------------------------------------ | --------------- |
| `name`      | Name of the location (required)                                    | `Artis Zoo`     |
| `type`      | Category/type name (auto-created if new)                           | `Zoo`           |
| `city`      | City name                                                          | `Amsterdam`     |
| `country`   | Country name                                                       | `Netherlands`   |
| `link`      | URL                                                                | `https://...`   |
| `visited`   | Comma-separated years, `-` for unknown year, empty if not visited  | `2019, 2022`    |
| `latitude`  | Latitude (skips geocoding if both lat/lon provided)                | `52.3660`       |
| `longitude` | Longitude                                                          | `4.9163`        |
| `rating`    | 1–5 star rating                                                    | `4`             |
| `note`      | Free-text note                                                     | `Great visit`   |

## License

Private project.
