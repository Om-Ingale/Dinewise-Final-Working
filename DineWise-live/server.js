const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

loadEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3017);
const PUBLIC_DIR = path.join(__dirname, "public");
let googleProviderState = getGooglePlacesApiKey() ? "live" : "missing_api_key";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname === "/api/search" && req.method === "GET") {
      return await handleSearch(requestUrl, res);
    }

    if (requestUrl.pathname === "/api/restaurant" && req.method === "GET") {
      return await handleRestaurant(requestUrl, res);
    }

    if (requestUrl.pathname === "/api/compare" && req.method === "GET") {
      return await handleCompare(requestUrl, res);
    }

    if (requestUrl.pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        app: "Dine Wise",
        providers: getProviderStatus(),
      });
    }

    if (requestUrl.pathname === "/proxy/swiggy" && req.method === "GET") {
      return await handlePlatformProxy(requestUrl, res, "swiggy");
    }

    if (requestUrl.pathname === "/proxy/zomato" && req.method === "GET") {
      return await handlePlatformProxy(requestUrl, res, "zomato");
    }

    return serveStatic(requestUrl.pathname, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Internal server error",
      details: error.message,
    });
  }
});

server.listen(PORT, () => {
  console.log(`Dine Wise running on http://localhost:${PORT}`);
});

async function handleSearch(requestUrl, res) {
  const query = (requestUrl.searchParams.get("q") || "").trim();
  const location = (requestUrl.searchParams.get("location") || "India").trim();

  if (!query) {
    return sendJson(res, 400, { error: "Query is required." });
  }

  const googleResults = await searchGooglePlaces(query, location);

  const combined = await Promise.all(
    googleResults.map(async (place) => {
      const [swiggy, zomato] = await Promise.all([
        fetchPlatformRating("swiggy", place, query, location),
        fetchPlatformRating("zomato", place, query, location),
      ]);

      const aggregate = buildAggregateScore([
        { source: "Google", rating: place.google.rating },
        { source: "Swiggy", rating: swiggy.rating },
        { source: "Zomato", rating: zomato.rating },
      ]);

      return {
        id: place.id,
        name: place.name,
        address: place.address,
        location: place.location,
        coordinates: place.coordinates,
        googleMapsUri: place.googleMapsUri,
        websiteUri: place.websiteUri,
        imageUri: place.imageUri,
        cuisines: place.cuisines,
        nationalPhoneNumber: place.nationalPhoneNumber,
        regularOpeningHours: place.regularOpeningHours,
        platforms: {
          google: place.google,
          swiggy,
          zomato,
        },
        aggregate,
      };
    })
  );

  return sendJson(res, 200, {
    query,
    location,
    providers: getProviderStatus(),
    total: combined.length,
    results: combined,
  });
}

async function handleRestaurant(requestUrl, res) {
  const placeId = (requestUrl.searchParams.get("placeId") || "").trim();

  if (!placeId) {
    return sendJson(res, 400, { error: "placeId is required." });
  }

  const place = await getGooglePlaceDetails(placeId);
  if (!place) {
    return sendJson(res, 404, { error: "Restaurant not found." });
  }

  const [swiggy, zomato] = await Promise.all([
    fetchPlatformRating("swiggy", place, place.name, place.location.label),
    fetchPlatformRating("zomato", place, place.name, place.location.label),
  ]);

  return sendJson(res, 200, {
    placeId,
    restaurant: {
      id: place.id,
      name: place.name,
      address: place.address,
      location: place.location,
      coordinates: place.coordinates,
      googleMapsUri: place.googleMapsUri,
      websiteUri: place.websiteUri,
      nationalPhoneNumber: place.nationalPhoneNumber,
      regularOpeningHours: place.regularOpeningHours,
      summary: place.summary,
      imageUri: place.imageUri,
      cuisines: place.cuisines,
      reviews: place.google.reviews,
      platforms: {
        google: place.google,
        swiggy,
        zomato,
      },
      aggregate: buildAggregateScore([
        { source: "Google", rating: place.google.rating },
        { source: "Swiggy", rating: swiggy.rating },
        { source: "Zomato", rating: zomato.rating },
      ]),
    },
    providers: getProviderStatus(),
  });
}

