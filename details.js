// --- Helper: get query params ---
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// --- Fetch Wikipedia details ---
async function fetchWikiDetails(title) {
  const q = encodeURIComponent(title);
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages&exintro=true&explaintext=true&titles=${q}&pithumbsize=600&origin=*`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const page = Object.values(data.query.pages)[0];
    if (!page || page.missing) return null;

    return {
      title: page.title,
      extract: page.extract || "No description available.",
      image: page.thumbnail ? page.thumbnail.source : "https://via.placeholder.com/600x400?text=No+Image"
    };
  } catch (e) {
    console.error("Wikipedia fetch failed:", e);
    return null;
  }
}

// --- Fetch nearby hotels ---
async function fetchNearbyHotels(lat, lon) {
  if (!lat || !lon) return [];
  const apiKey = "5ae2e3f221c38a28845f05b6e22d2aad9f679149daff8ec505253a68"; // <-- Replace with your API key
  const radius = 5000; // in meters
  const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&kinds=accomodations&limit=5&apikey=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.features || [];
  } catch (e) {
    console.error("Hotels fetch failed:", e);
    return [];
  }
}

// --- Render the details page ---
async function renderDetails() {
  const container = document.getElementById("detailsContainer");
  if (!container) return;

  const placeName = getQueryParam("name");
  const lat = getQueryParam("lat");
  const lon = getQueryParam("lon");

  if (!placeName || placeName.toLowerCase() === "unnamed") {
    container.innerHTML = "<p>This place has no valid name.</p>";
    return;
  }

  container.innerHTML = "<p>Loading details...</p>";

  // Fetch Wikipedia info
  const details = await fetchWikiDetails(placeName);
  if (!details) {
    container.innerHTML = `<p>Sorry, no Wikipedia info found for <b>${placeName}</b>.</p>`;
    return;
  }

  // Render main info
  container.innerHTML = `
    <h2>${details.title}</h2>
    <img src="${details.image}" alt="${details.title}">
    <p>${details.extract}</p>
    <button id="travelNowBtn">Travel Now</button>
    <div id="hotelsSection"><p>Loading nearby hotels...</p></div>
  `;

  // Travel button
  document.getElementById("travelNowBtn").addEventListener("click", () => {
    window.location.href = `travel.html?name=${encodeURIComponent(details.title)}&lat=${lat}&lon=${lon}`;
  });

  // Fetch and render hotels (if coordinates exist)
  if (lat && lon) {
    const hotels = await fetchNearbyHotels(lat, lon);
    let hotelHTML = "<h3>Nearby Hotels:</h3>";
    if (hotels.length === 0) hotelHTML += "<p>No nearby hotels found.</p>";
    else {
      hotelHTML += "<ul>";
      hotels.forEach(h => hotelHTML += `<li>${h.properties.name || "Unnamed Hotel"}</li>`);
      hotelHTML += "</ul>";
    }
    document.getElementById("hotelsSection").innerHTML = hotelHTML;
  } else {
    document.getElementById("hotelsSection").innerHTML = "<p>Location unknown. Cannot fetch hotels.</p>";
  }
}

// --- Initialize ---
document.addEventListener("DOMContentLoaded", renderDetails);

function fetchInternetRating() {
  const container = document.getElementById("internetStatus");
  if (!container) return;

  // Random latency between 50–400 ms
  const latency = Math.floor(Math.random() * (400 - 50 + 1)) + 50;

  // Random ISP names
  const providers = ["Airtel", "Jio", "Vodafone Idea", "BSNL", "ACT Fibernet"];
  const isp = providers[Math.floor(Math.random() * providers.length)];

  // Pick rating based on latency
  let rating = "Excellent ✅";
  if (latency > 300) rating = "Poor ❌";
  else if (latency > 150) rating = "Fair ⚠";
  else if (latency > 80) rating = "Good 👍";

  container.innerHTML = `
    <h3>Internet Rating</h3>
    <p><b>Provider:</b> ${isp}</p>
    <p><b>Latency:</b> ${latency} ms</p>
    <p><b>Status:</b> ${rating}</p>
  `;
}

fetchInternetRating();


