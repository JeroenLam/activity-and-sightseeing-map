# Activiteiten & Bezienswaardigheden Tracker v2 — Architecture Design Document

## 1. Overview

A complete rewrite of the Activiteiten & Bezienswaardigheden Tracker, splitting the monolithic Node.js application into two independent services: a **Python/FastAPI backend** and a **Vue 3 frontend**. Data is stored in SQLite instead of JSON files, and the API communicates location data using the GeoJSON standard.

---

## 2. High-Level Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────┐
│   Vue 3 SPA     │──────▶│  FastAPI Backend │──────▶│   SQLite DB  │
│   (Nginx)       │ HTTP  │  (Uvicorn)       │       │  (volume)    │
│   Port 80       │◀──────│  Port 8000       │◀──────│              │
└─────────────────┘       └─────────────────┘       └──────────────┘
     Container 1               Container 2              Bind mount
```

- **Frontend**: Vue 3 + Vite, served by Nginx in production, Vite dev server in development
- **Backend**: FastAPI (Python 3.12+), served by Uvicorn
- **Database**: SQLite file on a Docker volume
- **Communication**: REST API with GeoJSON payloads for location data, JSON for auth/types/settings

---

## 3. Technology Stack

| Component       | Technology                                    |
| --------------- | --------------------------------------------- |
| **Frontend**    | Vue 3 (Composition API) + TypeScript + Vite   |
| **State**       | Pinia                                         |
| **Routing**     | Vue Router                                    |
| **i18n**        | vue-i18n (Nederlands + Engels)                |
| **Map**         | Leaflet + OpenStreetMap tiles                 |
| **HTTP Client** | Axios                                         |
| **Backend**     | FastAPI + Python 3.12                         |
| **ORM**         | SQLAlchemy 2.0 (async) + aiosqlite            |
| **Auth**        | python-jose (JWT) + passlib (bcrypt)          |
| **OAuth**       | Google only (via authlib)                     |
| **Migrations**  | Alembic                                       |
| **Geocoding**   | Nominatim API (server-side, rate-limited)     |
| **Validation**  | Pydantic v2 (built into FastAPI)              |
| **Deployment**  | Docker (separate containers), Docker Compose  |
| **CI Registry** | GitHub Container Registry (ghcr.io/jeroenlam) |

---

## 4. Project Structure

```
activiteiten-tracker/
├── frontend/                        # Vue 3 + Vite application
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── nginx.conf                   # Production Nginx config
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.vue
│       ├── main.ts
│       ├── assets/
│       │   └── main.css
│       ├── components/
│       │   ├── auth/
│       │   │   ├── LoginForm.vue
│       │   │   └── RegisterForm.vue
│       │   ├── layout/
│       │   │   └── AppHeader.vue
│       │   ├── locations/
│       │   │   ├── LocationForm.vue
│       │   │   ├── LocationList.vue
│       │   │   └── CsvImport.vue
│       │   ├── map/
│       │   │   ├── MapContainer.vue
│       │   │   └── FilterPanel.vue
│       │   └── types/
│       │       └── TypeManager.vue
│       ├── composables/
│       │   ├── useGeocoding.ts
│       │   └── useGeolocation.ts
│       ├── i18n/
│       │   ├── index.ts
│       │   ├── nl.json
│       │   └── en.json
│       ├── router/
│       │   └── index.ts
│       ├── stores/
│       │   ├── auth.ts
│       │   ├── locations.ts
│       │   ├── settings.ts
│       │   └── types.ts
│       ├── types/
│       │   └── index.ts
│       └── views/
│           ├── MapView.vue
│           ├── AddLocationView.vue
│           ├── ManageLocationsView.vue
│           ├── ManageTypesView.vue
│           ├── ImportView.vue
│           ├── ProfileView.vue
│           └── AuthView.vue
│
├── backend/                         # FastAPI application
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_locations.py
│   │   ├── test_types.py
│   │   ├── test_settings.py
│   │   ├── test_geocoding.py
│   │   ├── test_public.py
│   │   ├── test_import.py
│   │   └── test_export.py
│   └── app/
│       ├── __init__.py
│       ├── main.py                  # FastAPI app factory
│       ├── config.py                # Settings (pydantic-settings)
│       ├── database.py              # SQLAlchemy engine + session
│       ├── models/                  # SQLAlchemy ORM models
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── location.py
│       │   └── location_type.py
│       ├── schemas/                 # Pydantic request/response schemas
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── location.py          # Includes GeoJSON schemas
│       │   ├── location_type.py
│       │   └── settings.py
│       ├── routers/                 # API route handlers
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── locations.py
│       │   ├── types.py
│       │   └── settings.py
│       ├── services/                # Business logic
│       │   ├── __init__.py
│       │   ├── auth_service.py
│       │   ├── location_service.py
│       │   ├── type_service.py
│       │   ├── geocoding_service.py
│       │   └── csv_service.py
│       ├── middleware/
│       │   ├── __init__.py
│       │   └── auth.py              # JWT dependency
│       └── utils/
│           ├── __init__.py
│           └── geojson.py           # GeoJSON serialization helpers
│
├── docker-compose.yaml              # Production (ghcr.io images)
├── docker-compose-dev.yaml          # Development (local builds)
├── scripts/
│   ├── check.sh                     # Run all linting + tests locally
│   └── format.sh                    # Auto-fix formatting
├── .github/
│   └── workflows/
│       ├── backend-ci.yaml          # Backend lint + test
│       └── frontend-ci.yaml         # Frontend lint + test
├── .env.example
├── design_document.md               # This document
└── README.md
```

---

## 5. Data Model

### 5.1 Database Schema (SQLite via SQLAlchemy)

#### Users Table

| Column             | Type        | Constraints            |
| ------------------ | ----------- | ---------------------- |
| id                 | UUID (TEXT) | PRIMARY KEY            |
| email              | TEXT        | UNIQUE, NOT NULL       |
| password_hash      | TEXT        | NULLABLE (OAuth users) |
| display_name       | TEXT        | NOT NULL               |
| preferred_language | TEXT        | DEFAULT 'nl'           |
| default_map_lat    | REAL        | NULLABLE               |
| default_map_lng    | REAL        | NULLABLE               |
| default_map_zoom   | INTEGER     | NULLABLE               |
| created_at         | DATETIME    | NOT NULL               |

#### OAuth Providers Table

| Column      | Type        | Constraints             |
| ----------- | ----------- | ----------------------- |
| id          | UUID (TEXT) | PRIMARY KEY             |
| user_id     | TEXT        | FK → users.id, NOT NULL |
| provider    | TEXT        | NOT NULL ('google')     |
| provider_id | TEXT        | NOT NULL                |

UNIQUE constraint on (provider, provider_id).

#### User Visibility Settings Table

| Column          | Type    | Constraints        |
| --------------- | ------- | ------------------ |
| user_id         | TEXT    | PK, FK → users.id  |
| profile_public  | BOOLEAN | DEFAULT FALSE      |
| location_filter | TEXT    | DEFAULT 'show-all' |
| show_ratings    | BOOLEAN | DEFAULT TRUE       |
| show_comments   | BOOLEAN | DEFAULT TRUE       |

#### Type Visibility Table

| Column  | Type    | Constraints                      |
| ------- | ------- | -------------------------------- |
| user_id | TEXT    | FK → users.id, NOT NULL          |
| type_id | TEXT    | FK → location_types.id, NOT NULL |
| public  | BOOLEAN | DEFAULT TRUE                     |

PRIMARY KEY on (user_id, type_id).

#### Location Types Table

| Column  | Type        | Constraints             |
| ------- | ----------- | ----------------------- |
| id      | UUID (TEXT) | PRIMARY KEY             |
| user_id | TEXT        | FK → users.id, NOT NULL |
| name    | TEXT        | NOT NULL                |
| color   | TEXT        | NOT NULL (hex color)    |
| icon    | TEXT        | DEFAULT ''              |

#### Locations Table

| Column               | Type        | Constraints             |
| -------------------- | ----------- | ----------------------- |
| id                   | UUID (TEXT) | PRIMARY KEY             |
| user_id              | TEXT        | FK → users.id, NOT NULL |
| name                 | TEXT        | NOT NULL                |
| type_id              | TEXT        | FK → location_types.id  |
| city                 | TEXT        | DEFAULT ''              |
| country              | TEXT        | DEFAULT '' (ISO 3166-1) |
| link                 | TEXT        | NULLABLE                |
| latitude             | REAL        | NOT NULL                |
| longitude            | REAL        | NOT NULL                |
| rating               | INTEGER     | NULLABLE (1-5)          |
| comments             | TEXT        | NULLABLE                |
| address              | TEXT        | NULLABLE                |
| visited_unknown_year | BOOLEAN     | DEFAULT FALSE           |
| created_at           | DATETIME    | NOT NULL                |
| updated_at           | DATETIME    | NOT NULL                |

#### Location Visits Table

| Column      | Type        | Constraints                 |
| ----------- | ----------- | --------------------------- |
| id          | UUID (TEXT) | PRIMARY KEY                 |
| location_id | TEXT        | FK → locations.id, NOT NULL |
| year        | INTEGER     | NOT NULL                    |

UNIQUE constraint on (location_id, year).

#### Location Tags Table

| Column      | Type        | Constraints                 |
| ----------- | ----------- | --------------------------- |
| id          | UUID (TEXT) | PRIMARY KEY                 |
| location_id | TEXT        | FK → locations.id, NOT NULL |
| tag         | TEXT        | NOT NULL                    |

UNIQUE constraint on (location_id, tag).

---

### 5.2 GeoJSON Data Format

The API exchanges location data using GeoJSON `Feature` and `FeatureCollection` objects.

#### Single Location (Feature)

```json
{
  "type": "Feature",
  "id": "uuid-of-location",
  "geometry": {
    "type": "Point",
    "coordinates": [5.1214, 52.0907]  // [longitude, latitude] per GeoJSON spec
  },
  "properties": {
    "name": "Artis",
    "type": {
      "id": "uuid-of-type",
      "name": "Dierentuin",
      "color": "#4CAF50",
      "icon": "paw"
    },
    "city": "Amsterdam",
    "country": "NL",
    "address": "Plantage Kerklaan 38-40, 1018 CZ Amsterdam",
    "link": "https://www.artis.nl",
    "years_visited": [2022, 2024],
    "visited_unknown_year": false,
    "rating": 4,
    "comments": "Great zoo, especially the aquarium section",
    "tags": ["family-friendly", "rainy-day"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-06-20T14:00:00Z"
  }
}
```

#### Location Collection (FeatureCollection)

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "id": "...", "geometry": {...}, "properties": {...} },
    ...
  ]
}
```

---

## 6. API Endpoints

All endpoints are annotated with their authentication requirement:
- **🔓 Public** — no authentication required
- **🔒 Authenticated** — requires valid JWT cookie

### 6.1 Authentication

| Method | Route                       | Auth | Description                   |
| ------ | --------------------------- | ---- | ----------------------------- |
| POST   | `/api/auth/register`        | 🔓    | Register new local account    |
| POST   | `/api/auth/login`           | 🔓    | Login with email + password   |
| POST   | `/api/auth/logout`          | 🔓    | Logout (clear cookie)         |
| GET    | `/api/auth/me`              | 🔒    | Get current user profile      |
| PUT    | `/api/auth/me`              | 🔒    | Update user profile           |
| PUT    | `/api/auth/me/password`     | 🔒    | Change password               |
| GET    | `/api/auth/oauth-config`    | 🔓    | Get available OAuth providers |
| GET    | `/api/auth/google`          | 🔓    | Start Google OAuth flow       |
| GET    | `/api/auth/google/callback` | 🔓    | Google OAuth callback         |

### 6.2 User Settings

| Method | Route           | Auth | Description                          |
| ------ | --------------- | ---- | ------------------------------------ |
| GET    | `/api/settings` | 🔒    | Get user settings (map defaults etc) |
| PUT    | `/api/settings` | 🔒    | Update user settings                 |

**Settings payload:**
```json
{
  "preferred_language": "nl",
  "default_map_lat": 52.1,
  "default_map_lng": 5.3,
  "default_map_zoom": 7
}
```

### 6.3 Locations (GeoJSON)

| Method | Route                           | Auth | Description                               |
| ------ | ------------------------------- | ---- | ----------------------------------------- |
| GET    | `/api/locations`                | 🔒    | Get all locations as FeatureCollection    |
| POST   | `/api/locations`                | 🔒    | Create location (accepts GeoJSON Feature) |
| GET    | `/api/locations/{id}`           | 🔒    | Get single location as Feature            |
| PUT    | `/api/locations/{id}`           | 🔒    | Update location (accepts GeoJSON Feature) |
| DELETE | `/api/locations/{id}`           | 🔒    | Delete location                           |
| POST   | `/api/locations/{id}/geocode`   | 🔒    | Re-geocode a location                     |
| POST   | `/api/locations/import`         | 🔒    | CSV bulk import (legacy)                  |
| POST   | `/api/locations/import/preview` | 🔒    | Preview CSV mapping                       |
| GET    | `/api/locations/export/geojson` | 🔒    | Export all locations as GeoJSON file      |
| POST   | `/api/locations/import/geojson` | 🔒    | Import locations from GeoJSON file        |

**Query parameters for GET `/api/locations`:**
- `year_from` — filter visited years >= value
- `year_to` — filter visited years <= value
- `unvisited` — `true` to show only unvisited locations
- `type_id` — filter by location type

### 6.4 Location Types

| Method | Route             | Auth | Description   |
| ------ | ----------------- | ---- | ------------- |
| GET    | `/api/types`      | 🔒    | Get all types |
| POST   | `/api/types`      | 🔒    | Create type   |
| PUT    | `/api/types/{id}` | 🔒    | Update type   |
| DELETE | `/api/types/{id}` | 🔒    | Delete type   |

### 6.5 Geocoding (Proxy)

| Method | Route                  | Auth | Description                         |
| ------ | ---------------------- | ---- | ----------------------------------- |
| GET    | `/api/geocode/search`  | 🔒    | Search Nominatim (rate-limited)     |
| GET    | `/api/geocode/reverse` | 🔒    | Reverse geocode (lat/lng → address) |

### 6.6 Public Profile

| Method | Route                             | Auth | Description                               |
| ------ | --------------------------------- | ---- | ----------------------------------------- |
| GET    | `/api/public/{user_id}/locations` | 🔓    | Get public locations as FeatureCollection |
| GET    | `/api/public/{user_id}/profile`   | 🔓    | Get public display name + type legend     |

The backend proxies Nominatim requests to enforce rate limiting (1 req/sec) and extract city/country from the response.

**Response for `/api/geocode/search`:**
```json
[
  {
    "display_name": "Artis, Plantage Kerklaan, Amsterdam, ...",
    "lat": 52.3660,
    "lon": 4.9163,
    "city": "Amsterdam",
    "country_code": "NL"
  }
]
```

**Response for `/api/geocode/reverse`:**
```json
{
  "display_name": "...",
  "city": "Amsterdam",
  "country_code": "NL"
}
```

---

## 7. Frontend Features

### 7.1 Map View (Main Page)

- Leaflet map with OpenStreetMap tiles (light + dark mode)
- Markers colored per location type, shaped by visited status (square = visited, circle = unvisited)
- Popup on marker click: name, type, city, country, visited years, link, rating, comments
- **Default map view**: fit all locations in view (current behavior)
- **Configurable default**: if user has set default lat/lng/zoom in settings, use that instead on initial load

### 7.2 Filter Panel

- Dual-handle range slider for year range
- Toggle: "Show only unvisited"
- View mode toggle: Standard vs. Transparency mode
- Opacity sliders for visited/unvisited markers
- Marker size slider

### 7.3 Add Location

- Form: name, type, city, country, link, visited years, rating, comments
- **Nominatim search bar**: type address → autocomplete suggestions → select → lat/lng + city + country auto-filled
- **"Use my location" button**: uses browser Geolocation API → lat/lng filled → **automatic reverse geocode** to fill city and country code
- Click on map as alternative coordinate input → **automatic reverse geocode** to fill city and country
- Validation of required fields

### 7.4 Type Management

- List of all location types with color swatches
- Color picker per type
- Icon picker (MDI icons)
- Add, edit, delete
- Warning when deleting a type that is still in use

### 7.5 CSV Import

- File upload interface
- Preview table with auto-detected column mapping
- Column mapping UI
- Progress bar during import (geocoding is slow)
- Result summary: imported / skipped / errors

### 7.6 User Profile & Settings

- Language switch (NL / EN)
- Set default map location + zoom level (via a mini-map picker or coordinate inputs)
- Change password
- Dark mode toggle

### 7.7 Authentication

- Login / register page
- Local accounts (email + password)
- OAuth via Google and GitHub (optional, only active when configured)
- JWT stored in httpOnly cookie, persistent across page refresh

---

## 8. Auto-Geocoding Behavior

When a user selects a location via the Nominatim search or uses "Use my location":

1. **Search selection**: The frontend sends the selected result's coordinates to the form. The backend geocoding proxy returns the structured `city` and `country_code` extracted from the Nominatim `address` object. These are auto-filled in the form.

2. **"Use my location"**: The browser Geolocation API provides lat/lng. The frontend calls `/api/geocode/reverse?lat=...&lon=...` which returns structured city + country code. These are auto-filled.

3. **Click on map**: Same as "use my location" — reverse geocode the clicked coordinates.

The user can always manually override the auto-filled city and country values.

---

## 9. Default Map View Configuration

| Scenario                         | Behavior                                                      |
| -------------------------------- | ------------------------------------------------------------- |
| User has no settings configured  | Map fits bounds to show all locations (current behavior)      |
| User has no locations            | Map shows Netherlands centered (lat: 52.1, lng: 5.3, zoom: 7) |
| User has configured default view | Map opens at configured lat/lng/zoom                          |
| User clicks "Reset to fit all"   | Map fits bounds to all locations (one-time action)            |

The settings page provides a mini-map where the user can pan/zoom to their desired default view, then save it.

---

## 10. Docker Architecture

### 10.1 Production (`docker-compose.yaml`)

```yaml
services:
  backend:
    image: ghcr.io/jeroenlam/activity-and-sightseeing-map-backend:latest
    ports:
      - "8000:8000"
    volumes:
      - db-data:/app/data
    environment:
      - DATABASE_URL=sqlite:///app/data/app.db
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRY=7d
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
      - OAUTH_CALLBACK_URL=${OAUTH_CALLBACK_URL:-http://localhost}
      - CORS_ORIGINS=http://localhost
    restart: unless-stopped

  frontend:
    image: ghcr.io/jeroenlam/activity-and-sightseeing-map-frontend:latest
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  db-data:
```

### 10.2 Development (`docker-compose-dev.yaml`)

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - ./backend/app:/app/app          # Hot reload
      - dev-db-data:/app/data
    environment:
      - DATABASE_URL=sqlite:///app/data/app.db
      - JWT_SECRET=dev-secret-change-me
      - JWT_EXPIRY=7d
      - CORS_ORIGINS=http://localhost:5173
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src          # Hot reload
      - ./frontend/index.html:/app/index.html
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  dev-db-data:
```

### 10.3 Backend Dockerfile (Production)

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY app/ ./app/
COPY alembic.ini ./
COPY alembic/ ./alembic/

RUN mkdir -p /app/data

ENV DATABASE_URL=sqlite:///app/data/app.db
EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

### 10.4 Frontend Dockerfile (Production)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 10.5 Nginx Configuration

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 11. Authentication Flow

```
┌──────────┐     POST /api/auth/login      ┌──────────┐
│ Frontend │ ─────────────────────────────▶ │ Backend  │
│          │ ◀───────────────────────────── │          │
│          │  Set-Cookie: token=<JWT>       │          │
│          │  Body: { user profile }        │          │
└──────────┘                                └──────────┘
```

- JWT stored in **httpOnly, Secure, SameSite=Lax** cookie
- Token contains: `user_id`, `exp`, `iat`
- All authenticated endpoints extract user from cookie via FastAPI dependency
- Token refresh: automatic re-issue on each authenticated request (sliding expiration)

---

## 12. Migration Strategy from v1

Since this is a complete rewrite, a data migration script should be provided:

```python
# migrate_v1_data.py
# Reads JSON files from v1 data/ directory and inserts into SQLite
```

This script:
1. Reads `data/users.json` → inserts into `users` table
2. For each user directory in `data/users/{id}/`:
   - Reads `types.json` → inserts into `location_types` table
   - Reads `locations.json` → inserts into `locations` + `location_visits` tables

---

## 13. Environment Variables

```env
# Backend
DATABASE_URL=sqlite:///app/data/app.db
JWT_SECRET=<random-secret>
JWT_EXPIRY=7d

# OAuth (optional — leave empty to hide Google login button)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_CALLBACK_URL=http://localhost

# CORS
CORS_ORIGINS=http://localhost,http://localhost:5173

# Frontend (build-time)
VITE_API_URL=http://localhost:8000
```

---

## 14. Key Design Decisions

| Decision                         | Rationale                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| **Separate containers**          | Independent scaling, separate deployment cycles, clearer separation of concerns           |
| **FastAPI + Python**             | Modern async framework, automatic OpenAPI docs, Pydantic validation, rich ecosystem       |
| **SQLite**                       | Zero-config, single-file database, sufficient for this use case, easy backup              |
| **SQLAlchemy + Alembic**         | Type-safe ORM, proper schema migrations, well-established tooling                         |
| **GeoJSON API format**           | Industry standard for geospatial data, native Leaflet support, extensible properties      |
| **Server-side geocoding proxy**  | Enforces rate limiting, extracts structured city/country, hides Nominatim from client     |
| **Nginx reverse proxy**          | Serves static files efficiently, proxies API calls to backend, handles CORS in production |
| **Separate visits table**        | Normalized schema, easy to query/filter by year, supports future per-visit metadata       |
| **User settings in users table** | Simple, avoids extra table for few settings, settings are per-user                        |

---

## 15. Public Profile & Sharing

Users can set their profile to **public**, which generates a shareable link. Unauthenticated visitors can view the public profile without logging in.

### 15.1 Visibility Settings (per user)

| Setting             | Options                                  | Default  |
| ------------------- | ---------------------------------------- | -------- |
| Profile visibility  | public / private                         | private  |
| Location filter     | show-all / visited-only / unvisited-only | show-all |
| Per-type visibility | public / private (per type)              | public   |
| Show ratings        | yes / no                                 | yes      |
| Show comments       | yes / no                                 | yes      |

### 15.2 Public Profile API

| Method | Route                             | Description                               |
| ------ | --------------------------------- | ----------------------------------------- |
| GET    | `/api/public/{user_id}/locations` | Get public locations as FeatureCollection |
| GET    | `/api/public/{user_id}/profile`   | Get public display name + type legend     |

The backend filters locations server-side based on the user's visibility settings. Private types and hidden fields are never sent to the client.

### 15.3 Public Profile URL

```
https://<domain>/public/<user_id>
```

Renders a read-only map view with the user's public locations, respecting their visibility configuration.

---

## 16. Import & Export

### 16.1 Legacy CSV Import (carried over from v1)

- File upload with column mapping
- Geocoding during import (rate-limited)
- Progress feedback

### 16.2 GeoJSON Export (new)

| Method | Route                           | Description                                       |
| ------ | ------------------------------- | ------------------------------------------------- |
| GET    | `/api/locations/export/geojson` | Export all locations as GeoJSON FeatureCollection |

Downloads the user's complete location data as a `.geojson` file.

### 16.3 GeoJSON Import (new)

| Method | Route                           | Description                        |
| ------ | ------------------------------- | ---------------------------------- |
| POST   | `/api/locations/import/geojson` | Import locations from GeoJSON file |

Accepts a GeoJSON FeatureCollection, validates features, maps properties to the location schema, creates missing types if needed.

---

## 17. Testing & Code Quality

### 17.1 Backend Testing

Every API endpoint must have automated tests covering:
- Happy path (correct input → expected output)
- Authentication enforcement (401 when unauthenticated on 🔒 endpoints)
- Input validation (400 on malformed requests)
- Authorization (403 when accessing other user's data)
- Edge cases (not found, duplicates, empty collections)

**Test stack:**
- `pytest` — test runner
- `pytest-asyncio` — async test support
- `httpx` — async test client for FastAPI (`AsyncClient`)
- `factory-boy` — test data factories
- `pytest-cov` — coverage reporting (minimum 80% required)

**Test structure:**
```
backend/
├── tests/
│   ├── conftest.py          # Fixtures: test DB, auth helpers, factories
│   ├── test_auth.py         # Auth endpoints
│   ├── test_locations.py    # Location CRUD + GeoJSON
│   ├── test_types.py        # Type CRUD
│   ├── test_settings.py     # User settings
│   ├── test_geocoding.py    # Geocoding proxy
│   ├── test_public.py       # Public profile endpoints
│   ├── test_import.py       # CSV + GeoJSON import
│   └── test_export.py       # GeoJSON export
```

### 17.2 Code Quality Tools

| Tool       | Purpose                                        |
| ---------- | ---------------------------------------------- |
| **black**  | Code formatting (line length: 88)              |
| **isort**  | Import sorting (black-compatible profile)      |
| **ruff**   | Fast linting (replaces flake8, pyflakes, etc.) |
| **mypy**   | Static type checking (strict mode)             |
| **bandit** | Security vulnerability scanning                |

Configuration in `pyproject.toml`:
```toml
[tool.black]
line-length = 88

[tool.isort]
profile = "black"

[tool.ruff]
line-length = 88
select = ["E", "F", "W", "I", "N", "UP", "S", "B", "A", "C4", "PT"]

[tool.mypy]
strict = true
plugins = ["pydantic.mypy"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.coverage.run]
source = ["app"]

[tool.coverage.report]
fail_under = 80
```

### 17.3 Local Validation Script

A `scripts/check.sh` script runs all quality checks and tests locally:

```bash
#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../backend"

echo "=== Installing dev dependencies ==="
pip install -e ".[dev]" --quiet

echo "=== Running isort (import sorting) ==="
isort --check-only --diff app/ tests/

echo "=== Running black (formatting) ==="
black --check --diff app/ tests/

echo "=== Running ruff (linting) ==="
ruff check app/ tests/

echo "=== Running mypy (type checking) ==="
mypy app/

echo "=== Running bandit (security scan) ==="
bandit -r app/ -c pyproject.toml

echo "=== Running pytest (tests + coverage) ==="
pytest --cov --cov-report=term-missing --cov-fail-under=80

echo "✅ All checks passed!"
```

A `scripts/format.sh` script auto-fixes formatting:

```bash
#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../backend"

echo "=== Sorting imports ==="
isort app/ tests/

echo "=== Formatting code ==="
black app/ tests/

echo "=== Auto-fixing lint issues ==="
ruff check --fix app/ tests/

echo "✅ Formatting complete!"
```

### 17.4 GitHub Actions Workflow

File: `.github/workflows/backend-ci.yaml`

```yaml
name: Backend CI

on:
  push:
    branches: [main]
    paths: ["backend/**"]
  pull_request:
    branches: [main]
    paths: ["backend/**"]

jobs:
  lint:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -e ".[dev]"
      - name: Check import sorting (isort)
        run: isort --check-only --diff app/ tests/
      - name: Check formatting (black)
        run: black --check --diff app/ tests/
      - name: Lint (ruff)
        run: ruff check app/ tests/
      - name: Type check (mypy)
        run: mypy app/
      - name: Security scan (bandit)
        run: bandit -r app/ -c pyproject.toml

  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -e ".[dev]"
      - name: Run tests with coverage
        run: pytest --cov --cov-report=xml --cov-fail-under=80
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: backend/coverage.xml
```

### 17.5 Frontend CI (parallel workflow)

File: `.github/workflows/frontend-ci.yaml`

```yaml
name: Frontend CI

on:
  push:
    branches: [main]
    paths: ["frontend/**"]
  pull_request:
    branches: [main]
    paths: ["frontend/**"]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - name: Lint (ESLint)
        run: npm run lint
      - name: Type check
        run: npm run type-check
      - name: Unit tests
        run: npm run test -- --coverage
```

---

## 18. Future Considerations (not in v2.0)

Additional location properties that may be added in later versions:

| Property         | Type | Description                         |
| ---------------- | ---- | ----------------------------------- |
| `price_range`    | ENUM | free / cheap / moderate / expensive |
| `duration_hours` | REAL | Typical visit duration in hours     |

These can be added via Alembic migrations without breaking the existing schema.