async function handleCompare(requestUrl, res) {
  const q1 = (requestUrl.searchParams.get("q1") || "").trim();
  const q2 = (requestUrl.searchParams.get("q2") || "").trim();
  const location = (requestUrl.searchParams.get("location") || "India").trim();

  if (!q1 || !q2) {
    return sendJson(res, 400, { error: "q1 and q2 are required for comparison." });
  }

  // search both
  const [res1, res2] = await Promise.all([
     searchGooglePlaces(q1, location),
     searchGooglePlaces(q2, location)
  ]);

  const top1 = res1[0];
  const top2 = res2[0];

  if (!top1 || !top2) {
    return sendJson(res, 404, { error: "Could not find one or both restaurants for comparison." });
  }

  // fetch platform ratings
  const [swiggy1, zomato1, swiggy2, zomato2] = await Promise.all([
    fetchPlatformRating("swiggy", top1, q1, location),
    fetchPlatformRating("zomato", top1, q1, location),
    fetchPlatformRating("swiggy", top2, q2, location),
    fetchPlatformRating("zomato", top2, q2, location),
  ]);

  const agg1 = buildAggregateScore([
    { source: "Google", rating: top1.google.rating },
    { source: "Swiggy", rating: swiggy1.rating },
    { source: "Zomato", rating: zomato1.rating }
  ]);

  const agg2 = buildAggregateScore([
    { source: "Google", rating: top2.google.rating },
    { source: "Swiggy", rating: swiggy2.rating },
    { source: "Zomato", rating: zomato2.rating }
  ]);
  
  const base1 = agg1.rating || 0;
  const base2 = agg2.rating || 0;

  // Stable pseudo-random offset based on length of name for stable mock results
  const offset1 = (top1.name.length % 5) * 0.1;
  const offset2 = (top2.name.length % 5) * 0.1;
  
  const generateCategories = (base, offset) => ({
      food: base > 0 ? Number((base + offset - 0.1).toFixed(1)) : null,
      ambience: base > 0 ? Number((base - offset + 0.2).toFixed(1)) : null,
      service: base > 0 ? Number((base + (offset > 0.2 ? -0.1 : 0.1)).toFixed(1)) : null,
  });

  return sendJson(res, 200, {
      restaurant1: {
          name: top1.name,
          address: top1.address,
          imageUri: top1.imageUri,
          cuisines: top1.cuisines,
          aggregate: agg1,
          categories: generateCategories(base1, offset1),
          platforms: { google: top1.google, swiggy: swiggy1, zomato: zomato1 }
      },
      restaurant2: {
          name: top2.name,
          address: top2.address,
          imageUri: top2.imageUri,
          cuisines: top2.cuisines,
          aggregate: agg2,
          categories: generateCategories(base2, offset2),
          platforms: { google: top2.google, swiggy: swiggy2, zomato: zomato2 }
      }
  });
}

async function handlePlatformProxy(requestUrl, res, platform) {
  const name = (requestUrl.searchParams.get("name") || requestUrl.searchParams.get("q") || "").trim();
  const location = (requestUrl.searchParams.get("location") || "India").trim();
  const address = (requestUrl.searchParams.get("address") || "").trim();
  const placeId = (requestUrl.searchParams.get("placeId") || "").trim();

  if (!name) {
    return sendJson(res, 400, { error: "name is required." });
  }

  const result = await scrapePlatformRating(platform, {
    id: placeId,
    name,
    address,
  }, name, location);

  return sendJson(res, 200, result);
}

async function searchGooglePlaces(query, location) {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    googleProviderState = "missing_api_key";
    return buildGoogleFallbackResults(query, location);
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.rating",
          "places.userRatingCount",
          "places.location",
          "places.googleMapsUri",
          "places.websiteUri",
          "places.nationalPhoneNumber",
          "places.regularOpeningHours.weekdayDescriptions",
          "places.primaryTypeDisplayName",
          "places.editorialSummary",
          "places.photos",
        ].join(","),
      },
      body: JSON.stringify({
        textQuery: `${query} restaurant ${location}`,
        pageSize: 8,
        languageCode: "en",
        regionCode: "IN",
      }),
    });

    if (!response.ok) {
      const message = await safeErrorMessage(response);
      googleProviderState = "provider_error";
      warnWithThrottle("google-search", `Google Places search failed, using fallback: ${message}`);
      return buildGoogleFallbackResults(query, location, message);
    }

    googleProviderState = "live";
    const payload = await response.json();
    return (payload.places || []).map(normalizeGooglePlace);
  } catch (error) {
    googleProviderState = "provider_error";
    warnWithThrottle("google-search", `Google Places search error, using fallback: ${error.message}`);
    return buildGoogleFallbackResults(query, location, error.message);
  }
}

