/**
 * Karnataka Weather Warning Map Dashboard
 * Core Frontend Logic & Multi-Dataset Manager
 */

// Application State
const state = {
  currentDataset: 'may19', // 'may19' or 'may22'
  currentDay: 1, // Day 1 to 7 (used for may19)
  isPlaying: false,
  playInterval: null,
  selectedDistrict: null,
  selectedCustomName: null,
  geojsonCache: null,
  geojsonLayer: null,
  map: null,
  districtsList: [],
  forecastDate19: '26-May-2026',   // Updated dynamically from forecast_data.json
  forecastDate22: '26-May-2026'    // Updated dynamically from forecast_data.json
};

// Global variables for admin customization storage
let customMay22 = null;
let customMay19 = null;

function parseDateString(dateStr) {
  const cleanStr = dateStr.replace(/[\/\.]/g, "-");
  const parts = cleanStr.split("-");
  if (parts.length < 3) return new Date();
  
  let day = parseInt(parts[0], 10);
  let monthStr = parts[1];
  let year = parseInt(parts[2], 10);
  if (year < 100) year += 2000;
  
  let month = 0;
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const matchedMonthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
  
  if (matchedMonthIndex !== -1) {
    month = matchedMonthIndex;
  } else {
    month = parseInt(monthStr, 10) - 1;
  }
  
  return new Date(year, month, day);
}

function formatDateToString(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

const datesMapping = {};

function updateDatesMapping(startDateStr) {
  const startDate = parseDateString(startDateStr);
  for (let d = 1; d <= 7; d++) {
    const currentDate = new Date(startDate.getTime());
    currentDate.setDate(startDate.getDate() + (d - 1));
    
    const nextDate = new Date(currentDate.getTime());
    nextDate.setDate(currentDate.getDate() + 1);
    
    const suffix = (day) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
      }
    };
    
    const formattedCurrent = formatDateToString(currentDate);
    const dayOfMonthNext = nextDate.getDate();
    
    datesMapping[d] = {
      date: formattedCurrent,
      label: `Day ${d} (Forecast valid to ${dayOfMonthNext}${suffix(dayOfMonthNext)} 08:30 IST)`
    };
  }

  // Update slider ticks dynamically with the calculated dates
  const ticks = document.querySelectorAll('.slider-ticks .tick');
  ticks.forEach(t => {
    const d = parseInt(t.getAttribute('data-day'));
    if (datesMapping[d]) {
      const parts = datesMapping[d].date.split("-");
      t.innerText = `Day ${d} (${parts[0]}-${parts[1]})`;
    }
  });
}

function loadCustomDataFromStorage() {
  const local22 = localStorage.getItem('custom_may22_data');
  if (local22) {
    customMay22 = JSON.parse(local22);
  } else {
    customMay22 = null;
  }
  const local19 = localStorage.getItem('custom_may19_data');
  if (local19) {
    customMay19 = JSON.parse(local19);
  } else {
    customMay19 = null;
  }

  // Load dynamically calculated dates for may19 dataset
  const savedDate = localStorage.getItem('custom_may19_forecast_date');
  if (savedDate) {
    updateDatesMapping(savedDate);
  } else {
    updateDatesMapping("19-May-2026");
  }
}

function updateDatasetDropdownLabels() {
  const selectEl = document.getElementById('dataset-select');
  if (!selectEl) return;
  
  const optMay22 = selectEl.querySelector('option[value="may22"]');
  if (optMay22) {
    optMay22.textContent = `${state.forecastDate22} (Day 1 Warnings)`;
  }
  
  const optMay19 = selectEl.querySelector('option[value="may19"]');
  if (optMay19) {
    optMay19.textContent = `${state.forecastDate19} (7-Day Forecast)`;
  }
}

async function loadCustomData() {
  try {
    const response = await fetch('forecast_data.json?_=' + Date.now()); // bypass cache
    if (response.ok) {
      const data = await response.json();
      customMay22 = data.customMay22 || null;
      customMay19 = data.customMay19 || null;
      
      // Store dates in state (source of truth)
      if (data.customMay19ForecastDate) {
        state.forecastDate19 = data.customMay19ForecastDate;
      }
      if (data.customMay22ForecastDate) {
        state.forecastDate22 = data.customMay22ForecastDate;
      }
      
      // Also sync to localStorage
      localStorage.setItem('custom_may19_forecast_date', state.forecastDate19);
      localStorage.setItem('custom_may22_forecast_date', state.forecastDate22);
      
      updateDatesMapping(state.forecastDate19);
    } else {
      // Fallback to localStorage
      loadCustomDataFromStorage();
      const ls19 = localStorage.getItem('custom_may19_forecast_date');
      const ls22 = localStorage.getItem('custom_may22_forecast_date');
      if (ls19) state.forecastDate19 = ls19;
      if (ls22) state.forecastDate22 = ls22;
      updateDatesMapping(state.forecastDate19);
    }
    updateDatasetDropdownLabels();
  } catch (e) {
    console.error("Error loading forecast_data.json, falling back to LocalStorage:", e);
    loadCustomDataFromStorage();
    const ls19 = localStorage.getItem('custom_may19_forecast_date');
    const ls22 = localStorage.getItem('custom_may22_forecast_date');
    if (ls19) state.forecastDate19 = ls19;
    if (ls22) state.forecastDate22 = ls22;
    updateDatesMapping(state.forecastDate19);
    updateDatasetDropdownLabels();
  }
}

