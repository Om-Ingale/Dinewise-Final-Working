const CITY = "Mumbai";

// Setup live search listeners
setupSearch('search1', 'suggest1');
setupSearch('search2', 'suggest2');

function setupSearch(inputId, suggestId) {
    const input = document.getElementById(inputId);
    const suggest = document.getElementById(suggestId);

    input.addEventListener('input', async () => {
        const query = input.value.trim();
        if (query.length < 2) {
            suggest.innerHTML = "";
            return;
        }

        try {
            // Hitting backend search endpoint
            const response = await fetch(`http://localhost:8080/restaurants/search?name=${encodeURIComponent(query)}&city=${CITY}`);
            const data = await response.json();

            // Showing live suggestion from backend data
            suggest.innerHTML = `
                <div class="mini-item" onclick="selectRest('${inputId}', '${suggestId}', '${data.name}')">
                    <strong>${data.name}</strong> <small>(${CITY})</small>
                </div>
            `;
        } catch (e) { 
            // Silent catch during typing
        }
    });
}

function selectRest(inputId, suggestId, name) {
    document.getElementById(inputId).value = name;
    document.getElementById(suggestId).innerHTML = "";
}

async function startComparison() {
    const r1 = document.getElementById("search1").value;
    const r2 = document.getElementById("search2").value;

    if (!r1 || !r2) {
        alert("Please enter two restaurants!");
        return;
    }

    try {
        // Calling the specialized compare endpoint in the backend
        const response = await fetch(`http://localhost:8080/restaurants/compare?name1=${encodeURIComponent(r1)}&name2=${encodeURIComponent(r2)}&city=${CITY}`);
        const result = await response.json();

        renderComparison(result.restaurant1, result.restaurant2);
        document.getElementById("result-display").classList.remove("hidden");
    } catch (error) {
        console.error("Connection failed", error);
        alert("Make sure the Spring Boot backend is running!");
    }
}

function renderComparison(d1, d2) {
    const container = document.getElementById("cards-container");
    container.innerHTML = `
        <div class="compare-card">
            <h3>${d1.name}</h3>
            ${createBar("Overall Score", d1.overall)}
            ${createBar("Food Quality", d1.food)}
            ${createBar("Ambience", d1.ambience)}
            ${createBar("Service", d1.service)}
        </div>
        <div class="compare-card">
            <h3>${d2.name}</h3>
            ${createBar("Overall Score", d2.overall)}
            ${createBar("Food Quality", d2.food)}
            ${createBar("Ambience", d2.ambience)}
            ${createBar("Service", d2.service)}
        </div>
    `;
}

function createBar(label, value) {
    // Scales the 0.0-5.0 rating to a 100% width bar
    const percentage = (value / 5) * 100;
    return `
        <div class="bar-item">
            <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                <span>${label}</span><strong>${value.toFixed(1)}</strong>
            </div>
            <div class="bar-bg">
                <div class="bar-fill" style="width:${percentage}%"></div>
            </div>
        </div>
    `;
}