/**
 * WeatherPulse - Asynchronous JavaScript & RESTful APIs Weather Dashboard
 * 
 * Core Features:
 * 1. Fetch real-time data using the modern Fetch API and async/await
 * 2. Comprehensive error handling for network, HTTP, and data-validation failures
 * 3. Parse and dynamically render complex nested JSON objects
 * 4. Search functionality to retrieve weather by city name & GPS location
 */

'use strict';

// ============================================================================
// CONFIGURATION & STATE
// ============================================================================

const CONFIG = {
  GEOCODING_API_URL: 'https://geocoding-api.open-meteo.com/v1/search',
  REVERSE_GEO_URL: 'https://nominatim.openstreetmap.org/reverse',
  WEATHER_API_URL: 'https://api.open-meteo.com/v1/forecast',
  STORAGE_KEY_RECENTS: 'weatherpulse_recent_cities',
  MAX_RECENT_SEARCHES: 5,
  DEFAULT_CITY: 'London'
};

const state = {
  currentUnit: 'celsius', // 'celsius' or 'fahrenheit'
  lastLocation: null,     // { name, country, latitude, longitude, timezone }
  lastRawResponse: null,  // Cached raw JSON for inspection
  isLoading: false
};

// Weather Code mapping according to WMO (World Meteorological Organization)
const WMO_WEATHER_MAP = {
  0: { description: 'Clear sky', icon: 'fa-sun', color: '#f59e0b' },
  1: { description: 'Mainly clear', icon: 'fa-cloud-sun', color: '#f59e0b' },
  2: { description: 'Partly cloudy', icon: 'fa-cloud-sun', color: '#93c5fd' },
  3: { description: 'Overcast', icon: 'fa-cloud', color: '#94a3b8' },
  45: { description: 'Foggy', icon: 'fa-smog', color: '#cbd5e1' },
  48: { description: 'Depositing rime fog', icon: 'fa-smog', color: '#cbd5e1' },
  51: { description: 'Light drizzle', icon: 'fa-cloud-rain', color: '#38bdf8' },
  53: { description: 'Moderate drizzle', icon: 'fa-cloud-rain', color: '#38bdf8' },
  55: { description: 'Dense drizzle', icon: 'fa-cloud-showers-heavy', color: '#3b82f6' },
  56: { description: 'Light freezing drizzle', icon: 'fa-snowflake', color: '#a5f3fc' },
  57: { description: 'Dense freezing drizzle', icon: 'fa-snowflake', color: '#a5f3fc' },
  61: { description: 'Slight rain', icon: 'fa-cloud-sun-rain', color: '#38bdf8' },
  63: { description: 'Moderate rain', icon: 'fa-cloud-showers-heavy', color: '#3b82f6' },
  65: { description: 'Heavy rain', icon: 'fa-cloud-showers-water', color: '#1d4ed8' },
  66: { description: 'Light freezing rain', icon: 'fa-snowflake', color: '#a5f3fc' },
  67: { description: 'Heavy freezing rain', icon: 'fa-snowflake', color: '#a5f3fc' },
  71: { description: 'Slight snow fall', icon: 'fa-snowflake', color: '#e0f2fe' },
  73: { description: 'Moderate snow fall', icon: 'fa-snowflake', color: '#bae6fd' },
  75: { description: 'Heavy snow fall', icon: 'fa-snowflake', color: '#7dd3fc' },
  77: { description: 'Snow grains', icon: 'fa-snowflake', color: '#e0f2fe' },
  80: { description: 'Slight rain showers', icon: 'fa-cloud-rain', color: '#38bdf8' },
  81: { description: 'Moderate rain showers', icon: 'fa-cloud-showers-heavy', color: '#3b82f6' },
  82: { description: 'Violent rain showers', icon: 'fa-cloud-showers-water', color: '#1d4ed8' },
  85: { description: 'Slight snow showers', icon: 'fa-snowflake', color: '#e0f2fe' },
  86: { description: 'Heavy snow showers', icon: 'fa-snowflake', color: '#7dd3fc' },
  95: { description: 'Thunderstorm', icon: 'fa-bolt-lightning', color: '#facc15' },
  96: { description: 'Thunderstorm with slight hail', icon: 'fa-cloud-bolt', color: '#facc15' },
  99: { description: 'Thunderstorm with heavy hail', icon: 'fa-cloud-bolt', color: '#facc15' }
};