async function getGooglePlaceDetails(placeId) {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    googleProviderState = "missing_api_key";
    return buildFallbackPlaceDetails(placeId);
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "id",
          "displayName",
          "formattedAddress",
          "location",
          "googleMapsUri",
          "websiteUri",
          "nationalPhoneNumber",
          "regularOpeningHours.weekdayDescriptions",
          "primaryTypeDisplayName",
          "editorialSummary",
          "rating",
          "userRatingCount",
          "reviews",
          "photos",
        ].join(","),
      },
    });

    if (!response.ok) {
      const message = await safeErrorMessage(response);
      googleProviderState = "provider_error";
      warnWithThrottle("google-details", `Google Place Details failed, using fallback: ${message}`);
      return buildFallbackPlaceDetails(placeId, message);
    }

    googleProviderState = "live";
    const payload = await response.json();
    return normalizeGooglePlace(payload);
  } catch (error) {
    googleProviderState = "provider_error";
    warnWithThrottle("google-details", `Google Place Details error, using fallback: ${error.message}`);
    return buildFallbackPlaceDetails(placeId, error.message);
  }
}

async function fetchPlatformRating(platform, place, query, location) {
  const serpApiKey = process.env.SERPAPI_API_KEY;
  if (serpApiKey) {
    return fetchFromSerpApi(platform, place, query, location, serpApiKey);
  }

  const template =
    platform === "swiggy"
      ? process.env.SWIGGY_PROVIDER_URL
      : process.env.ZOMATO_PROVIDER_URL;

  if (!template) {
    return scrapePlatformRating(platform, place, query, location);
  }

  const providerUrl = template
    .replace("{query}", encodeURIComponent(query))
    .replace("{location}", encodeURIComponent(location))
    .replace("{name}", encodeURIComponent(place.name || query))
    .replace("{address}", encodeURIComponent(place.address || ""))
    .replace("{placeId}", encodeURIComponent(place.id || ""));

  try {
    const response = await fetch(providerUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        source: capitalize(platform),
        status: "provider_error",
        rating: null,
        reviewCount: null,
        reviewSnippet: `${capitalize(platform)} provider returned ${response.status}.`,
        url: providerUrl,
      };
    }

    const payload = await response.json();
    return {
      source: capitalize(platform),
      status: "live",
      rating: toNumberOrNull(payload.rating),
      reviewCount: toNumberOrNull(payload.reviewCount),
      reviewSnippet: payload.reviewSnippet || payload.description || "",
      url: payload.url || providerUrl,
    };
  } catch (error) {
    return {
      source: capitalize(platform),
      status: "provider_error",
      rating: null,
      reviewCount: null,
      reviewSnippet: error.message,
      url: providerUrl,
    };
  }
}

async function fetchFromSerpApi(platform, place, query, location, apiKey) {
  const searchQuery = `${place.name || query} ${location} ${platform}`;
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        source: capitalize(platform),
        status: "provider_error",
        rating: null,
        reviewCount: null,
        reviewSnippet: `SerpAPI returned ${response.status}`,
        url: null,
      };
    }

    const data = await response.json();
    const organicResults = data.organic_results || [];
    
    const domain = platform === "swiggy" ? "swiggy.com" : "zomato.com";
    const result = organicResults.find(r => r.link && r.link.includes(domain));

    if (!result) {
      return {
        source: capitalize(platform),
        status: "search_no_match",
        rating: null,
        reviewCount: null,
        reviewSnippet: `No ${capitalize(platform)} match found via SerpAPI.`,
        url: null,
      };
    }

    let rating = null;
    let reviewCount = null;

    if (result.rich_snippet && result.rich_snippet.top && result.rich_snippet.top.detected_extensions) {
        const ext = result.rich_snippet.top.detected_extensions;
        if (ext.rating) rating = toNumberOrNull(ext.rating);
        if (ext.reviews) reviewCount = toNumberOrNull(ext.reviews);
    }

    if (rating === null || reviewCount === null) {
        const extracted = extractRatingFromHtml(platform, result.snippet || "");
        if (rating === null) rating = extracted.rating;
        if (reviewCount === null) reviewCount = extracted.reviewCount;
    }

    return {
      source: capitalize(platform),
      status: rating !== null ? "live" : "scraped_partial",
      rating: rating,
      reviewCount: reviewCount,
      reviewSnippet: result.snippet || "",
      url: result.link || null,
    };
  } catch (error) {
    return {
      source: capitalize(platform),
      status: "provider_error",
      rating: null,
      reviewCount: null,
      reviewSnippet: error.message,
      url: null,
    };
  }
}

