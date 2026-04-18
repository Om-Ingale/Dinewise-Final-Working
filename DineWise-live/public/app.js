const searchForm = document.getElementById("searchForm");
const queryInput = document.getElementById("queryInput");
const locationInput = document.getElementById("locationInput");
const providerStatus = document.getElementById("providerStatus");
const resultsTitle = document.getElementById("resultsTitle");
const resultsMeta = document.getElementById("resultsMeta");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const resultsGrid = document.getElementById("resultsGrid");
const detailsSection = document.getElementById("detailsSection");
const detailsTitle = document.getElementById("detailsTitle");
const detailsContent = document.getElementById("detailsContent");

initialize();

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runSearch(queryInput.value.trim(), locationInput.value.trim());
});

async function initialize() {
  try {
    const response = await fetch("/api/health");
    const payload = await response.json();
    if (response.ok) {
      renderProviderStatus(payload.providers);
    }
  } catch (_error) {
    providerStatus.textContent = "Provider status unavailable.";
  }
}

async function runSearch(query, location) {
  if (!query) {
    return;
  }

  setLoading(true);
  clearError();
  resultsGrid.innerHTML = "";
  detailsSection.classList.add("hidden");

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location || "India")}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Search failed.");
    }

    renderProviderStatus(payload.providers);
    renderResults(payload);
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

function renderProviderStatus(providers) {
  providerStatus.innerHTML = `
    <strong>Provider status:</strong>
    <span>Google: ${formatProviderState(providers.google)}</span>
    <span>Swiggy: ${formatProviderState(providers.swiggy)}</span>
    <span>Zomato: ${formatProviderState(providers.zomato)}</span>
  `;
}

function renderResults(payload) {
  resultsTitle.textContent = `Results for "${payload.query}"`;
  resultsMeta.textContent = `${payload.total} result${payload.total === 1 ? "" : "s"} around ${payload.location}`;

  if (!payload.results.length) {
    resultsGrid.innerHTML = `<article class="state-card">No restaurants found. Try a different name or city.</article>`;
    return;
  }

  resultsGrid.innerHTML = payload.results.map((restaurant) => {
    const aggregate = restaurant.aggregate.rating !== null
      ? `${restaurant.aggregate.rating.toFixed(1)} / 5`
      : "Unavailable";

    return `
      <article class="result-card">
        <div class="result-card-top">
          <div>
            <p class="card-kicker">${restaurant.cuisines}</p>
            <h4>${escapeHtml(restaurant.name)}</h4>
          </div>
          <div class="aggregate-badge">
            <span>Wise Score</span>
            <strong>${aggregate}</strong>
          </div>
        </div>

        <p class="address">${escapeHtml(restaurant.address)}</p>

        <div class="platform-grid">
          ${renderPlatformTile("Google", restaurant.platforms.google)}
          ${renderPlatformTile("Swiggy", restaurant.platforms.swiggy)}
          ${renderPlatformTile("Zomato", restaurant.platforms.zomato)}
        </div>

        <div class="card-actions">
          <button type="button" data-place-id="${restaurant.id}" class="detail-button">View details</button>
          ${restaurant.googleMapsUri ? `<a href="${restaurant.googleMapsUri}" target="_blank" rel="noreferrer">Open map</a>` : ""}
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".detail-button").forEach((button) => {
    button.addEventListener("click", async () => {
      await loadRestaurant(button.dataset.placeId);
    });
  });
}

async function loadRestaurant(placeId) {
  setLoading(true);
  clearError();

  try {
    const response = await fetch(`/api/restaurant?placeId=${encodeURIComponent(placeId)}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not load restaurant details.");
    }

    renderRestaurantDetails(payload.restaurant);
    renderProviderStatus(payload.providers);
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

function renderRestaurantDetails(restaurant) {
  detailsSection.classList.remove("hidden");
  detailsTitle.textContent = restaurant.name;

  const reviewMarkup = restaurant.reviews.length
    ? restaurant.reviews.map((review) => `
        <article class="review-card">
          <div class="review-head">
            <strong>${escapeHtml(review.author)}</strong>
            <span>${review.rating !== null ? `${review.rating.toFixed(1)} / 5` : "No rating"}</span>
          </div>
          <p>${escapeHtml(review.text || "No review text available.")}</p>
          <small>${escapeHtml(review.relativeTime || "")}</small>
        </article>
      `).join("")
    : `<article class="review-card"><p>No Google review samples available for this restaurant.</p></article>`;

  const hourMarkup = restaurant.regularOpeningHours.length
    ? restaurant.regularOpeningHours.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : `<li>Opening hours unavailable.</li>`;

  detailsContent.innerHTML = `
    <div class="details-grid">
      <section class="details-main">
        <div class="details-hero">
          <div>
            <p class="card-kicker">${escapeHtml(restaurant.cuisines || "Restaurant")}</p>
            <h4>${escapeHtml(restaurant.name)}</h4>
            <p class="address">${escapeHtml(restaurant.address)}</p>
          </div>
          <div class="aggregate-panel">
            <span>Wise Score</span>
            <strong>${restaurant.aggregate.rating !== null ? `${restaurant.aggregate.rating.toFixed(1)} / 5` : "Unavailable"}</strong>
            <small>${escapeHtml(restaurant.aggregate.label)}</small>
          </div>
        </div>

        <p class="summary">${escapeHtml(restaurant.summary || "No editorial summary available.")}</p>

        <div class="platform-grid">
          ${renderPlatformTile("Google", restaurant.platforms.google)}
          ${renderPlatformTile("Swiggy", restaurant.platforms.swiggy)}
          ${renderPlatformTile("Zomato", restaurant.platforms.zomato)}
        </div>

        <div class="info-grid">
          <article>
            <h5>Hours</h5>
            <ul>${hourMarkup}</ul>
          </article>
          <article>
            <h5>Links</h5>
            <ul>
              <li>${restaurant.googleMapsUri ? `<a href="${restaurant.googleMapsUri}" target="_blank" rel="noreferrer">Open in Google Maps</a>` : "Map link unavailable"}</li>
              <li>${restaurant.websiteUri ? `<a href="${restaurant.websiteUri}" target="_blank" rel="noreferrer">Restaurant website</a>` : "Website unavailable"}</li>
              <li>${restaurant.nationalPhoneNumber || "Phone unavailable"}</li>
            </ul>
          </article>
        </div>
      </section>

      <aside class="reviews-column">
        <h5>Review highlights</h5>
        ${reviewMarkup}
      </aside>
    </div>
  `;

  detailsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderPlatformTile(name, platform) {
  const status = platform.status || "unknown";
  const rating = platform.rating !== null ? `${platform.rating.toFixed(1)} / 5` : "Unavailable";
  const reviews = platform.reviewCount !== null ? `${platform.reviewCount} reviews` : "Review count unavailable";

  return `
    <article class="platform-tile ${status}">
      <div class="platform-head">
        <strong>${name}</strong>
        <span>${status.replaceAll("_", " ")}</span>
      </div>
      <p class="platform-rating">${rating}</p>
      <p class="platform-meta">${escapeHtml(reviews)}</p>
      <p class="platform-note">${escapeHtml(platform.reviewSnippet || "No additional context.")}</p>
    </article>
  `;
}

function showError(message) {
  errorState.textContent = message;
  errorState.classList.remove("hidden");
}

function clearError() {
  errorState.textContent = "";
  errorState.classList.add("hidden");
}

function setLoading(isLoading) {
  loadingState.classList.toggle("hidden", !isLoading);
}

function formatProviderState(value) {
  return String(value || "unknown").replaceAll("_", " ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