// ============================================================================
// DOM ELEMENTS SELECTION
// ============================================================================

const searchForm = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const geoBtn = document.getElementById('geoBtn');
const unitCelsius = document.getElementById('unitCelsius');
const unitFahrenheit = document.getElementById('unitFahrenheit');
const quickChipsList = document.getElementById('quickChipsList');
const recentSearchesWrapper = document.getElementById('recentSearchesWrapper');
const recentSearchesList = document.getElementById('recentSearchesList');

const statusRegion = document.getElementById('statusRegion');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorAlert = document.getElementById('errorAlert');
const errorTitle = document.getElementById('errorTitle');
const errorMessage = document.getElementById('errorMessage');
const dismissErrorBtn = document.getElementById('dismissErrorBtn');

const dashboardContent = document.getElementById('dashboardContent');
const emptyState = document.getElementById('emptyState');

// Dashboard UI Elements
const locationNameEl = document.getElementById('locationName');
const countryCodeEl = document.getElementById('countryCode');
const localTimeDisplayEl = document.getElementById('localTimeDisplay');
const currentTempEl = document.getElementById('currentTemp');
const weatherConditionEl = document.getElementById('weatherCondition');
const feelsLikeTempEl = document.getElementById('feelsLikeTemp');
const mainWeatherIconEl = document.getElementById('mainWeatherIcon');
const heroTempMaxEl = document.getElementById('heroTempMax');
const heroTempMinEl = document.getElementById('heroTempMin');

const humidityValueEl = document.getElementById('humidityValue');
const humidityProgressEl = document.getElementById('humidityProgress');
const humidityQualityEl = document.getElementById('humidityQuality');

const windSpeedValueEl = document.getElementById('windSpeedValue');
const windSpeedUnitEl = document.getElementById('windSpeedUnit');
const windDirectionTextEl = document.getElementById('windDirectionText');
const windCompassIconEl = document.getElementById('windCompassIcon');

const pressureValueEl = document.getElementById('pressureValue');
const pressureStatusEl = document.getElementById('pressureStatus');

const precipitationValueEl = document.getElementById('precipitationValue');
const precipitationUnitEl = document.getElementById('precipitationUnit');
const precipitationSubtextEl = document.getElementById('precipitationSubtext');

const forecastCardsContainer = document.getElementById('forecastCardsContainer');
const rawJsonDisplay = document.getElementById('rawJsonDisplay');
const apiEndpointUrl = document.getElementById('apiEndpointUrl');
const copyJsonBtn = document.getElementById('copyJsonBtn');

// ============================================================================
// ASYNCHRONOUS REST API FUNCTIONS (FETCH & ASYNC/AWAIT)
// ============================================================================

/**
 * 1. Fetch Geographical Coordinates for a given city name
 * Demonstrates: Fetch API, async/await, query parameter encoding, HTTP response checking
 * 
 * @param {string} cityName 
 * @returns {Promise<Object>} Location metadata object
 */
async function fetchCityCoordinates(cityName) {
  // Validate input
  const cleanCity = cityName.trim();
  if (!cleanCity) {
    throw new Error('Please enter a valid city name.');
  }

  const encodedCity = encodeURIComponent(cleanCity);
  const url = `${CONFIG.GEOCODING_API_URL}?name=${encodedCity}&count=1&language=en&format=json`;

  const response = await fetch(url);

  // Validate HTTP status
  if (!response.ok) {
    throw new Error(`Geocoding service returned HTTP status ${response.status} (${response.statusText}).`);
  }

  // Parse JSON response
  const data = await response.json();

  // Validate parsed JSON results
  if (!data.results || data.results.length === 0) {
    throw new Error(`Could not find coordinates for "${cleanCity}". Please verify the spelling and try again.`);
  }

  const primaryResult = data.results[0];

  return {
    name: primaryResult.name,
    country: primaryResult.country_code || primaryResult.country || '',
    latitude: primaryResult.latitude,
    longitude: primaryResult.longitude,
    timezone: primaryResult.timezone || 'auto'
  };
}

