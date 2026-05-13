# Activiteiten & Bezienswaardigheden Tracker — Design Document

## Overzicht

Een Vue.js + Node.js/Express webapp met Leaflet-kaart voor het bijhouden van bezochte en te bezoeken locaties (musea, dierentuinen, pretparken, etc.). Per-user data opgeslagen in JSON bestanden, volledige authenticatie (lokaal + OAuth), tweetalige interface (NL/EN), en geserveerd vanuit één Docker container.

---

## Technologie Stack

| Component       | Technologie                                              |
| --------------- | -------------------------------------------------------- |
| **Frontend**    | Vue 3 (Composition API) + TypeScript + Vite              |
| **State**       | Pinia                                                    |
| **Routing**     | Vue Router                                               |
| **i18n**        | vue-i18n (Nederlands + Engels, schakelbaar in interface)  |
| **Kaart**       | Leaflet + OpenStreetMap tiles (gratis)                   |
| **Backend**     | Express + TypeScript                                     |
| **Auth**        | Passport.js (LocalStrategy + Google + GitHub OAuth), JWT |
| **Geocoding**   | Nominatim API (gratis, 1 req/sec rate limit)             |
| **Opslag**      | JSON bestanden op filesystem (per-user directory)        |
| **Deployment**  | Enkele Docker container, multi-stage build, data volume  |

---

## Architectuur

### Project structuur

```
activiteiten-google-maps/
├── client/                          # Vue 3 + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── MapContainer.vue       # Leaflet kaart wrapper
│   │   │   │   ├── LocationMarker.vue     # Individuele marker component
│   │   │   │   └── FilterPanel.vue        # Jaar-range slider + bezocht filter
│   │   │   ├── locations/
│   │   │   │   ├── LocationForm.vue       # Nieuwe locatie toevoegen
│   │   │   │   ├── LocationList.vue       # Lijst weergave
│   │   │   │   └── CsvImport.vue          # CSV upload & mapping
│   │   │   ├── types/
│   │   │   │   └── TypeManager.vue        # CRUD voor locatie-types
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.vue
│   │   │   │   └── RegisterForm.vue
│   │   │   └── layout/
│   │   │       ├── AppHeader.vue          # Nav + taalswitch + user menu
│   │   │       └── AppTabs.vue            # Tab navigatie
│   │   ├── views/
│   │   │   ├── MapView.vue                # Kaart pagina
│   │   │   ├── AddLocationView.vue        # Toevoegen pagina
│   │   │   ├── ManageTypesView.vue        # Types beheren
│   │   │   └── AuthView.vue               # Login / Register
│   │   ├── stores/                         # Pinia state management
│   │   │   ├── auth.ts
│   │   │   ├── locations.ts
│   │   │   └── types.ts
│   │   ├── i18n/
│   │   │   ├── index.ts                   # vue-i18n configuratie
│   │   │   ├── nl.json
│   │   │   └── en.json
│   │   ├── composables/
│   │   │   ├── useGeocoding.ts            # Nominatim API wrapper
│   │   │   └── useMap.ts                  # Leaflet helpers
│   │   ├── types/
│   │   │   └── index.ts                   # TypeScript interfaces
│   │   ├── router/
│   │   │   └── index.ts                   # Vue Router setup
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                          # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts                    # Login, register, OAuth callbacks
│   │   │   ├── locations.ts               # CRUD locaties
│   │   │   └── types.ts                   # CRUD locatie-types
│   │   ├── middleware/
│   │   │   └── auth.ts                    # JWT verificatie middleware
│   │   ├── services/
│   │   │   ├── userService.ts             # User CRUD op JSON
│   │   │   ├── locationService.ts         # Locatie CRUD op JSON
│   │   │   └── typeService.ts             # Type CRUD op JSON
│   │   ├── utils/
│   │   │   ├── fileStore.ts               # JSON file read/write met locking
│   │   │   └── csvParser.ts               # CSV parsing logic
│   │   ├── config/
│   │   │   └── passport.ts               # Passport.js strategies
│   │   └── index.ts                       # Express app setup
│   ├── tsconfig.json
│   └── package.json
├── data/                            # Runtime data (Docker volume)
│   ├── users.json                   # User accounts
│   └── users/                       # Per-user data
│       └── {userId}/
│           ├── locations.json
│           └── types.json
├── Dockerfile
├── .dockerignore
├── .env.example
├── DESIGN.md                        # Dit document
└── README.md
```

---

## Data Modellen

### User

```typescript
interface User {
  id: string;                    // UUID v4
  email: string;
  passwordHash: string | null;   // null voor OAuth-only users
  oauthProviders: {
    provider: string;            // "google" | "github"
    providerId: string;
  }[];
  displayName: string;
  preferredLanguage: "nl" | "en";
  createdAt: string;             // ISO 8601 datum
}
```

### Location