async function scrapePlatformRating(platform, place, query, location) {
  try {
    const candidate = await findPlatformPage(platform, place.name || query, location, place.address || "");
    if (!candidate) {
      return {
        source: capitalize(platform),
        status: "search_no_match",
        rating: null,
        reviewCount: null,
        reviewSnippet: `No ${capitalize(platform)} page match found.`,
        url: null,
      };
    }

    const pageResponse = await fetch(candidate.url, {
      headers: buildBrowserHeaders(candidate.url),
    });

    if (!pageResponse.ok) {
      return {
        source: capitalize(platform),
        status: "provider_error",
        rating: null,
        reviewCount: null,
        reviewSnippet: `${capitalize(platform)} page returned ${pageResponse.status}.`,
        url: candidate.url,
      };
    }

    const html = await pageResponse.text();
    const extracted = extractRatingFromHtml(platform, html);

    return {
      source: capitalize(platform),
      status: extracted.rating !== null ? "scraped_live" : "scraped_partial",
      rating: extracted.rating,
      reviewCount: extracted.reviewCount,
      reviewSnippet: extracted.reviewSnippet || candidate.snippet || `Scraped from ${capitalize(platform)} search result.`,
      url: candidate.url,
    };
  } catch (error) {
    return {
      source: capitalize(platform),
      status: "provider_error",
      rating: null,
      reviewCount: null,
      reviewSnippet: error.message,
      url: null,
    };
  }
}

function buildAggregateScore(entries) {
  const valid = entries.filter((entry) => typeof entry.rating === "number");
  if (!valid.length) {
    return {
      rating: null,
      basedOn: [],
      label: "Waiting for live providers",
    };
  }

  const total = valid.reduce((sum, entry) => sum + entry.rating, 0);
  return {
    rating: round(total / valid.length),
    basedOn: valid.map((entry) => entry.source),
    label: `Average from ${valid.map((entry) => entry.source).join(", ")}`,
  };
}

function normalizeGooglePlace(place) {
  const photoName = place.photos && place.photos[0] ? place.photos[0].name : null;

  return {
    id: place.id,
    name: place.displayName ? place.displayName.text : "Unknown Restaurant",
    address: place.formattedAddress || "Address unavailable",
    location: {
      label: getLocationLabel(place.formattedAddress),
      lat: place.location ? place.location.latitude : null,
      lng: place.location ? place.location.longitude : null,
    },
    coordinates: place.location
      ? { lat: place.location.latitude, lng: place.location.longitude }
      : null,
    googleMapsUri: place.googleMapsUri || null,
    websiteUri: place.websiteUri || null,
    nationalPhoneNumber: place.nationalPhoneNumber || null,
    regularOpeningHours: place.regularOpeningHours
      ? place.regularOpeningHours.weekdayDescriptions || []
      : [],
    cuisines: place.primaryTypeDisplayName ? place.primaryTypeDisplayName.text : "Restaurant",
    summary: place.editorialSummary ? place.editorialSummary.text : "",
    imageUri: photoName ? buildPhotoUri(photoName) : null,
    google: {
      source: "Google",
      status: getGooglePlacesApiKey() ? "live" : "demo",
      rating: toNumberOrNull(place.rating),
      reviewCount: toNumberOrNull(place.userRatingCount),
      reviewSnippet: place.editorialSummary ? place.editorialSummary.text : "",
      reviews: normalizeGoogleReviews(place.reviews || []),
      url: place.googleMapsUri || null,
    },
  };
}

function normalizeGoogleReviews(reviews) {
  return reviews.slice(0, 5).map((review) => ({
    author: review.authorAttribution ? review.authorAttribution.displayName : "Google user",
    rating: toNumberOrNull(review.rating),
    relativeTime: review.relativePublishTimeDescription || "",
    text: review.text ? review.text.text : "",
    url: review.googleMapsUri || null,
  }));
}

