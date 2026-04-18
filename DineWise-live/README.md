# Dine Wise

Dine Wise is a restaurant search website for India that brings ratings, reviews, and location details into one interface.

## What works now

- Search restaurants across India from a single search box
- Official Google Places live data when `GOOGLE_PLACES_API_KEY` is configured
- Clean result cards with ratings, review counts, map links, and restaurant details
- Built-in Swiggy and Zomato scraper endpoints
- Optional override connectors through provider URLs you control

## Important platform note

Google offers an official API for this use case.

Swiggy and Zomato do not expose a simple public official API for live restaurant ratings/reviews in the same way. Because of that, this project ships with:

- A real Google integration
- Internal scraper endpoints at `/proxy/swiggy` and `/proxy/zomato`
- Connector override slots for `SWIGGY_PROVIDER_URL` and `ZOMATO_PROVIDER_URL`
- Honest status labels in the UI when scraping only partially works or fails

## Setup

1. Copy `.env.example` to `.env`
2. Fill in `GOOGLE_PLACES_API_KEY`
3. Optionally add `SWIGGY_PROVIDER_URL` and `ZOMATO_PROVIDER_URL` if you want to override the internal scrapers
4. Start the server:

```powershell
node server.js
```

5. Open `http://localhost:3017`

## Scraper behavior

When no provider URL is configured:

- `Swiggy` uses the built-in `/proxy/swiggy` scraper
- `Zomato` uses the built-in `/proxy/zomato` scraper

The scraper:

- Searches for a matching public page
- Fetches the public page HTML
- Tries to extract rating and review count from JSON-LD or page text

This is best-effort only. It may break if search engines or platform page structures change.

## Provider URL format

If you have your own backend or approved data provider for Swiggy or Zomato, the URL template can use these placeholders:

- `{query}`
- `{location}`
- `{name}`
- `{address}`
- `{placeId}`

Example:

```text
https://your-provider.example/api/zomato?name={name}&location={location}
```

Your provider should return JSON like:

```json
{
  "rating": 4.2,
  "reviewCount": 1387,
  "reviewSnippet": "Popular for late-night orders.",
  "url": "https://example.com/restaurant-page"
}
```

## Files

- `server.js`: API server and static file server
- `public/index.html`: app shell
- `public/styles.css`: UI styling
- `public/app.js`: frontend search and detail rendering