// May 22, 2026 Weather Warnings Dataset (from screenshots)
const may22Data = {
  // Coastal Karnataka
  "DAKSHINA KANNADA": { intensity: "L/M", warning: "Coastal TSH", probability: "VERY LIKELY", code: "L/M TSH", level: "blue" },
  "UDUPI": { intensity: "L/M", warning: "Coastal TSH", probability: "VERY LIKELY", code: "L/M TSH", level: "blue" },
  "UTTARA KANNADA": { intensity: "L/M", warning: "Coastal TSH", probability: "VERY LIKELY", code: "L/M TSH", level: "blue" },
  
  // North Interior Karnataka
  "BAGALKOTE": { intensity: "Heavy Rain + Hail", warning: "GR + GW 50-60 kmph", probability: "VERY LIKELY", code: "H + GR + GW", level: "red" },
  "BELAGAVI": { intensity: "Heavy Rain + Hail", warning: "GR + GW 50-60 kmph", probability: "VERY LIKELY", code: "H + GR + GW", level: "red" },
  "BIDAR": { intensity: "Dry", warning: "NIL", probability: "NIL", code: "Dry", level: "grey" },
  "DHARWAD": { intensity: "Heavy Rain + Hail", warning: "GR + GW 50-60 kmph", probability: "VERY LIKELY", code: "H + GR + GW", level: "red" },
  "GADAG": { intensity: "Heavy Rain + Hail", warning: "GR + GW 50-60 kmph", probability: "VERY LIKELY", code: "H + GR + GW", level: "red" },
  "HAVERI": { intensity: "L/M Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "L/M + GW", level: "yellow" },
  "KALABURGI": { intensity: "Dry", warning: "NIL", probability: "NIL", code: "Dry", level: "grey" },
  "KOPPAL": { intensity: "L/M Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "L/M + GW", level: "yellow" },
  "RAICHUR": { intensity: "L/M Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "L/M + GW", level: "yellow" },
  "VIJAYAPURA": { intensity: "L/M Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "L/M + GW", level: "yellow" },
  "YADGIR": { intensity: "Dry", warning: "NIL", probability: "NIL", code: "Dry", level: "grey" },
  
  // South Interior Karnataka
  "BALLARI": { intensity: "L/M Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "L/M + GW", level: "yellow" },
  "VIJAYANAGARA": { intensity: "L/M Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "L/M + GW", level: "yellow" },
  "BENGALURU RURAL": { intensity: "Heavy Rain", warning: "Gusty Winds 40-50 kmph", probability: "VERY LIKELY", code: "Heavy + GW", level: "orange" },
  "BENGALURU URBAN": { intensity: "Heavy Rain", warning: "Gusty Winds 40-50 kmph", probability: "VERY LIKELY", code: "Heavy + GW", level: "orange" },
  "CHAMARAJANAGAR": { intensity: "L/M Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "L/M + GW", level: "yellow" },
  "CHIKKABALLAPURA": { intensity: "Heavy Rain", warning: "Gusty Winds 40-50 kmph", probability: "VERY LIKELY", code: "Heavy + GW", level: "orange" },
  "CHIKKAMAGALURU": { intensity: "Light Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "Light + GW", level: "green-yellow" },
  "CHITRADURGA": { intensity: "Light Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "Light + GW", level: "green-yellow" },
  "DAVANGERE": { intensity: "L/M Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "L/M + GW", level: "yellow" },
  "HASSAN": { intensity: "Heavy Rain", warning: "Gusty Winds 40-50 kmph", probability: "VERY LIKELY", code: "Heavy + GW", level: "orange" },
  "KODAGU": { intensity: "Light Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "Light + GW", level: "green-yellow" },
  "KOLAR": { intensity: "Heavy Rain", warning: "Gusty Winds 40-50 kmph", probability: "VERY LIKELY", code: "Heavy + GW", level: "orange" },
  "MANDYA": { intensity: "Light Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "Light + GW", level: "green-yellow" },
  "MYSURU": { intensity: "Heavy Rain", warning: "Gusty Winds 40-50 kmph", probability: "VERY LIKELY", code: "Heavy + GW", level: "orange" },
  "RAMANAGARA": { intensity: "Light Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "Light + GW", level: "green-yellow" },
  "SHIVAMOGGA": { intensity: "Light Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "Light + GW", level: "green-yellow" },
  "TUMAKURU": { intensity: "L/M Rain", warning: "Gusty Winds 30-40 kmph", probability: "VERY LIKELY", code: "L/M + GW", level: "yellow" }
};

// Color palettes
const colorScale = {
  red: "#d32f2f",
  orange: "#e65100",
  yellow: "#fbc02d",
  yellowDark: "#c69214",
  greenYellow: "#4caf50",
  greenYellowDark: "#2e7d32",
  blue: "#1976d2",
  grey: "#90a4ae",
  greyDark: "#546e7a"
};

// Helper: Map May 19 data keys to HSL warning indexes (0 to 3)
function getWarningIndex(intensity, warning) {
  if (!intensity || intensity === 'DRY' || warning === 'NIL') return 0;
  
  const intensityUpper = intensity.toUpperCase();
  const warningUpper = warning.toUpperCase();
  
  if (intensityUpper.includes('EXH') || warningUpper.includes('EXH') || warningUpper.includes('S HW') || warningUpper.includes('RED')) {
    return 3; // Red
  }
  if (intensityUpper.includes('H(R+)') || intensityUpper.includes('VH(') || warningUpper.includes('R+') || warningUpper.includes('ORANGE')) {
    return 2; // Orange
  }
  if (intensityUpper.includes('L/M') || warningUpper.includes('TSH') || warningUpper.includes('GW') || warningUpper.includes('YELLOW')) {
    return 1; // Yellow
  }
  return 0; // Grey / Nil
}

// Translate warnings index to HSL colors for may19 timeline
function getWarningColorHSL(index) {
  switch (index) {
    case 3: return colorScale.red;
    case 2: return colorScale.orange;
    case 1: return colorScale.yellowDark;
    case 0:
    default: return colorScale.greyDark;
  }
}

// Capitalize district names nicely
function capitalizeName(name) {
  if (!name) return "";
  return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Get district level styling details based on active dataset
function getDistrictData(matchedName, fallbackName) {
  if (state.currentDataset === 'may22') {
    const key = matchedName || fallbackName.toUpperCase();
    
    // Read from custom admin data first if present
    if (customMay22 && customMay22[key]) {
      return customMay22[key];
    }
    return may22Data[key] || { intensity: "Dry", warning: "NIL", probability: "NIL", code: "Dry", level: "grey" };
  } else {
    // Return May 19 data for current selected Day
    if (!state.geojsonCache) return null;
    
    const dayKey = `day${state.currentDay}`;
    let dayData = null;
    
    // Read from custom admin data first if present
    if (customMay19 && customMay19[matchedName] && customMay19[matchedName][dayKey]) {
      dayData = customMay19[matchedName][dayKey];
    } else {
      const feat = state.geojsonCache.features.find(f => f.properties.matched_name === matchedName);
      if (feat) {
        dayData = feat.properties.forecast[dayKey];
      }
    }
    
    if (!dayData) return { intensity: "DRY", warning: "NIL", probability: "NIL", code: "Dry", level: "grey" };
    
    const idx = getWarningIndex(dayData.intensity, dayData.warning);
    
    // Map idx to level
    let level = "grey";
    let code = "Dry";
    if (idx === 3) { level = "red"; code = "ExH + Hail"; }
    else if (idx === 2) { level = "orange"; code = "Heavy + GW"; }
    else if (idx === 1) { 
      // If Coastal division, badge is Blue L/M TSH
      const coastal = ["DAKSHINA KANNADA", "UDUPI", "UTTARA KANNADA"];
      if (coastal.includes(matchedName)) {
        level = "blue";
        code = "L/M TSH";
      } else {
        level = "yellow";
        code = "L/M + GW";
      }
    }
    
    return {
      intensity: dayData.intensity || "DRY",
      warning: dayData.warning || "NIL",
      probability: dayData.probability || "NIL",
      code: code,
      level: level
    };
  }
}

// Styling rules for map polygons
function getFeatureStyle(feature) {
  const props = feature.properties;
  const data = getDistrictData(props.matched_name, props.district);
  
  let fillCol = colorScale.grey;
  if (data && colorScale[data.level]) {
    fillCol = colorScale[data.level];
  } else if (data && data.level === 'green-yellow') {
    fillCol = colorScale.greenYellow;
  }
  
  const isSelected = state.selectedDistrict && 
                      state.selectedDistrict.properties.cartodb_id === props.cartodb_id;
                      
  return {
    fillColor: fillCol,
    fillOpacity: isSelected ? 0.85 : 0.65,
    color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
    weight: isSelected ? 2.5 : 1.2,
    dashArray: isSelected ? '' : '3',
    className: 'district-polygon'
  };
}

// Helper to get tooltip HTML
function getTooltipHTML(props, data) {
  let lvlText = "No Alert";
  let txtCol = colorScale.greyDark;
  if (data.level === 'red') { lvlText = "Red · Warning"; txtCol = colorScale.red; }
  else if (data.level === 'orange') { lvlText = "Orange · Alert"; txtCol = colorScale.orange; }
  else if (data.level === 'yellow') { lvlText = "Yellow · Watch"; txtCol = colorScale.yellowDark; }
  else if (data.level === 'green-yellow') { lvlText = "Green-Yellow · Watch"; txtCol = colorScale.greenYellowDark; }
  else if (data.level === 'blue') { lvlText = "Blue · Watch"; txtCol = colorScale.blue; }

  return `
    <div class="custom-tooltip">
      <div class="tooltip-title">${capitalizeName(props.district)}</div>
      <div class="tooltip-row">
        <span class="tooltip-lbl">Level:</span>
        <span class="tooltip-val" style="color: ${txtCol}">${lvlText}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-lbl">Badge:</span>
        <span class="tooltip-val">${data.code}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-lbl">Warning:</span>
        <span class="tooltip-val">${data.warning}</span>
      </div>
    </div>
  `;
}

// Tooltip binders
function onEachFeature(feature, layer) {
  const props = feature.properties;
  const data = getDistrictData(props.matched_name, props.district);
  
  layer.bindTooltip(getTooltipHTML(props, data), {
    sticky: true,
    direction: 'auto',
    className: 'leaflet-tooltip-own'
  });

  layer.on({
    mouseover: function(e) {
      const l = e.target;
      if (!(state.selectedDistrict && state.selectedDistrict.properties.cartodb_id === props.cartodb_id)) {
        l.setStyle({
          fillOpacity: 0.8,
          color: '#ffffff',
          weight: 1.8
        });
      }
    },
    mouseout: function(e) {
      const l = e.target;
      if (!(state.selectedDistrict && state.selectedDistrict.properties.cartodb_id === props.cartodb_id)) {
        state.geojsonLayer.resetStyle(l);
      }
    },
    click: function(e) {
      selectDistrict(feature, layer);
    }
  });
}

// Map layer styling and tooltip update helper (in-place)
function updateMapData() {
  if (!state.geojsonLayer) return;

  state.geojsonLayer.eachLayer(layer => {
    const props = layer.feature.properties;
    const data = getDistrictData(props.matched_name, props.district);
    
    // Update style
    const style = getFeatureStyle(layer.feature);
    layer.setStyle(style);
    
    // Update tooltip content
    if (layer.getTooltip()) {
      layer.setTooltipContent(getTooltipHTML(props, data));
    }
  });

  // Restore selection outlines and open tooltip programmatically
  if (state.selectedDistrict) {
    state.geojsonLayer.eachLayer(layer => {
      if (layer.feature.properties.cartodb_id === state.selectedDistrict.properties.cartodb_id) {
        layer.setStyle({
          fillOpacity: 0.85,
          color: '#ffffff',
          weight: 2.5
        });
        
        if (layer.openTooltip) {
          setTimeout(() => {
            layer.openTooltip();
          }, 50);
        }
      }
    });
  }
}

// Set active district selections
function selectDistrict(feature, layer, customName = null) {
  state.selectedDistrict = feature;
  state.selectedCustomName = customName; // Save to state to restore on day changes
  
  // Refresh map outlines
  state.geojsonLayer.setStyle(getFeatureStyle);
  
  if (layer && layer.getBounds) {
    state.map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 8.5 });
    
    // Smooth interaction: Open tooltip programmatically on map select
    if (layer.openTooltip) {
      layer.openTooltip();
    }
  }

  // Update Detail Sidebar Card
  displayDistrictDetails(feature, customName);
  
  // Highlight row in regional tables and scroll it into view
  const highlightKey = customName || feature.properties.matched_name || feature.properties.district.toUpperCase();
  highlightTableRow(highlightKey);
}

// Side-by-side Table highlight scrolling
function highlightTableRow(matchedKey) {
  // Clear other selections
  document.querySelectorAll('.col-row').forEach(row => {
    row.classList.remove('selected-row');
  });

  const rowId = `row-${matchedKey.replace(/\s+/g, '-')}`;
  const targetRow = document.getElementById(rowId);
  if (targetRow) {
    targetRow.classList.add('selected-row');
    // Smooth scroll inside container
    targetRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// Render the detailed sidebar statistics cards
function displayDistrictDetails(feature, customName = null) {
  const props = feature.properties;
  const matchedName = customName || props.matched_name;
  const data = getDistrictData(matchedName, props.district);

  document.getElementById('detail-hint').style.display = 'none';
  const detailCard = document.getElementById('district-detail-card');
  detailCard.style.display = 'flex';

  let title = capitalizeName(matchedName || props.district);
  if (matchedName === "BALLARI" || matchedName === "VIJAYANAGARA") {
    title = `Ballari & Vijayanagara`;
  }
  document.getElementById('detail-name').innerText = title;

  // Region label
  let division = "Karnataka Sub-Division";
  const coastal = ["DAKSHINA KANNADA", "UDUPI", "UTTARA KANNADA"];
  const northInterior = ["BAGALKOTE", "BELAGAVI", "BIDAR", "DHARWAD", "GADAG", "HAVERI", "KALABURGI", "KOPPAL", "RAICHUR", "VIJAYAPURA", "YADGIR"];
  
  if (coastal.includes(matchedName)) {
    division = "Coastal Karnataka";
  } else if (northInterior.includes(matchedName)) {
    division = "North Interior Karnataka";
  } else {
    division = "South Interior Karnataka";
  }
  document.getElementById('detail-region').innerText = division;

  // Styling Details card
  const activeBox = document.getElementById('detail-active-box');
  activeBox.className = `active-warning-box warn-level-${data.level}`;

  const badge = document.getElementById('detail-warning-badge');
  badge.innerText = data.level.toUpperCase();

  document.getElementById('detail-intensity').innerText = data.intensity;
  document.getElementById('detail-hazard').innerText = data.warning;
  document.getElementById('detail-probability').innerText = data.probability;

  // Toggle Micro trend list (only relevant in May 19 7-day timeline mode)
  const trendContainer = document.getElementById('detail-trend-container');
  if (state.currentDataset === 'may19') {
    trendContainer.style.display = 'block';
    buildMicroTimeline(props);
  } else {
    trendContainer.style.display = 'none';
  }
}

// Generate the small trend circles
function buildMicroTimeline(props) {
  const container = document.getElementById('micro-timeline');
  container.innerHTML = '';
  const matchedName = props.matched_name;
  
  for (let d = 1; d <= 7; d++) {
    // Prefer customMay19 data (from uploaded PDF) over GeoJSON default
    let dayData = {};
    if (customMay19 && customMay19[matchedName] && customMay19[matchedName][`day${d}`]) {
      dayData = customMay19[matchedName][`day${d}`];
    } else {
      dayData = (props.forecast || {})[`day${d}`] || {};
    }
    
    const idx = getWarningIndex(dayData.intensity, dayData.warning);
    const dateLabel = datesMapping[d] ? datesMapping[d].date : `Day ${d}`;
    
    const dot = document.createElement('div');
    dot.className = `timeline-dot ${d === state.currentDay ? 'active' : ''}`;
    dot.title = `${dateLabel}: ${dayData.intensity || 'DRY'} | ${dayData.warning || 'NIL'}`;
    
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      setDay(d);
    });

    dot.innerHTML = `
      <div class="dot-indicator val-${idx}"></div>
      <span class="dot-day">D${d}</span>
    `;
    container.appendChild(dot);
  }
}

// Dynamic Counts Card calculations
function updateStatistics() {
  const allDistricts = [
    "BAGALKOTE","BALLARI","BELAGAVI","BENGALURU RURAL","BENGALURU URBAN","BIDAR",
    "CHAMARAJANAGAR","CHIKKABALLAPURA","CHIKKAMAGALURU","CHITRADURGA","DAKSHINA KANNADA",
    "DAVANGERE","DHARWAD","GADAG","HASSAN","HAVERI","KALABURGI","KODAGU","KOLAR",
    "KOPPAL","MANDYA","MYSURU","RAICHUR","RAMANAGARA","SHIVAMOGGA","TUMAKURU",
    "UDUPI","UTTARA KANNADA","VIJAYANAGARA","VIJAYAPURA","YADGIR"
  ];

  if (state.currentDataset === 'may22') {
    // Dynamically count from customMay22 (loaded from PDF)
    let red = 0, orange = 0, yellow = 0, grey = 0, blue = 0;
    allDistricts.forEach(name => {
      const d = (customMay22 && customMay22[name]) ? customMay22[name] : null;
      if (!d) { grey++; return; }
      if (d.level === 'red') red++;
      else if (d.level === 'orange') orange++;
      else if (d.level === 'yellow') yellow++;
      else if (d.level === 'blue') blue++;
      else grey++;
    });

    document.getElementById('card-red-val').innerText = red;
    document.getElementById('card-orange-val').innerText = orange;
    document.getElementById('card-yellow-val').innerText = yellow + blue;
    document.getElementById('card-grey-val').innerText = grey;

    document.getElementById('card-red-lbl').innerText = "Red · Heavy + Hail";
    document.getElementById('card-orange-lbl').innerText = "Orange · Heavy Rain";
    document.getElementById('card-yellow-lbl').innerText = "Yellow/Blue · Moderate";
    document.getElementById('card-grey-lbl').innerText = "Dry · No Warning";
  } else {
    // Dynamically count for selected Day from customMay19 first, then GeoJSON
    const coastal = ["DAKSHINA KANNADA", "UDUPI", "UTTARA KANNADA"];
    let red = 0, orange = 0, yellow = 0, grey = 0;
    const dayKey = `day${state.currentDay}`;

    allDistricts.forEach(name => {
      if (coastal.includes(name)) return; // skip coastal in count

      let dayData = null;
      if (customMay19 && customMay19[name] && customMay19[name][dayKey]) {
        dayData = customMay19[name][dayKey];
      } else if (state.geojsonCache) {
        const feat = state.geojsonCache.features.find(f => f.properties.matched_name === name);
        if (feat && feat.properties.forecast) {
          dayData = feat.properties.forecast[dayKey];
        }
      }

      const idx = dayData ? getWarningIndex(dayData.intensity, dayData.warning) : 0;
      if (idx === 3) red++;
      else if (idx === 2) orange++;
      else if (idx === 1) yellow++;
      else grey++;
    });

    document.getElementById('card-red-val').innerText = red;
    document.getElementById('card-orange-val').innerText = orange;
    document.getElementById('card-yellow-val').innerText = yellow;
    document.getElementById('card-grey-val').innerText = grey;

    document.getElementById('card-red-lbl').innerText = "Red · Extreme Threat";
    document.getElementById('card-orange-lbl').innerText = "Orange · High Threat";
    document.getElementById('card-yellow-lbl').innerText = "Yellow · Watch alert";
    document.getElementById('card-grey-lbl').innerText = "Dry · Normal";
  }
}

// Generate columns dynamic district listings matching screenshot layout
function renderRegionalTables() {
  const coastalContainer = document.getElementById('coastal-rows-container');
  const northContainer = document.getElementById('north-rows-container');
  const southContainer = document.getElementById('south-rows-container');

  coastalContainer.innerHTML = '';
  northContainer.innerHTML = '';
  southContainer.innerHTML = '';

  const coastalList = ["DAKSHINA KANNADA", "UDUPI", "UTTARA KANNADA"];
  const northList = ["BAGALKOTE", "BELAGAVI", "BIDAR", "DHARWAD", "GADAG", "HAVERI", "KALABURGI", "KOPPAL", "RAICHUR", "VIJAYAPURA", "YADGIR"];
  
  // Note: Vijayanagara is listed in South Interior in user screenshot. Ballari is also listed there.
  const southList = ["BALLARI", "VIJAYANAGARA", "BENGALURU RURAL", "BENGALURU URBAN", "CHAMARAJANAGAR", "CHIKKABALLAPURA", "CHIKKAMAGALURU", "CHITRADURGA", "DAVANGERE", "HASSAN", "KODAGU", "KOLAR", "MANDYA", "MYSURU", "RAMANAGARA", "SHIVAMOGGA", "TUMAKURU"];

  // Render lists helper
  function buildList(list, container) {
    // Sort names alphabetically
    const sorted = [...list].sort((a,b) => capitalizeName(a).localeCompare(capitalizeName(b)));

    sorted.forEach(matchedName => {
      const data = getDistrictData(matchedName, matchedName);
      
      const row = document.createElement('div');
      row.className = 'col-row';
      row.id = `row-${matchedName.replace(/\s+/g, '-')}`;
      
      // Select bullet dot color class
      let dotColor = colorScale[data.level] || colorScale.grey;
      if (data.level === 'green-yellow') dotColor = colorScale.greenYellow;

      // Handle custom text badge colors
      let badgeClass = `pill-${data.level}`;

      row.innerHTML = `
        <div class="row-district-info color-${data.level}">
          <span class="row-dot" style="background-color: ${dotColor}"></span>
          ${capitalizeName(matchedName)}
        </div>
        <span class="warning-pill ${badgeClass}">${data.code}</span>
      `;

      // Click to select and focus on map
      row.addEventListener('click', () => {
        if (!state.geojsonCache) return;
        
        // Find corresponding geometry
        // Note: Vijayanagara matches Ballari geometry
        let targetKey = matchedName;
        if (matchedName === "VIJAYANAGARA") targetKey = "BALLARI";

        const feature = state.geojsonCache.features.find(f => f.properties.matched_name === targetKey);
        if (feature) {
          let targetLayer = null;
          state.geojsonLayer.eachLayer(layer => {
            if (layer.feature.properties.cartodb_id === feature.properties.cartodb_id) {
              targetLayer = layer;
            }
          });
          selectDistrict(feature, targetLayer, matchedName);
        }
      });

      container.appendChild(row);
    });
  }

  buildList(coastalList, coastalContainer);
  buildList(northList, northContainer);
  buildList(southList, southContainer);

  // Set selected state on table rows if a district is highlighted
  if (state.selectedDistrict) {
    const highlightKey = state.selectedCustomName || state.selectedDistrict.properties.matched_name || state.selectedDistrict.properties.district.toUpperCase();
    highlightTableRow(highlightKey);
  }

  // Bind scroll indicators
  setupScrollIndicators();
}

// Arrow indicator visibilities inside columns
function setupScrollIndicators() {
  const northCol = document.getElementById('north-rows-container');
  const southCol = document.getElementById('south-rows-container');
  const northInd = document.getElementById('north-scroll-indicator');
  const southInd = document.getElementById('south-scroll-indicator');

  function checkScroll(el, ind) {
    if (el.scrollHeight > el.clientHeight) {
      // If scrolled to bottom, hide arrow
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        ind.style.opacity = '0';
      } else {
        ind.style.opacity = '0.8';
      }
    } else {
      ind.style.opacity = '0';
    }
  }

  northCol.addEventListener('scroll', () => checkScroll(northCol, northInd));
  southCol.addEventListener('scroll', () => checkScroll(southCol, southInd));

  // Initial check after rendering
  setTimeout(() => {
    checkScroll(northCol, northInd);
    checkScroll(southCol, southInd);
  }, 100);
}

// Map layer rendering helper
function renderMapData() {
  if (state.geojsonLayer) {
    state.map.removeLayer(state.geojsonLayer);
  }
  state.geojsonLayer = L.geoJSON(state.geojsonCache, {
    style: getFeatureStyle,
    onEachFeature: onEachFeature
  }).addTo(state.map);

  // Restore selection outlines and open tooltip programmatically after map redrawing
  if (state.selectedDistrict) {
    state.geojsonLayer.eachLayer(layer => {
      if (layer.feature.properties.cartodb_id === state.selectedDistrict.properties.cartodb_id) {
        // Re-apply style highlight
        layer.setStyle({
          fillOpacity: 0.85,
          color: '#ffffff',
          weight: 2.5
        });
        
        // Restore active tooltip open state on map
        if (layer.openTooltip) {
          setTimeout(() => {
            layer.openTooltip();
          }, 50);
        }
      }
    });
  }
}

// Set active timeline Day (May 19 mode)
function setDay(dayNum) {
  state.currentDay = parseInt(dayNum);
  
  const slider = document.getElementById('day-slider');
  slider.value = state.currentDay;

  // Make sure datesMapping is up to date
  if (!datesMapping[state.currentDay]) {
    updateDatesMapping(state.forecastDate19);
  }

  const dateInfo = datesMapping[state.currentDay];
  document.getElementById('active-date-display').innerText = dateInfo.date;
  document.getElementById('active-day-display').innerText = `Day ${state.currentDay} Forecast`;

  // Update dashboard subtitle with this day's date
  const subtitle = document.getElementById('dashboard-subtitle');
  if (subtitle) {
    subtitle.innerText = `7-Day Forecast · Day ${state.currentDay} · ${dateInfo.date} · Issued on ${state.forecastDate19}`;
  }

  document.querySelectorAll('.slider-ticks .tick').forEach(t => {
    if (parseInt(t.getAttribute('data-day')) === state.currentDay) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  // Re-render components (in-place if already loaded)
  if (state.geojsonLayer) {
    updateMapData();
  } else if (state.geojsonCache) {
    renderMapData();
  }
  updateStatistics();
  renderRegionalTables();

  if (state.selectedDistrict) {
    displayDistrictDetails(state.selectedDistrict, state.selectedCustomName);
  }
}

// Dynamic Dataset selector
function setDataset(datasetName) {
  state.currentDataset = datasetName;
  
  const controls = document.getElementById('map-controls-panel');
  const title = document.getElementById('dashboard-title');
  const subtitle = document.getElementById('dashboard-subtitle');
  const selectEl = document.getElementById('dataset-select');
  if (selectEl) selectEl.value = datasetName;

  if (datasetName === 'may22') {
    // Day-1 Single Snapshot Mode
    controls.style.display = 'none';
    title.innerText = "IMD Karnataka Weather Warnings";
    subtitle.innerText = `Forecast valid from 0830 IST · ${state.forecastDate22} · Issued by India Meteorological Department`;
    
    // Stop timeline playback
    if (state.isPlaying) togglePlayback();
    
    if (state.geojsonLayer) {
      updateMapData();
    } else if (state.geojsonCache) {
      renderMapData();
    }
    updateStatistics();
    renderRegionalTables();
  } else {
    // 7-Day Timeline Mode
    controls.style.display = 'block';
    title.innerText = "IMD Karnataka Forecast Trend";
    updateDatesMapping(state.forecastDate19);
    subtitle.innerText = `7-Day Forecast Cycle · Issued on ${state.forecastDate19} · India Meteorological Department`;
    
    setDay(state.currentDay);
  }

  if (state.selectedDistrict) {
    displayDistrictDetails(state.selectedDistrict, state.selectedCustomName);
  }
}

// Playback animation toggle
function togglePlayback() {
  const btn = document.getElementById('play-pause-btn');
  
  if (state.isPlaying) {
    state.isPlaying = false;
    clearInterval(state.playInterval);
    btn.innerHTML = '<i class="fa-solid fa-play"></i>';
    showToast("Animation paused");
  } else {
    state.isPlaying = true;
    btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    showToast("Playing 7-day forecast cycle");

    state.playInterval = setInterval(() => {
      let nextDay = state.currentDay + 1;
      if (nextDay > 7) nextDay = 1;
      setDay(nextDay);
    }, 1600);
  }
}

// Search input autocompletes
function setupSearch() {
  const searchInput = document.getElementById('district-search');
  const suggestionsBox = document.getElementById('search-suggestions');
  const clearBtn = document.getElementById('clear-search');

  function showSuggestions(val) {
    const allDistricts = [...state.districtsList];
    if (!allDistricts.some(d => d.name === "VIJAYANAGARA")) {
      allDistricts.push({
        name: "VIJAYANAGARA",
        cleanName: "Vijayanagara",
        matchedName: "BALLARI",
        featureId: 104 // Bellary feature ID
      });
    }

    // Sort allDistricts alphabetically by cleanName
    allDistricts.sort((a, b) => a.cleanName.localeCompare(b.cleanName));

    let matches = allDistricts;
    if (val) {
      matches = allDistricts.filter(d => 
        d.cleanName.toLowerCase().includes(val) || 
        d.name.toLowerCase().includes(val)
      );
    }

    if (matches.length > 0) {
      suggestionsBox.innerHTML = '';
      matches.forEach(match => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerText = match.cleanName;
        div.addEventListener('click', () => {
          let targetKey = match.matchedName || match.name;
          if (targetKey === "VIJAYANAGARA") targetKey = "BALLARI";
          
          const feature = state.geojsonCache.features.find(f => f.properties.matched_name === targetKey);
          if (feature) {
            let targetLayer = null;
            state.geojsonLayer.eachLayer(layer => {
              if (layer.feature.properties.cartodb_id === feature.properties.cartodb_id) {
                targetLayer = layer;
              }
            });
            
            searchInput.value = match.cleanName;
            suggestionsBox.style.display = 'none';
            clearBtn.style.display = 'block';
            selectDistrict(feature, targetLayer, match.name);
          }
        });
        suggestionsBox.appendChild(div);
      });
      suggestionsBox.style.display = 'block';
    } else {
      suggestionsBox.innerHTML = '<div class="suggestion-item" style="color:var(--text-tertiary);cursor:default;">No matches found</div>';
      suggestionsBox.style.display = 'block';
    }
  }

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    clearBtn.style.display = val ? 'block' : 'none';
    showSuggestions(val);
  });

  searchInput.addEventListener('focus', () => {
    const val = searchInput.value.trim().toLowerCase();
    showSuggestions(val);
  });

  searchInput.addEventListener('click', () => {
    const val = searchInput.value.trim().toLowerCase();
    showSuggestions(val);
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    suggestionsBox.style.display = 'none';
    clearBtn.style.display = 'none';
    searchInput.focus();
  });

  document.addEventListener('click', (e) => {
    if (e.target !== searchInput && e.target !== suggestionsBox && !suggestionsBox.contains(e.target)) {
      suggestionsBox.style.display = 'none';
    }
  });
}

// Export simplified GeoJSON
function exportGeoJSON() {
  if (!state.geojsonCache) return;

  const exportData = JSON.parse(JSON.stringify(state.geojsonCache));
  
  exportData.features.forEach(f => {
    const props = f.properties;
    const data = getDistrictData(props.matched_name, props.district);
    
    f.properties.forecast_source = state.currentDataset === 'may22' ? "May 22 Warnings" : "May 19 Timeline";
    if (state.currentDataset === 'may19') {
      f.properties.active_day = state.currentDay;
      f.properties.forecast_date = datesMapping[state.currentDay].date;
    } else {
      f.properties.forecast_date = "22-May-2026";
    }
    
    f.properties.rain_intensity = data.intensity;
    f.properties.weather_warning = data.warning;
    f.properties.probability = data.probability;
    f.properties.alert_badge = data.code;
    f.properties.warning_level = data.level;

    delete f.properties.forecast;
    delete f.properties.vijayanagara_forecast;
  });

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  const filenameDate = state.currentDataset === 'may22' ? "may22" : `may19_day${state.currentDay}`;
  link.download = `karnataka_weather_warnings_${filenameDate}.geojson`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast("GeoJSON exported successfully!");
}

// Export Map View as Image
function exportMapImage() {
  const mapElement = document.getElementById('map');
  showToast("Preparing image. Please wait...");

  const controlsToHide = document.querySelectorAll('.leaflet-control-zoom, .leaflet-control-attribution');
  controlsToHide.forEach(el => el.style.opacity = '0');

  setTimeout(() => {
    html2canvas(mapElement, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#080a10',
      scale: 2
    }).then(canvas => {
      controlsToHide.forEach(el => el.style.opacity = '1');

      const link = document.createElement('a');
      const filenameDate = state.currentDataset === 'may22' ? "may22" : `may19_day${state.currentDay}`;
      link.download = `karnataka_weather_map_${filenameDate}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Map image saved successfully!");
    }).catch(err => {
      console.error("Map image export error:", err);
      controlsToHide.forEach(el => el.style.opacity = '1');
      showToast("Failed to save image due to security restrictions.", true);
    });
  }, 300);
}

// Floating Toast Notification
function showToast(message, isError = false) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  const icon = isError ? 'fa-solid fa-circle-xmark' : 'fa-solid fa-circle-check';
  toast.innerHTML = `<i class="${icon} toast-icon" style="color:${isError ? '#ef4444' : 'var(--accent)'}"></i> ${message}`;
  toast.style.borderColor = isError ? '#ef4444' : 'var(--accent)';

  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Bind event hooks
function setupEventListeners() {
  // Timeline slider
  const slider = document.getElementById('day-slider');
  slider.addEventListener('input', (e) => {
    setDay(e.target.value);
  });

  // Ticks click
  document.querySelectorAll('.slider-ticks .tick').forEach(t => {
    t.addEventListener('click', () => {
      setDay(t.getAttribute('data-day'));
    });
  });

  // Playback btn
  document.getElementById('play-pause-btn').addEventListener('click', togglePlayback);

  // Exporters
  document.getElementById('export-geojson-btn').addEventListener('click', exportGeoJSON);
  document.getElementById('export-image-btn').addEventListener('click', exportMapImage);

  // Dataset dropdown selector
  document.getElementById('dataset-select').addEventListener('change', (e) => {
    setDataset(e.target.value);
  });

  // Spacebar shortcuts toggle playback
  document.addEventListener('keydown', (e) => {
    if (e.code === "Space" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "SELECT") {
      e.preventDefault();
      if (state.currentDataset === 'may19') {
        togglePlayback();
      }
    }
  });
}

// Initialise Application
async function init() {
  // Set up leaflet map
  initMap();
  
  // Fetch boundary data
  try {
    const response = await fetch('karnataka_districts_with_forecast.geojson');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    state.geojsonCache = await response.json();
    
    // Sort and extract list for searches
    state.districtsList = state.geojsonCache.features.map(f => ({
      name: f.properties.district,
      cleanName: capitalizeName(f.properties.district),
      matchedName: f.properties.matched_name,
      featureId: f.properties.cartodb_id
    })).sort((a, b) => a.cleanName.localeCompare(b.cleanName));

    // Run setup
    setupSearch();
    setupEventListeners();
    
    // Set default dataset
    setDataset('may19');
    
  } catch (error) {
    console.error("Failed to load map data:", error);
    showToast("Error loading GeoJSON map data. Ensure files are running on a server.", true);
  }
}

// Initialize Leaflet
function initMap() {
  state.map = L.map('map', {
    center: [14.85, 76.15],
    zoom: 7.2,
    minZoom: 6,
    maxZoom: 10,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
    crossOrigin: 'anonymous'
  }).addTo(state.map);
}

// Trigger initialiser on load, loading custom warning storage first
window.addEventListener('DOMContentLoaded', async () => {
  await loadCustomData();
  init();
});