function buildPhotoUri(photoName) {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey || !photoName) {
    return null;
  }

  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=720&key=${encodeURIComponent(apiKey)}`;
}

function getProviderStatus() {
  return {
    google: googleProviderState,
    swiggy: readEnv("SWIGGY_PROVIDER_URL") ? "configured" : "internal_scraper",
    zomato: readEnv("ZOMATO_PROVIDER_URL") ? "configured" : "internal_scraper",
  };
}

function buildGoogleFallbackResults(query, location, failureReason = "") {
  const label = `${query} in ${location}`;
  const hasGoogleKey = Boolean(getGooglePlacesApiKey());
  const summary = hasGoogleKey
    ? "Google data is temporarily unavailable. Check Places API enablement and API key restrictions in Google Cloud."
    : "Add GOOGLE_PLACES_NEW_API_KEY (or GOOGLE_PLACES_API_KEY) to load live restaurant ratings, reviews, and location details.";
  const reviewSnippet = hasGoogleKey
    ? `Google provider unavailable. ${failureReason || "Please verify API access."}`
    : "Google Places API (New) key not configured.";

  return [
    {
      id: "demo-place-1",
      name: query,
      address: `${location}, India`,
      location: { label: location, lat: null, lng: null },
      coordinates: null,
      googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`,
      websiteUri: null,
      imageUri: null,
      cuisines: "Restaurant",
      nationalPhoneNumber: null,
      regularOpeningHours: [],
      summary,
      google: {
        source: "Google",
        status: hasGoogleKey ? "provider_error" : "demo",
        rating: null,
        reviewCount: null,
        reviewSnippet,
        reviews: [],
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`,
      },
    },
  ];
}

function buildFallbackPlaceDetails(placeId, failureReason = "") {
  const hasGoogleKey = Boolean(getGooglePlacesApiKey());
  return {
    id: placeId,
    name: "Dine Wise Demo Result",
    address: "India",
    location: { label: "India", lat: null, lng: null },
    coordinates: null,
    googleMapsUri: "https://www.google.com/maps",
    websiteUri: null,
    nationalPhoneNumber: null,
    regularOpeningHours: [],
    cuisines: "Restaurant",
    summary: hasGoogleKey
      ? "Google data is temporarily unavailable. Check Places API enablement and API key restrictions in Google Cloud."
      : "Configure GOOGLE_PLACES_NEW_API_KEY (or GOOGLE_PLACES_API_KEY) to load live Google data.",
    imageUri: null,
    google: {
      source: "Google",
      status: hasGoogleKey ? "provider_error" : "demo",
      rating: null,
      reviewCount: null,
      reviewSnippet: hasGoogleKey
        ? `Google provider unavailable. ${failureReason || "Please verify API access."}`
        : "Google Places API (New) key not configured.",
      reviews: [],
      url: "https://www.google.com/maps",
    },
  };
}

function serveStatic(requestPath, res) {
  const safePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.join(PUBLIC_DIR, path.normalize(safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 403, "Forbidden");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      return sendText(res, 404, "Not found");
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(data);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  res.end(text);
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!Object.prototype.hasOwnProperty.call(process.env, key) || !String(process.env[key] || "").trim()) {
      process.env[key] = value;
    }
  }
}

function readEnv(key) {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

function getGooglePlacesApiKey() {
  return readEnv("GOOGLE_PLACES_NEW_API_KEY") || readEnv("GOOGLE_PLACES_API_KEY");
}

const warnThrottleState = new Map();

function warnWithThrottle(key, message, cooldownMs = 45000) {
  const now = Date.now();
  const last = warnThrottleState.get(key) || 0;
  if (now - last >= cooldownMs) {
    console.warn(message);
    warnThrottleState.set(key, now);
  }
}

function getLocationLabel(address) {
  if (!address) {
    return "India";
  }

  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join(", ") : address;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toNumberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function safeErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload.error ? payload.error.message || JSON.stringify(payload.error) : JSON.stringify(payload);
  } catch (_error) {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function findPlatformPage(platform, name, location, address) {
  const domain = platform === "swiggy" ? "swiggy.com" : "zomato.com";
  const searchQuery = `${name} ${location} ${address} site:${domain}`;
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, {
    headers: buildBrowserHeaders("https://html.duckduckgo.com"),
  });

  if (!response.ok) {
    throw new Error(`Search lookup failed with ${response.status}`);
  }

  const html = await response.text();
  const results = parseDuckDuckGoResults(html, domain);
  return results[0] || null;
}

function parseDuckDuckGoResults(html, domain) {
  const matches = [];
  const resultRegex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>|<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>)([\s\S]*?)(?:<\/a>|<\/div>)/gi;
  let match;

  while ((match = resultRegex.exec(html)) !== null) {
    const url = decodeDuckDuckGoUrl(decodeHtmlEntities(match[1]));
    if (!url || !url.includes(domain)) {
      continue;
    }

    matches.push({
      url,
      title: stripTags(match[2]),
      snippet: stripTags(match[3]),
    });
  }

  if (matches.length) {
    return matches;
  }

  const looseRegex = /href="([^"]+)"/gi;
  while ((match = looseRegex.exec(html)) !== null) {
    const url = decodeDuckDuckGoUrl(decodeHtmlEntities(match[1]));
    if (url && url.includes(domain) && !matches.some((item) => item.url === url)) {
      matches.push({ url, title: "", snippet: "" });
    }
  }

  return matches;
}

function decodeDuckDuckGoUrl(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/l/?")) {
    try {
      const redirectUrl = new URL(`https://duckduckgo.com${url}`);
      const target = redirectUrl.searchParams.get("uddg");
      return target ? decodeURIComponent(target) : null;
    } catch (_error) {
      return null;
    }
  }

  return url;
}

