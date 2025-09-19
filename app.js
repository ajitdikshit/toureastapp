const tripKey = "5ae2e3f221c38a28845f05b6e22d2aad9f679149daff8ec505253a68"; // replace with your key

// Debounce helper
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Geocode the search query -> returns {lat, lon}
async function geocodeQuery(query) {
  const url = `https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(query)}&apikey=${tripKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Geocode error:", e);
    return null;
  }
}

// Search tourist places around given coords
async function searchPlaces(lat, lon, radius = 20000, limit = 20) {
  const kinds = "natural,cultural,historic";
  const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&limit=${limit}&apikey=${tripKey}&kinds=${kinds}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.features || [];
  } catch (e) {
    console.error("Search error:", e);
    return [];
  }
}

// Fetch Wikipedia image for a place
async function fetchImageWiki(name) {
  const q = encodeURIComponent(name);
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${q}&pithumbsize=400&origin=*`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const pages = data.query.pages;
    const firstPage = Object.values(pages)[0];
    if (firstPage && firstPage.thumbnail) {
      return firstPage.thumbnail.source;
    }
  } catch (e) {
    console.error("Wiki image fetch failed", e);
  }
  return "https://via.placeholder.com/300x200?text=No+Image";
}

// --- Unsplash fallback ---
async function fetchImageUnsplash(name) {
  const UNSPLASH_KEY = "JmtQ4WugtseVaXzln7wP04cwBdX1WF3LCjkYX0uNLhQ"; // Replace with your key
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(name)}&client_id=${UNSPLASH_KEY}&orientation=landscape&per_page=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.small;
    }
  } catch (e) {
    console.error("Unsplash fetch failed", e);
  }
  return "https://via.placeholder.com/300x200?text=No+Image";
}

// Render places to grid
async function renderPlaces() {
  const grid = document.getElementById("placesGrid");
  if (!grid) return;

  const q = document.getElementById("searchBox").value.trim();
  if (!q) {
    grid.innerHTML = "<p>Type a location to search.</p>";
    return;
  }

  grid.innerHTML = "<p>Searching...</p>";

  // Step 1: geocode query
  const geo = await geocodeQuery(q);
  if (!geo || !geo.lat || !geo.lon) {
    grid.innerHTML = `<p>No location found for "${q}".</p>`;
    return;
  }

  // Step 2: search places nearby
  const results = await searchPlaces(geo.lat, geo.lon, 30000, 30);
  if (results.length === 0) {
    grid.innerHTML = `<p>No interesting places found near "${q}".</p>`;
    return;
  }

  grid.innerHTML = "";

  for (const feature of results) {
    const prop = feature.properties;
    const name = prop.name?.trim();

    // Skip unnamed places
    if (!name || name.toLowerCase().startsWith("unnamed")) continue;

    const xid = prop.xid;
    const lat = feature.geometry.coordinates[1];
    const lon = feature.geometry.coordinates[0];

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="https://via.placeholder.com/300x200?text=Loading" alt="${name}">
      <div class="card-body">
        <h3>${name}</h3>
        <div class="category-box">${prop.kinds || ""}</div>
        <button class="btn-add" data-id="${xid}" data-name="${encodeURIComponent(name)}" data-lat="${lat}" data-lon="${lon}">Add to Bucket</button>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      window.location.href = `details.html?xid=${xid}&name=${encodeURIComponent(name)}&lat=${lat}&lon=${lon}`;
    });

    grid.appendChild(card);

    // Async image fetch with Unsplash fallback
    (async () => {
      let imgUrl = await fetchImageWiki(name);
      if (!imgUrl || imgUrl.includes("placeholder")) {
        imgUrl = await fetchImageUnsplash(name);
      }
      const imgEl = card.querySelector("img");
      if (imgEl) imgEl.src = imgUrl;
    })();
  }

  if (grid.innerHTML.trim() === "") {
    grid.innerHTML = "<p>No named places found. Try another location.</p>";
  }
}

// Bucket List + Events
function addToBucket(id, nameEncoded) {
  const name = decodeURIComponent(nameEncoded);
  let bucket = JSON.parse(localStorage.getItem("bucketList")) || [];
  if (!bucket.some((item) => item.id === id)) {
    bucket.push({ id, name });
    localStorage.setItem("bucketList", JSON.stringify(bucket));
  }
  alert(`${name} added to Bucket List`);
  if (document.getElementById("bucketList")) renderBucketList();
}

function renderBucketList() {
  const list = document.getElementById("bucketList");
  if (!list) return;
  list.innerHTML = "";
  let bucket = JSON.parse(localStorage.getItem("bucketList")) || [];
  if (bucket.length === 0) {
    list.innerHTML = "<p>No items in bucket list</p>";
    return;
  }
  bucket.forEach((item, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${item.name}</span> <button class="remove-btn" data-index="${i}">Remove</button>`;
    li.querySelector("button").onclick = () => {
      bucket.splice(i, 1);
      localStorage.setItem("bucketList", JSON.stringify(bucket));
      renderBucketList();
    };
    list.appendChild(li);
  });
}

function addEvent() {
  const titleEl = document.getElementById("eventTitle");
  const placeEl = document.getElementById("eventPlace");
  const dateEl = document.getElementById("eventDate");
  if (!titleEl || !dateEl) return;
  const title = titleEl.value.trim();
  const place = placeEl ? placeEl.value.trim() : "";
  const date = dateEl.value;
  if (!title || !date) return;
  let events = JSON.parse(localStorage.getItem("events")) || [];
  events.push({ title, place, date });
  localStorage.setItem("events", JSON.stringify(events));
  renderEvents();
  titleEl.value = "";
  if (placeEl) placeEl.value = "";
  dateEl.value = "";
}

function renderEvents() {
  
  const list = document.getElementById("eventList");
  if (!list) return;
  list.innerHTML = "";
  let events = JSON.parse(localStorage.getItem("events")) || [];
  if (events.length === 0) {
    list.innerHTML = "<p>No events added</p>";
    return;
  }
  events.forEach((ev, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${ev.title} — ${ev.place || ""} on ${ev.date}</span> <button class="remove-btn" data-index="${i}">Remove</button>`;
    li.querySelector("button").onclick = () => {
      events.splice(i, 1);
      localStorage.setItem("events", JSON.stringify(events));
      renderEvents();
    };
    list.appendChild(li);
  });
}

// --- Initialize app ---
document.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.addEventListener("input", debounce(renderPlaces, 500));
  }
  if (document.getElementById("placesGrid")) renderPlaces();
  if (document.getElementById("bucketList")) renderBucketList();
  if (document.getElementById("eventList")) renderEvents();

  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-add");
    if (!btn) return;
    addToBucket(btn.dataset.id, btn.dataset.name);
  });

  // --- Register service worker ---
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("Service Worker registered"))
      .catch(err => console.error("SW registration failed:", err));
  }
});
