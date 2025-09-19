let map;
let destinationCoords;
let markersGroup; // group for bounds
const opentripmapKey = "5ae2e3f221c38a28845f05b6e22d2aad9f679149daff8ec505253a68"; // <-- Replace with your OpenTripMap key
const orsKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA2ZDYyYzdmNGMzNjRhNDliYjRmZjI3ZjRjNzgxOGU2IiwiaCI6Im11cm11cjY0In0="; // <-- Replace with your OpenRouteService key

// --- Helper: fetch nearby hotels ---
async function fetchNearbyHotels(lat, lon) {
  if (!lat || !lon) return [];
  const radius = 50000; // in meters
  const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&kinds=accomodations&limit=10&apikey=${opentripmapKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.features || [];
  } catch (e) {
    console.error("Hotels fetch failed:", e);
    return [];
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get("lat"));
  const lon = parseFloat(params.get("lon"));
  const placeName = params.get("name");

  destinationCoords = [lat, lon];
  markersGroup = L.featureGroup();

  // Initialize map
  map = L.map("map").setView(destinationCoords, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  // Destination marker
  const destMarker = L.marker(destinationCoords)
    .bindPopup(`<b>${placeName}</b>`)
    .addTo(map);

  markersGroup.addLayer(destMarker);

  showRoute();
  loadHotels(lat, lon);
});

// ✅ Get user's current location
async function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => resolve([pos.coords.latitude, pos.coords.longitude]),
        err => reject(err)
      );
    } else {
      reject("Geolocation not supported");
    }
  });
}

// ✅ Show route from current location → destination (ORS + fallback)
async function showRoute() {
  try {
    const start = await getCurrentLocation();
    const end = destinationCoords;

    // User marker (blue dot)
    const userMarker = L.marker(start, {
      icon: L.icon({
        iconUrl:
          "https://maps.gstatic.com/intl/en_us/mapfiles/markers2/measle_blue.png",
        iconSize: [12, 12]
      })
    })
      .bindPopup("<b>You are here</b>")
      .addTo(map);

    markersGroup.addLayer(userMarker);

    // Request route from OpenRouteService
    const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
    const body = {
      coordinates: [
        [start[1], start[0]], // [lon, lat]
        [end[1], end[0]]
      ]
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": orsKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error("ORS route request failed");

    const data = await res.json();

    if (data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
      L.polyline(coords, { color: "blue", weight: 5 }).addTo(map);
    } else {
      console.warn("No route found, drawing straight line.");
      L.polyline([start, end], { color: "red", dashArray: "5,5" }).addTo(map);
    }

    // Fit map to all markers
    map.fitBounds(markersGroup.getBounds(), { padding: [50, 50] });
  } catch (err) {
    console.error("Route error:", err);
    alert("Could not load route. Showing straight line instead.");
    const start = await getCurrentLocation().catch(() => null);
    if (start) {
      L.polyline([start, destinationCoords], { color: "red", dashArray: "5,5" }).addTo(map);
      map.fitBounds(markersGroup.getBounds(), { padding: [50, 50] });
    }
  }
}

// ✅ Load and display hotels (list + map markers)
// ✅ Load and display hotels (markers with booking links)
async function loadHotels(lat, lon) {
  try {
    const hotels = await fetchNearbyHotels(lat, lon);

    if (!hotels || hotels.length === 0) {
      console.log("No nearby hotels found.");
      return;
    }

    hotels.forEach(h => {
      const [hlon, hlat] = h.geometry.coordinates;
      const name = h.properties.name || "Unnamed Hotel";

      // Encode hotel name for URL
      const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(name)}`;

      // Add marker with clickable popup
      const hotelMarker = L.marker([hlat, hlon], { icon: hotelIcon })
        .addTo(map)
        .bindPopup(
          `<b>${name}</b><br>
           <a href="${bookingUrl}" target="_blank" style="color:blue;">Book this hotel</a>`
        );

      markersGroup.addLayer(hotelMarker);

      // Optional: if you want clicking the marker (not just the popup link) to redirect:
      hotelMarker.on("click", () => {
        window.open(bookingUrl, "_blank");
      });
    });

    // Fit map to include all markers
    if (markersGroup.getLayers().length > 0) {
      map.fitBounds(markersGroup.getBounds(), { padding: [50, 50] });
    }
  } catch (err) {
    console.error("Hotels error:", err);
  }
}


// ✅ Custom hotel icon
const hotelIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/139/139899.png", // bed icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});
let navWatcherId = null;
let navRouteLayer = null;
let userNavMarker = null;

// ✅ Start/stop navigation mode
function startNavigation() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported by your browser.");
    return;
  }

  // Stop navigation if already running
  if (navWatcherId) {
    navigator.geolocation.clearWatch(navWatcherId);
    navWatcherId = null;

    if (navRouteLayer) {
      map.removeLayer(navRouteLayer);
      navRouteLayer = null;
    }
    if (userNavMarker) {
      map.removeLayer(userNavMarker);
      userNavMarker = null;
    }

    alert("Navigation stopped.");
    return;
  }

  alert("Navigation started. Tracking your location...");

  navWatcherId = navigator.geolocation.watchPosition(
    async pos => {
      const userLoc = [pos.coords.latitude, pos.coords.longitude];

      // ✅ Move or create user marker
      if (userNavMarker) {
        userNavMarker.setLatLng(userLoc);
      } else {
        userNavMarker = L.marker(userLoc, {
          icon: L.icon({
            iconUrl: "https://maps.gstatic.com/intl/en_us/mapfiles/markers2/measle_blue.png",
            iconSize: [18, 18]
          })
        })
          .bindPopup("<b>You are here</b>")
          .addTo(map);
      }

      // ✅ Fetch new route to destination
      try {
        const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
        const body = {
          coordinates: [
            [userLoc[1], userLoc[0]], // [lon, lat]
            [destinationCoords[1], destinationCoords[0]]
          ]
        };

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": orsKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);

          // ✅ Replace old route with new one
          if (navRouteLayer) {
            map.removeLayer(navRouteLayer);
          }
          navRouteLayer = L.polyline(coords, { color: "green", weight: 6 }).addTo(map);

          // Keep map centered on user while navigating
          map.setView(userLoc, 15);
        }
      } catch (err) {
        console.error("Navigation error:", err);
      }
    },
    err => {
      console.error("Navigation tracking failed:", err);
      alert("Could not track your location.");
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
  );
}

// ✅ Hook button click
document.addEventListener("DOMContentLoaded", () => {
  const navBtn = document.getElementById("navigateBtn");
  if (navBtn) {
    navBtn.addEventListener("click", startNavigation);
  }
});