```typescript
interface Location {
  id: string;                    // UUID v4
  name: string;
  type: string;                  // referentie naar LocationType.id
  city: string;
  country: string;               // ISO 3166-1 alpha-2 (NL, DK, UK, ...)
  link: string | null;
  latitude: number;
  longitude: number;
  visitedYears: number[];        // bijv. [2024, 2025], leeg = niet bezocht
  visitedUnknownYear: boolean;   // true als bezocht maar jaar onbekend ("-" in CSV)
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### LocationType

```typescript
interface LocationType {
  id: string;                    // UUID v4
  name: string;                  // bijv. "Dierentuin"
  color: string;                 // hex kleur voor kaartmarker, bijv. "#4CAF50"
  icon: string;                  // optioneel icon identifier
}
```

### Standaard locatie-types (seed data)

Afgeleid van het CSV bestand, worden geseed bij eerste login van een user:

| Type                  | Kleur     | Omschrijving |
| --------------------- | --------- | ------------ |
| Dierentuin            | `#4CAF50` | Groen        |
| Museum                | `#2196F3` | Blauw        |
| Museum - Historie     | `#795548` | Bruin        |
| Museum - Kunst        | `#9C27B0` | Paars        |
| Museum - Oorlog       | `#F44336` | Rood         |
| Museum - Wetenschap   | `#FF9800` | Oranje       |
| Pretpark              | `#E91E63` | Roze         |

---

## API Endpoints

### Authenticatie

| Methode | Route                  | Omschrijving                          |
| ------- | ---------------------- | ------------------------------------- |
| POST    | `/api/auth/register`   | Registreer nieuw lokaal account       |
| POST    | `/api/auth/login`      | Login met email + wachtwoord          |
| GET     | `/api/auth/google`     | Start Google OAuth flow               |
| GET     | `/api/auth/google/cb`  | Google OAuth callback                 |
| GET     | `/api/auth/github`     | Start GitHub OAuth flow               |
| GET     | `/api/auth/github/cb`  | GitHub OAuth callback                 |
| POST    | `/api/auth/logout`     | Logout (clear cookies)                |
| GET     | `/api/auth/me`         | Huidig ingelogde user ophalen         |

JWT tokens worden opgeslagen in **httpOnly cookies** (access + refresh token).

### Locaties (authenticated)

| Methode | Route                        | Omschrijving                                   |
| ------- | ---------------------------- | ---------------------------------------------- |
| GET     | `/api/locations`             | Alle locaties (met optionele filters)          |
| POST    | `/api/locations`             | Nieuwe locatie aanmaken                        |
| PUT     | `/api/locations/:id`         | Locatie bijwerken                               |
| DELETE  | `/api/locations/:id`         | Locatie verwijderen                             |
| POST    | `/api/locations/import`      | CSV import (bulk)                              |

**Query parameters voor GET `/api/locations`:**
- `yearFrom` — filter op bezoekjaar >= waarde
- `yearTo` — filter op bezoekjaar <= waarde
- `unvisited` — `true` om alleen onbezochte locaties te tonen

### Locatie-types (authenticated)

| Methode | Route               | Omschrijving                    |
| ------- | ------------------- | ------------------------------- |
| GET     | `/api/types`        | Alle types ophalen              |
| POST    | `/api/types`        | Nieuw type aanmaken             |
| PUT     | `/api/types/:id`    | Type bijwerken (naam, kleur)    |
| DELETE  | `/api/types/:id`    | Type verwijderen                |

---

## Frontend Features

### 1. Kaart View (hoofdpagina)

- **Leaflet kaart** met OpenStreetMap tiles
- **Markers** gekleurd per locatie-type (custom SVG circle markers of `leaflet-extra-markers`)
- **Popup** bij klik op marker: naam, type, stad, land, bezoekjaren, link naar website
- **Twee weergavemodi:**
  - **Standaard**: alle locaties zichtbaar, gekleurd per type
  - **Doorzichtigheid modus**: bezochte locaties worden semi-transparant; de **opacity is instelbaar** via een slider (0–100%)

### 2. Filter Panel (op kaart view)

- **Dual-handle range slider** voor jaarbereik (bijv. 2018–2026)
- **Toggle**: "Toon alleen onbezochte locaties"
- **View mode toggle**: Standaard vs. Doorzichtigheid modus
- **Opacity slider** (alleen zichtbaar in doorzichtigheid modus)

### 3. Locatie Toevoegen (tab)

- Formulier met velden: naam, type (dropdown), stad, land, link, bezoekjaren
- **Nominatim zoekbalk**: typ een plaatsnaam of adres → autocomplete suggesties → selecteer → lat/lng wordt automatisch ingevuld
- **Klik op kaart** als alternatief om coördinaten te selecteren
- Validatie van verplichte velden

### 4. Type Beheer (tab)

- Lijst van alle locatie-types
- **Kleurkiezer** per type
- Toevoegen, bewerken, verwijderen
- **Waarschuwing** bij verwijderen als het type nog in gebruik is bij locaties

### 5. CSV Import

- **File upload** interface
- **Preview tabel** met automatische kolomherkenning
- **Kolom mapping**: map CSV kolommen naar locatie-velden
- **Voortgangsbalk** tijdens import (geocoding kan traag zijn door rate limiting)
- **Resultaat overzicht**: geïmporteerd / overgeslagen / fouten per rij