/**
 * 2. Fetch Comprehensive Weather Data by Latitude and Longitude
 * Demonstrates: Query params for metric/imperial units, parsing complex nested JSON payload
 * 
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {string} timezone 
 * @param {string} unit ('celsius' | 'fahrenheit')
 * @returns {Promise<Object>} Full weather data response
 */
async function fetchWeatherData(latitude, longitude, timezone = 'auto', unit = 'celsius') {
  const tempUnit = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
  const windUnit = unit === 'fahrenheit' ? 'mph' : 'kmh';
  const precipUnit = unit === 'fahrenheit' ? 'inch' : 'mm';

  const queryParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m'
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum'
    ].join(','),
    temperature_unit: tempUnit,
    wind_speed_unit: windUnit,
    precipitation_unit: precipUnit,
    timezone: timezone || 'auto'
  });

  const fullUrl = `${CONFIG.WEATHER_API_URL}?${queryParams.toString()}`;

  const response = await fetch(fullUrl);

  if (!response.ok) {
    throw new Error(`Weather service returned HTTP ${response.status} (${response.statusText}).`);
  }

  const weatherJson = await response.json();

  return {
    url: fullUrl,
    data: weatherJson
  };
}

/**
 * 3. Reverse Geocode Coordinates to City Name (for GPS Geolocation)
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<Object>} Location metadata
 */
async function reverseGeocodeCoordinates(lat, lon) {
  // Method A: Try BigDataCloud free client reverse geocoding (CORS-friendly, no key required)
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const bdcRes = await fetch(bdcUrl);
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const cityName = bdcData.city || bdcData.locality || bdcData.principalSubdivision;
      if (cityName) {
        return {
          name: cityName,
          country: bdcData.countryCode || '',
          latitude: lat,
          longitude: lon,
          timezone: 'auto'
        };
      }
    }
  } catch (e) {
    console.warn('BigDataCloud reverse geocode attempt:', e);
  }

  // Method B: Fallback to OpenStreetMap Nominatim
  try {
    const url = `${CONFIG.REVERSE_GEO_URL}?lat=${lat}&lon=${lon}&format=json`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      const address = data.address || {};
      const cityName = address.city || address.town || address.village || address.county;
      if (cityName) {
        return {
          name: cityName,
          country: (address.country_code || '').toUpperCase(),
          latitude: lat,
          longitude: lon,
          timezone: 'auto'
        };
      }
    }
  } catch (e) {
    console.warn('Nominatim reverse geocode attempt:', e);
  }

  // Method C: Clean coordinate display fallback
  return {
    name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
    country: '',
    latitude: lat,
    longitude: lon,
    timezone: 'auto'
  };
}

// ============================================================================
// MAIN DASHBOARD ORCHESTRATION PIPELINE
// ============================================================================

/**
 * Main Orchestration function to coordinate geocoding, weather fetching,
 * error handling, and UI updates using async/await and try...catch...finally.
 * 
 * @param {string} cityName 
 */
async function loadWeatherForCity(cityName) {
  if (state.isLoading) return;

  showLoading();
  clearError();

  try {
    // Step 1: Asynchronously resolve city coordinates
    const location = await fetchCityCoordinates(cityName);
    state.lastLocation = location;

    // Step 2: Asynchronously fetch weather data using retrieved coordinates
    const { url, data } = await fetchWeatherData(
      location.latitude,
      location.longitude,
      location.timezone,
      state.currentUnit
    );

    // Step 3: Cache raw response for the JSON inspector
    state.lastRawResponse = { url, data };

    // Step 4: Dynamically parse and render nested JSON data to the DOM
    renderDashboard(location, data);

    // Step 5: Save city to recent searches
    saveRecentSearch(location.name);

  } catch (error) {
    // Comprehensive Error Catching & Categorization
    console.error('Weather dashboard error caught:', error);
    handleDashboardError(error);
  } finally {
    // Always hide loading indicator whether the operation succeeded or failed
    hideLoading();
  }
}

/**
 * Orchestration pipeline for GPS coordinates
 * @param {number} lat 
 * @param {number} lon 
 */