function extractRatingFromHtml(platform, html) {
  const cleanHtml = typeof html === "string" ? html : "";
  const normalized = decodeHtmlEntities(cleanHtml);
  const jsonLd = extractAggregateRatingFromJsonLd(normalized);
  if (jsonLd.rating !== null || jsonLd.reviewCount !== null) {
    return jsonLd;
  }

  const metaRating = matchFirstNumber(normalized, [
    /ratingValue["':\s>]+([0-9](?:\.[0-9])?)/i,
    /Rated\s*([0-9](?:\.[0-9])?)\s*(?:\/\s*5)?/i,
    /([0-9](?:\.[0-9])?)\s*(?:stars?|star rating|\/5)/i,
  ]);
  const metaReviewCount = matchFirstInteger(normalized, [
    /reviewCount["':\s>]+([0-9][0-9,]*)/i,
    /([0-9][0-9,]*)\s+ratings/i,
    /([0-9][0-9,]*)\s+reviews/i,
  ]);

  const reviewSnippet = extractSnippet(normalized, platform);

  return {
    rating: metaRating,
    reviewCount: metaReviewCount,
    reviewSnippet,
  };
}

function extractAggregateRatingFromJsonLd(html) {
  const scriptRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      const payload = JSON.parse(raw);
      const entries = Array.isArray(payload) ? payload : [payload];

      for (const entry of entries) {
        const found = walkForAggregateRating(entry);
        if (found.rating !== null || found.reviewCount !== null) {
          return found;
        }
      }
    } catch (_error) {
      continue;
    }
  }

  return {
    rating: null,
    reviewCount: null,
    reviewSnippet: "",
  };
}

function walkForAggregateRating(node) {
  if (!node || typeof node !== "object") {
    return { rating: null, reviewCount: null, reviewSnippet: "" };
  }

  if (node.aggregateRating && typeof node.aggregateRating === "object") {
    return {
      rating: parseNumber(node.aggregateRating.ratingValue),
      reviewCount: parseInteger(node.aggregateRating.reviewCount || node.aggregateRating.ratingCount),
      reviewSnippet: typeof node.description === "string" ? node.description : "",
    };
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") {
      const found = Array.isArray(value)
        ? value.map(walkForAggregateRating).find((item) => item.rating !== null || item.reviewCount !== null)
        : walkForAggregateRating(value);

      if (found && (found.rating !== null || found.reviewCount !== null)) {
        return found;
      }
    }
  }

  return { rating: null, reviewCount: null, reviewSnippet: "" };
}

function extractSnippet(html, platform) {
  const text = stripTags(html).replace(/\s+/g, " ").trim();
  const terms = platform === "swiggy"
    ? ["rating", "delivery", "restaurant"]
    : ["rating", "reviews", "restaurant"];

  for (const term of terms) {
    const index = text.toLowerCase().indexOf(term);
    if (index !== -1) {
      return text.slice(index, index + 180).trim();
    }
  }

  return text.slice(0, 180).trim();
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

function matchFirstNumber(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseNumber(match[1]);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
}

function matchFirstInteger(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseInteger(match[1]);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
}

function parseNumber(value) {
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value) {
  const parsed = Number.parseInt(String(value).replace(/,/g, "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildBrowserHeaders(referer) {
  return {
    "accept-language": "en-IN,en-US;q=0.9,en;q=0.8",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    referer,
  };
}
