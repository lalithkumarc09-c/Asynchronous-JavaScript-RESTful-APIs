# WeatherPulse | Real-Time Weather Dashboard

A dynamic, modern real-time Weather Dashboard built with **Asynchronous JavaScript** and **RESTful APIs**, fulfilling all core academic and production requirements:
- **Asynchronous Data Fetching**: Utilizes the modern `fetch()` API and `async/await` syntax.
- **Comprehensive Error Handling**: Structured `try...catch...finally` blocks with HTTP response status validation, network offline checks, and graceful UI feedback.
- **Complex Nested JSON Parsing**: Extracts deeply nested properties, units, and array collections from REST API payloads.
- **Search & Filter Functionality**: City search with keyboard shortcuts, quick-selection chips, dynamic search history via `localStorage`, and browser GPS geolocation.

---

## 🚀 Key Features & Architectural Breakdown

### 1. Fetching Real-Time Data using `async/await` and `fetch()`
All network interactions are structured using asynchronous functions returning Promises:
```javascript
async function fetchCityCoordinates(cityName) {
  const encodedCity = encodeURIComponent(cityName.trim());
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=1&language=en&format=json`;

  const response = await fetch(url);

  // Validate HTTP status
  if (!response.ok) {
    throw new Error(`Geocoding service returned HTTP status ${response.status}`);
  }

  const data = await response.json();
  // ...
  return primaryResult;
}
```

### 2. Comprehensive Error Handling
The application guards against real-world network and logical failure modes:
1. **Network Offline Detection**: Checks `navigator.onLine` and catches `TypeError: Failed to fetch`.
2. **HTTP Status Validation**: Ensures `response.ok` is verified before attempting `.json()` deserialization.
3. **Invalid / Not Found Queries**: Checks whether `data.results` is empty or undefined and displays clear user guidance.
4. **Input Validation**: Prevents empty/whitespace submissions.
5. **Geolocation Permission Checks**: Handles denied, unavailable, or timed-out browser GPS requests.
6. **Guaranteed UI Cleanup**: The `finally` block ensures loading spinners dismiss regardless of request outcome.

### 3. Parsing Complex Nested JSON Objects
The Open-Meteo REST API returns a multi-level JSON structure. The dashboard extracts and renders:
- **Current Conditions**: `data.current.temperature_2m`, `data.current.relative_humidity_2m`, `data.current.apparent_temperature`
- **Wind Vector**: `data.current.wind_speed_10m`, `data.current.wind_direction_10m`
- **Atmospheric Conditions**: `data.current.surface_pressure`, `data.current.precipitation`
- **Dynamic Forecast Arrays**: Loops through parallel daily arrays (`data.daily.time[]`, `data.daily.temperature_2m_max[]`, `data.daily.temperature_2m_min[]`, `data.daily.weather_code[]`) to dynamically render 5-day outlook cards into the DOM.

### 4. Interactive Live Search & User Controls
- **City Search**: Type any city name and press Enter or click Search.
- **Quick Pick Chips**: One-click weather reports for major global hubs (London, New York, Tokyo, Paris, Dubai, Sydney).
- **Recent Searches**: Automatically records the last 5 searched cities in browser `localStorage`.
- **GPS Location Detection**: Retrieves current coordinates via `navigator.geolocation` and reverse-geocodes them.
- **Unit Toggle**: Dynamically toggle between Metric (°C, km/h, mm) and Imperial (°F, mph, in) with immediate re-fetching.
- **Raw JSON Inspector**: Embedded educational expandable viewer showing the live REST payload and endpoint URL.

---

## 📂 Project Structure

```text
weather-dashboard/
├── index.html        # Semantic HTML5 structure and accessible markup
├── style.css         # Modern glassmorphic dark theme, CSS Grid & Flexbox
├── app.js            # Asynchronous JavaScript fetch pipelines & DOM rendering
└── README.md         # Comprehensive documentation & setup instructions
```

---

## 🛠️ How to Run Locally

### Option 1: Direct Browser Launch
Simply double-click the `index.html` file in your file explorer to open it in Google Chrome, Microsoft Edge, Firefox, or Safari.

### Option 2: Live Server (Recommended)
If using VS Code:
1. Right-click `index.html`.
2. Select **"Open with Live Server"**.

Alternatively, via any standard static HTTP server:
```bash
# Using Python
python -m http.server 8000

# Or using npx serve
npx serve
```
Then visit `http://localhost:8000` in your web browser.

---

## 💡 Notes on REST API Provider

This implementation uses **Open-Meteo** (`open-meteo.com`) and **OpenStreetMap Nominatim**:
- **Zero API Key Requirement**: Works out-of-the-box immediately without needing an API key or email verification delays.
- **CORS-Enabled**: Native browser `fetch()` support without proxy servers.
- **High Accuracy**: European Centre for Medium-Range Weather Forecasts (ECMWF) and NOAA models.

### *Alternative: OpenWeatherMap Implementation*
If your curriculum requires OpenWeatherMap specifically, replace the API URLs in `app.js`:
```javascript
const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';
const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric`;

const response = await fetch(url);
if (!response.ok) {
  if (response.status === 404) throw new Error('City not found in OpenWeatherMap directory.');
  throw new Error(`API error: ${response.status}`);
}
const data = await response.json();
// data.main.temp, data.main.humidity, data.wind.speed
```