async function loadWeatherForCoords(lat, lon) {
  if (state.isLoading) return;

  showLoading();
  clearError();

  try {
    const location = await reverseGeocodeCoordinates(lat, lon);
    state.lastLocation = location;

    const { url, data } = await fetchWeatherData(
      location.latitude,
      location.longitude,
      location.timezone,
      state.currentUnit
    );

    state.lastRawResponse = { url, data };
    renderDashboard(location, data);
    saveRecentSearch(location.name);

  } catch (error) {
    console.error('Weather GPS coordinate error caught:', error);
    handleDashboardError(error);
  } finally {
    hideLoading();
  }
}

// ============================================================================
// DYNAMIC DOM RENDERING & NESTED JSON PARSING
// ============================================================================

/**
 * Parse complex nested JSON payload and render dashboard components
 * 
 * @param {Object} location 
 * @param {Object} weather 
 */
function renderDashboard(location, weather) {
  // Validate essential nested properties
  if (!weather || !weather.current || !weather.daily) {
    throw new Error('Incomplete weather payload received from REST API.');
  }

  const current = weather.current;
  const currentUnits = weather.current_units || {};
  const daily = weather.daily;

  // 1. Render Location & Date/Time
  locationNameEl.textContent = location.name;
  countryCodeEl.textContent = location.country ? `, ${location.country}` : '';
  localTimeDisplayEl.textContent = formatDateTime(current.time, weather.timezone);

  // 2. Weather Condition & Icon Mapping
  const weatherCode = current.weather_code ?? 0;
  const conditionMeta = WMO_WEATHER_MAP[weatherCode] || { description: 'Clear', icon: 'fa-sun', color: '#f59e0b' };

  weatherConditionEl.textContent = conditionMeta.description;
  mainWeatherIconEl.className = `fa-solid ${conditionMeta.icon} weather-icon`;
  mainWeatherIconEl.style.color = conditionMeta.color;

  // 3. Current Temperature & Feels Like
  const tempUnitSymbol = currentUnits.temperature_2m || '°C';
  currentTempEl.textContent = `${Math.round(current.temperature_2m)}${tempUnitSymbol}`;
  feelsLikeTempEl.textContent = `${Math.round(current.apparent_temperature)}${tempUnitSymbol}`;

  // 4. Daily Min/Max for Today
  if (daily.temperature_2m_max && daily.temperature_2m_max.length > 0) {
    heroTempMaxEl.textContent = `${Math.round(daily.temperature_2m_max[0])}${tempUnitSymbol}`;
    heroTempMinEl.textContent = `${Math.round(daily.temperature_2m_min[0])}${tempUnitSymbol}`;
  }

  // 5. Humidity Metric
  const humidity = current.relative_humidity_2m ?? 0;
  humidityValueEl.textContent = humidity;
  humidityProgressEl.style.width = `${Math.min(100, Math.max(0, humidity))}%`;
  humidityQualityEl.textContent = getHumidityDescription(humidity);

  // 6. Wind Speed & Direction
  const windSpeed = current.wind_speed_10m ?? 0;
  const windUnit = currentUnits.wind_speed_10m || (state.currentUnit === 'fahrenheit' ? 'mph' : 'km/h');
  const windDegree = current.wind_direction_10m ?? 0;

  windSpeedValueEl.textContent = windSpeed.toFixed(1);
  windSpeedUnitEl.textContent = windUnit;
  windDirectionTextEl.textContent = `${getCompassDirection(windDegree)} (${windDegree}°)`;
  windCompassIconEl.style.transform = `rotate(${windDegree}deg)`;

  // 7. Atmospheric Pressure
  const pressure = current.surface_pressure ?? 1013;
  pressureValueEl.textContent = Math.round(pressure);
  pressureStatusEl.textContent = getPressureStatus(pressure);

  // 8. Precipitation
  const precipitation = current.precipitation ?? 0;
  const precipUnit = currentUnits.precipitation || (state.currentUnit === 'fahrenheit' ? 'in' : 'mm');
  precipitationValueEl.textContent = precipitation.toFixed(1);
  precipitationUnitEl.textContent = precipUnit;
  precipitationSubtextEl.textContent = precipitation > 0 
    ? 'Active precipitation recorded' 
    : 'No active precipitation';

  // 9. Render 5-Day Forecast Cards from daily arrays
  renderForecastCards(daily, tempUnitSymbol);

  // 10. Update Raw JSON Inspector
  renderJsonInspector(state.lastRawResponse);

  // Transition UI states
  emptyState.style.display = 'none';
  dashboardContent.style.display = 'flex';
}