### 6. Taalswitch (NL / EN)

- Schakelaar in de header
- Alle interface-teksten vertaald via vue-i18n
- Taalvoorkeur opgeslagen in user profiel

### 7. Authenticatie

- Login / registreer pagina
- Lokaal account (email + wachtwoord)
- OAuth via Google en GitHub (optioneel, alleen actief als env vars geconfigureerd)
- Sessie persistent na pagina-refresh (JWT in httpOnly cookie)

---

## Implementatie Stappen

### Fase 1: Project scaffolding & backend basis

1. **Initialiseer Vue 3 project** met Vite, TypeScript, Pinia, Vue Router, vue-i18n
2. **Initialiseer Express project** met TypeScript
3. **Implementeer JSON file store** — atomische read/write met file locking, automatisch aanmaken van directories
4. **Implementeer authenticatie** — Passport.js strategies, JWT, routes, auth middleware

### Fase 2: Locatie-types & Locaties API

5. **Locatie-types CRUD** — service + routes, seed standaard types bij eerste login
6. **Locaties CRUD** — service + routes, filtering via query params
7. **CSV import endpoint** — parsing, validatie, geocoding via Nominatim met rate limiting (1 req/sec)

### Fase 3: Frontend — Kaart & Navigatie

8. **App layout** — tab navigatie, header met taalswitch en user menu
9. **i18n setup** — nl.json + en.json, taalvoorkeur in user profiel
10. **Kaart view** — Leaflet + OSM, markers gekleurd per type, popups
11. **Filter panel** — jaar-range slider, onbezocht toggle, doorzichtigheid modus + opacity slider

### Fase 4: Frontend — CRUD & Import

12. **Locatie toevoegen formulier** — met Nominatim autocomplete + klik-op-kaart
13. **Type beheer pagina** — kleurkiezer, CRUD, in-gebruik check
14. **CSV import interface** — upload, preview, mapping, voortgang, resultaat

### Fase 5: Docker & Afronding

15. **Dockerfile** — multi-stage build (Vite build → Express serveert static + API), data volume, poort 3000
16. **.env.example** — `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `PORT`, `DATA_DIR`
17. **README.md** met setup instructies

---

## Configuratie

### Environment variabelen (.env)

```env
# Server
PORT=3000
DATA_DIR=./data

# JWT
JWT_SECRET=<random-secret>
JWT_EXPIRY=7d

# OAuth (optioneel — als niet ingesteld worden OAuth knoppen verborgen)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# OAuth callback base URL
OAUTH_CALLBACK_URL=http://localhost:3000
```

### Docker

```bash
# Bouwen
docker build -t activiteiten-map .

# Draaien
docker run -p 3000:3000 -v activiteiten-data:/app/data activiteiten-map
```

De `data/` directory wordt als Docker volume gemount zodat gebruikersdata persistent is.

---

## Design Beslissingen

| Beslissing | Motivatie |
| --- | --- |
| **JSON files ipv database** | Simpel, geen extra dependencies. Voldoende voor ~100-1000 locaties per user. |
| **Enkele Docker container** | Express serveert zowel de Vue build als de API — eenvoudige deployment. |
| **Per-user data isolatie** | Elke gebruiker heeft eigen `locations.json` en `types.json` in `data/users/{id}/`. |
| **Nominatim rate limit server-side** | 1 req/sec afgedwongen bij CSV import om Nominatim fair use policy te respecteren. |
| **Bezoekjaren als `number[]`** | Simpeler dan volledige datums; meerdere bezoeken per locatie mogelijk (bijv. `[2024, 2025]`). |
| **`visitedUnknownYear` veld** | Voor locaties waar `"-"` in het CSV staat: bezocht maar jaar onbekend. |
| **OAuth optioneel** | Werkt alleen als de env vars geconfigureerd zijn; anders worden OAuth knoppen verborgen in de UI. |
| **Custom SVG circle markers** | Leaflet standaard markers zijn moeilijk te kleuren. SVG circles zijn lichtgewicht en volledig kleur-configureerbaar. |

---

## Verificatie Criteria

1. **Docker**: `docker build` + `docker run` → app bereikbaar op `localhost:3000`
2. **Auth flow**: registreer → login → sessie persistent na refresh
3. **CSV import**: upload meegeleverd CSV → ~97 locaties op kaart met correcte coördinaten
4. **Kaart filtering**: jaar-range slider filtert correct; toggle onbezocht toont alleen locaties zonder bezoekjaar
5. **Doorzichtigheid modus**: bezochte locaties semi-transparant; opacity slider werkt real-time
6. **Type kleuren**: markers hebben kleur van hun type; kleurwijziging → markers updaten live
7. **Locatie toevoegen**: zoek "Artis" → Nominatim suggestie → selecteer → lat/lng ingevuld → opslaan → marker verschijnt
8. **Taalswitch**: NL ↔ EN → alle interface teksten veranderen, voorkeur bewaard in profiel
