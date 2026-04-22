<div align="center">

<br/>

# 🍽️ Dine Wise

### Restaurant Search for India — Ratings, Reviews & Location in One Place

<p>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express.js-Server-000000?style=for-the-badge&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/Google_Places-API-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vanilla_JS-Frontend-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
  <img src="https://img.shields.io/badge/Swiggy-Scraper-FC8019?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Zomato-Scraper-E23744?style=for-the-badge"/>
</p>

<p><strong>Dine Wise</strong> is a unified restaurant discovery platform for India. It aggregates live data from Google Places alongside best-effort data from Swiggy and Zomato, giving you ratings, review counts, map links, and restaurant details — all from a single search box.</p>

<a href="#-getting-started">Get Started</a> · <a href="#-api--endpoints">API Docs</a> · <a href="#-scraper-behavior">Scraper Details</a> · <a href="#-provider-url-override">Provider Overrides</a>

<br/>

</div>

---

## 📌 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Data Sources & Platform Notes](#-data-sources--platform-notes)
- [Scraper Behavior](#-scraper-behavior)
- [Provider URL Override](#-provider-url-override)
- [API & Endpoints](#-api--endpoints)
- [Frontend](#-frontend)
- [Known Limitations](#-known-limitations)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Unified Search** | Search restaurants across India from a single search box |
| 📍 **Google Places Integration** | Live, official data — ratings, review counts, address, map links |
| 🧡 **Swiggy Scraper** | Built-in best-effort scraper at `/proxy/swiggy` |
| ❤️ **Zomato Scraper** | Built-in best-effort scraper at `/proxy/zomato` |
| 🔌 **Provider URL Overrides** | Plug in your own approved backend for Swiggy/Zomato data |
| 🃏 **Clean Result Cards** | Ratings, review counts, map links, and restaurant details in a readable card layout |
| 🏷️ **Honest Status Labels** | UI clearly indicates when scraping partially fails or returns no data |

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Server | Express.js (`server.js`) |
| Official Data Source | Google Places API |
| Supplemental Data | Swiggy & Zomato (scrapers / provider overrides) |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Styling | Custom CSS (`public/styles.css`) |
| Deployment Port | `3017` (default) |

---

## 📁 Project Structure

```
dinewise/
├── server.js               # Express API server + static file server
├── .env                    # Your local environment variables (never commit)
├── .env.example            # Template — copy this to .env
│
└── public/
    ├── index.html          # App shell / entry point
    ├── styles.css          # UI styling
    └── app.js              # Frontend search logic and result card rendering
```

> The project is intentionally minimal — all server logic lives in `server.js` and all client logic lives in `public/app.js`.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Google Cloud](https://console.cloud.google.com/) account with the **Places API** enabled
- A Google Places API key

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/govindhere06-code/Dinewise-Final-Working.git
cd Dinewise-Final-Working
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials (see [Environment Variables](#-environment-variables) below).

### Step 4 — Start the server

```powershell
node server.js
```

### Step 5 — Open the app

Visit **`http://localhost:3017`** in your browser.

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in the following:

```env
# Required — Google Places API key for live restaurant data
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Optional — Override the built-in Swiggy scraper with your own provider URL
SWIGGY_PROVIDER_URL=

# Optional — Override the built-in Zomato scraper with your own provider URL
ZOMATO_PROVIDER_URL=
```

> ⚠️ **Never commit your `.env` file.** It is listed in `.gitignore`. Share API keys via a password manager, not over chat, email, or git history.

---

## 📡 Data Sources & Platform Notes

Dine Wise pulls from three data sources, each with a different level of reliability:

| Source | Type | Reliability | Notes |
|---|---|---|---|
| **Google Places** | Official API | ✅ Stable | Requires `GOOGLE_PLACES_API_KEY` |
| **Swiggy** | Built-in scraper | ⚠️ Best-effort | No public API available; may break on layout changes |
| **Zomato** | Built-in scraper | ⚠️ Best-effort | No public API available; may break on layout changes |

Swiggy and Zomato do not expose simple public official APIs for live restaurant ratings and reviews. The scrapers ship as a practical fallback — they work until platform page structures change, at which point the UI displays an honest status label rather than silently returning stale or incorrect data.

---

## 🕷️ Scraper Behavior

When no provider URL is set for a platform, the built-in scraper is used automatically.

**How it works:**

1. Searches for a matching public restaurant page on the platform
2. Fetches the public HTML of that page
3. Attempts to extract rating and review count from embedded `JSON-LD` data or visible page text

**Endpoints:**

| Endpoint | Platform |
|---|---|
| `GET /proxy/swiggy` | Swiggy built-in scraper |
| `GET /proxy/zomato` | Zomato built-in scraper |

> ⚠️ **Heads-up:** These scrapers are best-effort only. They may return partial data or fail entirely if search engines or platform page structures change. The UI will display a clear status label when this happens.

---

## 🔌 Provider URL Override

If you have your own backend or an approved third-party data provider for Swiggy or Zomato data, you can wire it in via the environment variables. This completely bypasses the built-in scrapers.

### Available Placeholders

Your URL template can include any of these dynamic placeholders:

| Placeholder | Description |
|---|---|
| `{query}` | Full search query string |
| `{location}` | Location portion of the search |
| `{name}` | Restaurant name |
| `{address}` | Restaurant address |
| `{placeId}` | Google Place ID of the restaurant |

### Example Provider URL

```env
ZOMATO_PROVIDER_URL=https://your-provider.example/api/zomato?name={name}&location={location}
```

### Expected Provider Response Format

Your provider endpoint must return JSON in this format:

```json
{
  "rating": 4.2,
  "reviewCount": 1387,
  "reviewSnippet": "Popular for late-night orders.",
  "url": "https://example.com/restaurant-page"
}
```

| Field | Type | Description |
|---|---|---|
| `rating` | `number` | Star rating (e.g., `4.2`) |
| `reviewCount` | `number` | Total number of reviews |
| `reviewSnippet` | `string` | Short summary or representative review |
| `url` | `string` | Direct link to the restaurant's listing page |

---

## 📡 API & Endpoints

**Base URL:** `http://localhost:3017`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the frontend app (`public/index.html`) |
| `GET` | `/proxy/swiggy` | Swiggy scraper proxy |
| `GET` | `/proxy/zomato` | Zomato scraper proxy |

The Google Places integration is handled server-side through `server.js` and is not exposed as a separate proxy route — the API key stays on the backend and is never sent to the client.

---

## 🖥️ Frontend

The frontend is a lightweight single-page app built with plain HTML, CSS, and JavaScript — no build step required.

### `public/index.html`
App shell and layout. Loads styles and the app script.

### `public/styles.css`
All UI styling — result cards, search bar, status labels, and responsive layout.

### `public/app.js`
Handles all client-side logic:
- Reading the search input and dispatching requests to the backend
- Rendering result cards with ratings, review counts, map links, and platform-specific data
- Displaying honest status labels when a data source is unavailable or returns partial results

---

## ⚠️ Known Limitations

- **Swiggy & Zomato scrapers may break** if those platforms change their page structure or anti-scraping measures. There is no workaround short of using a provider URL override.
- **No authentication layer** — this is a local/dev tool. Do not expose port `3017` publicly without adding auth.
- **Google Places quota** — the free tier has daily request limits. Monitor usage in your Google Cloud Console to avoid unexpected charges.
- **Scraper results are not guaranteed** — the UI intentionally shows partial-data and failure states rather than displaying incorrect information.

---

## 🤝 Contributing

Contributions are welcome! For major changes, please open an issue first to discuss what you'd like to change. For smaller improvements, feel free to open a pull request directly.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT — free to use, modify, and distributes.

---

<div align="center">
  <sub>Built with ❤️ for food lovers across India · Dine Wise © 2025</sub>
</div>