/**
 * Dynamically parse nested arrays in daily JSON and render forecast cards
 * 
 * @param {Object} daily 
 * @param {string} tempUnitSymbol 
 */
function renderForecastCards(daily, tempUnitSymbol) {
  forecastCardsContainer.innerHTML = '';

  const daysCount = Math.min(5, daily.time.length);

  for (let i = 0; i < daysCount; i++) {
    const dateStr = daily.time[i];
    const code = daily.weather_code[i];
    const maxTemp = Math.round(daily.temperature_2m_max[i]);
    const minTemp = Math.round(daily.temperature_2m_min[i]);
    const meta = WMO_WEATHER_MAP[code] || { description: 'Fair', icon: 'fa-sun', color: '#f59e0b' };

    const card = document.createElement('div');
    card.className = `forecast-card ${i === 0 ? 'is-today' : ''}`;

    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    card.innerHTML = `
      <span class="forecast-day">${dayName}</span>
      <span class="forecast-date">${formattedDate}</span>
      <i class="fa-solid ${meta.icon} forecast-icon" style="color: ${meta.color}"></i>
      <div class="forecast-temps">
        <span class="forecast-temp-max">${maxTemp}${tempUnitSymbol}</span>
        <span class="forecast-temp-min">${minTemp}${tempUnitSymbol}</span>
      </div>
      <span class="forecast-desc">${meta.description}</span>
    `;

    forecastCardsContainer.appendChild(card);
  }
}

/**
 * Display formatted JSON in the educational inspector
 */
function renderJsonInspector(raw) {
  if (!raw) return;
  apiEndpointUrl.textContent = raw.url;
  rawJsonDisplay.textContent = JSON.stringify(raw.data, null, 2);
}

// ============================================================================
// HELPER & UTILITY FUNCTIONS
// ============================================================================

function formatDateTime(isoString, timezone) {
  try {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    if (timezone && timezone !== 'auto') {
      options.timeZone = timezone;
    }
    return new Date().toLocaleString('en-US', options);
  } catch (e) {
    return new Date().toLocaleString();
  }
}

function getCompassDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degrees % 360) / 22.5);
  return directions[index % 16];
}

function getHumidityDescription(hum) {
  if (hum < 30) return 'Dry air, low humidity';
  if (hum <= 60) return 'Comfortable humidity level';
  if (hum <= 80) return 'Humid atmosphere';
  return 'Very humid & muggy conditions';
}

function getPressureStatus(hPa) {
  if (hPa > 1022) return 'High pressure (Fair weather)';
  if (hPa < 1005) return 'Low pressure (Stormy/Rainy)';
  return 'Normal atmospheric pressure';
}

// ============================================================================
// ERROR & LOADING STATE MANAGEMENT
// ============================================================================

function showLoading() {
  state.isLoading = true;
  loadingIndicator.style.display = 'flex';
}

function hideLoading() {
  state.isLoading = false;
  loadingIndicator.style.display = 'none';
}

function showError(title, message) {
  errorTitle.textContent = title;
  errorMessage.textContent = message;
  errorAlert.style.display = 'flex';
}

function clearError() {
  errorAlert.style.display = 'none';
}

function handleDashboardError(error) {
  let title = 'Unable to Load Weather';
  let message = error.message || 'An unexpected error occurred while communicating with the REST API.';

  // Classify error type
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    title = 'Network Connection Error';
    message = 'Failed to connect to the weather REST API. Please check your internet connection and proxy/CORS settings.';
  }

  showError(title, message);
}

// ============================================================================
// LOCAL STORAGE & RECENT SEARCHES
// ============================================================================

function saveRecentSearch(cityName) {
  if (!cityName || cityName.startsWith('Location (') || cityName.startsWith('Lat:')) {
    return;
  }
  try {
    let recents = getRecentSearches();
    // Filter out duplicates (case insensitive)
    recents = recents.filter(c => c.toLowerCase() !== cityName.toLowerCase());
    // Insert at front
    recents.unshift(cityName);
    // Limit to max items
    recents = recents.slice(0, CONFIG.MAX_RECENT_SEARCHES);

    localStorage.setItem(CONFIG.STORAGE_KEY_RECENTS, JSON.stringify(recents));
    renderRecentSearches();
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function getRecentSearches() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY_RECENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function renderRecentSearches() {
  const recents = getRecentSearches();
  if (recents.length === 0) {
    recentSearchesWrapper.style.display = 'none';
    return;
  }

  recentSearchesList.innerHTML = '';
  recents.forEach(city => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = city;
    chip.addEventListener('click', () => {
      cityInput.value = city;
      loadWeatherForCity(city);
    });
    recentSearchesList.appendChild(chip);
  });

  recentSearchesWrapper.style.display = 'flex';
}

// ============================================================================
// EVENT LISTENERS & INITIALIZATION
// ============================================================================

// Search Form Submission
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = cityInput.value.trim();
  if (!query) {
    showError('Input Required', 'Please enter a city name to search.');
    cityInput.focus();
    return;
  }
  loadWeatherForCity(query);
});

// Clear Search Input Button
cityInput.addEventListener('input', () => {
  clearSearchBtn.style.display = cityInput.value.length > 0 ? 'block' : 'none';
});

clearSearchBtn.addEventListener('click', () => {
  cityInput.value = '';
  clearSearchBtn.style.display = 'none';
  cityInput.focus();
});

// Quick Pick Chips
quickChipsList.addEventListener('click', (e) => {
  const target = e.target.closest('.chip');
  if (target && target.dataset.city) {
    const city = target.dataset.city;
    cityInput.value = city;
    clearSearchBtn.style.display = 'block';
    loadWeatherForCity(city);
  }
});

/**
 * Refresh weather data for the current location (e.g. after switching units)
 */
async function refreshCurrentWeather() {
  if (!state.lastLocation || state.isLoading) return;

  showLoading();
  clearError();

  try {
    const { url, data } = await fetchWeatherData(
      state.lastLocation.latitude,
      state.lastLocation.longitude,
      state.lastLocation.timezone,
      state.currentUnit
    );

    state.lastRawResponse = { url, data };
    renderDashboard(state.lastLocation, data);
  } catch (error) {
    console.error('Weather refresh error caught:', error);
    handleDashboardError(error);
  } finally {
    hideLoading();
  }
}

// Unit Toggle Buttons (°C vs °F)
unitCelsius.addEventListener('click', () => {
  if (state.currentUnit === 'celsius') return;
  state.currentUnit = 'celsius';
  unitCelsius.classList.add('active');
  unitFahrenheit.classList.remove('active');
  refreshCurrentWeather();
});

unitFahrenheit.addEventListener('click', () => {
  if (state.currentUnit === 'fahrenheit') return;
  state.currentUnit = 'fahrenheit';
  unitFahrenheit.classList.add('active');
  unitCelsius.classList.remove('active');
  refreshCurrentWeather();
});

// GPS Geolocation Button
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation Unavailable', 'Your browser does not support GPS geolocation.');
    return;
  }

  showLoading();
  clearError();

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      cityInput.value = '';
      clearSearchBtn.style.display = 'none';
      loadWeatherForCoords(lat, lon);
    },
    (geoError) => {
      hideLoading();
      let msg = 'Failed to retrieve GPS location.';
      if (geoError.code === geoError.PERMISSION_DENIED) {
        msg = 'Location access permission was denied. Please allow location permissions in your browser or search by city name.';
      } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
        msg = 'Location position is currently unavailable.';
      } else if (geoError.code === geoError.TIMEOUT) {
        msg = 'Location request timed out.';
      }
      showError('Location Error', msg);
    },
    { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
  );
});

// Dismiss Error Banner
dismissErrorBtn.addEventListener('click', clearError);

// Copy JSON Button
copyJsonBtn.addEventListener('click', async () => {
  if (!state.lastRawResponse) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(state.lastRawResponse.data, null, 2));
    const originalText = copyJsonBtn.innerHTML;
    copyJsonBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => {
      copyJsonBtn.innerHTML = originalText;
    }, 2000);
  } catch (err) {
    console.warn('Clipboard write failed:', err);
  }
});

// ============================================================================
// INITIAL APP LOAD
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
  renderRecentSearches();
  
  // Pre-load default city on initial launch
  loadWeatherForCity(CONFIG.DEFAULT_CITY);
});
