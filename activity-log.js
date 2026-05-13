(function activityLog() {
  "use strict";

  const STORAGE_KEY = "ecotrack:activityLogs";

  // kg CO2e per kg of food (approximate, widely cited values)
  const FOOD_FACTORS = {
    beef:       { label: "Beef",                kgPerKg: 27,   icon: "🥩" },
    lamb:       { label: "Lamb",                kgPerKg: 24,   icon: "🍖" },
    pork:       { label: "Pork",                kgPerKg: 7,    icon: "🥓" },
    chicken:    { label: "Chicken",             kgPerKg: 6,    icon: "🍗" },
    fish:       { label: "Fish",                kgPerKg: 5,    icon: "🐟" },
    shrimp:     { label: "Shrimp / shellfish",  kgPerKg: 12,   icon: "🍤" },
    cheese:     { label: "Cheese",              kgPerKg: 13.5, icon: "🧀" },
    milk:       { label: "Milk",                kgPerKg: 1.4,  icon: "🥛" },
    yogurt:     { label: "Yogurt",              kgPerKg: 2.2,  icon: "🥣" },
    eggs:       { label: "Eggs",                kgPerKg: 4.5,  icon: "🥚" },
    butter:     { label: "Butter",              kgPerKg: 12,   icon: "🧈" },
    rice:       { label: "Rice",                kgPerKg: 4,    icon: "🍚" },
    pasta:      { label: "Pasta / noodles",     kgPerKg: 1.4,  icon: "🍝" },
    bread:      { label: "Bread",               kgPerKg: 1.4,  icon: "🍞" },
    cereal:     { label: "Cereal / oats",       kgPerKg: 1.6,  icon: "🥣" },
    corn:       { label: "Corn",                kgPerKg: 1.0,  icon: "🌽" },
    tofu:       { label: "Tofu / tempeh",       kgPerKg: 2.0,  icon: "🟫" },
    beans:      { label: "Beans / lentils",     kgPerKg: 0.9,  icon: "🫘" },
    nuts:       { label: "Nuts",                kgPerKg: 0.4,  icon: "🥜" },
    vegetables: { label: "Vegetables",          kgPerKg: 0.4,  icon: "🥦" },
    potato:     { label: "Potato",              kgPerKg: 0.3,  icon: "🥔" },
    tomato:     { label: "Tomato",              kgPerKg: 1.4,  icon: "🍅" },
    fruits:     { label: "Fruits",              kgPerKg: 0.5,  icon: "🍎" },
    banana:     { label: "Banana",              kgPerKg: 0.7,  icon: "🍌" },
    berries:    { label: "Berries",             kgPerKg: 1.5,  icon: "🫐" },
    chocolate:  { label: "Chocolate",           kgPerKg: 19,   icon: "🍫" },
    icecream:   { label: "Ice cream",           kgPerKg: 4.0,  icon: "🍦" },
    coffee:     { label: "Coffee (brewed)",     kgPerKg: 0.4,  icon: "☕" },
    tea:        { label: "Tea",                 kgPerKg: 1.5,  icon: "🍵" },
    soda:       { label: "Soda / soft drink",   kgPerKg: 1.0,  icon: "🥤" },
    beer:       { label: "Beer",                kgPerKg: 1.1,  icon: "🍺" },
  };

  // kg CO2e per passenger-km
  const TRANSPORT_FACTORS = {
    walk:       { label: "Walk",                  kgPerKm: 0,    icon: "🚶" },
    bike:       { label: "Bike",                  kgPerKm: 0,    icon: "🚲" },
    escooter:   { label: "E-scooter / e-bike",    kgPerKm: 0.02, icon: "🛴" },
    train:      { label: "LRT / MRT / train",     kgPerKm: 0.04, icon: "🚆" },
    ev:         { label: "Electric car",          kgPerKm: 0.05, icon: "🔋" },
    jeepney:    { label: "Jeepney",               kgPerKm: 0.08, icon: "🚐" },
    bus:        { label: "Bus",                   kgPerKm: 0.10, icon: "🚌" },
    trike:      { label: "Tricycle",              kgPerKm: 0.10, icon: "🛺" },
    carpool:    { label: "Carpool (3+ riders)",   kgPerKm: 0.07, icon: "👥" },
    motor:      { label: "Motorcycle",            kgPerKm: 0.11, icon: "🏍️" },
    hybrid:     { label: "Hybrid car",            kgPerKm: 0.12, icon: "🚙" },
    car:        { label: "Car (gasoline)",        kgPerKm: 0.19, icon: "🚗" },
    cardiesel:  { label: "Car (diesel)",          kgPerKm: 0.17, icon: "🚙" },
    ridehail:   { label: "Ride-hail (Grab)",      kgPerKm: 0.22, icon: "🚕" },
    taxi:       { label: "Taxi",                  kgPerKm: 0.22, icon: "🚖" },
    flight:     { label: "Domestic flight",       kgPerKm: 0.25, icon: "✈️" },
  };

  const KG_PER_KWH = 0.71;

  // ---------- DOM refs ----------
  const form = document.getElementById("activityLogForm");
  const foodChoice = document.getElementById("foodChoice");
  const foodGrams = document.getElementById("foodGrams");
  const addFoodBtn = document.getElementById("addFoodBtn");
  const foodEntriesEl = document.getElementById("foodEntries");
  const foodEmpty = document.getElementById("foodEmpty");

  const transportChoice = document.getElementById("transportChoice");
  const distanceKm = document.getElementById("distanceKm");
  const addTransportBtn = document.getElementById("addTransportBtn");
  const transportEntriesEl = document.getElementById("transportEntries");
  const transportEmpty = document.getElementById("transportEmpty");

  const electricKwh = document.getElementById("electricKwh");
  const activityNote = document.getElementById("activityNote");
  const resetButton = document.getElementById("resetLogForm");

  const enableFood = document.getElementById("enableFood");
  const enableTransport = document.getElementById("enableTransport");
  const enableElectricity = document.getElementById("enableElectricity");

  const sectionFood = document.getElementById("logSectionFood");
  const sectionTransport = document.getElementById("logSectionTransport");
  const sectionElectricity = document.getElementById("logSectionElectricity");

  const totalEl = document.getElementById("totalFootprint");
  const foodEl = document.getElementById("foodFootprint");
  const transportEl = document.getElementById("transportFootprint");
  const electricEl = document.getElementById("electricFootprint");
  const saveBtn = form.querySelector(".log-save-btn");

  // ---------- State ----------
  let foodEntries = []; // [{ id, key, label, icon, grams, kg }]
  let transportEntries = []; // [{ id, key, label, icon, km, kg }]

  function uid() {
    return `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function numberFrom(input) {
    const value = Number(input && input.value);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function formatKg(value) {
    return `${value.toFixed(1)} kg`;
  }

  // ---------- Entry actions ----------
  function addFood() {
    const key = foodChoice.value;
    const def = FOOD_FACTORS[key];
    const grams = numberFrom(foodGrams);
    if (!def || grams <= 0) {
      if (typeof window.showToast === "function") {
        window.showToast("error", "Pick a food and set a weight greater than 0 g.");
      }
      return;
    }
    const kg = (grams / 1000) * def.kgPerKg;
    foodEntries.push({
      id: uid(),
      key,
      label: def.label,
      icon: def.icon,
      grams,
      kg,
    });
    render();
  }

  function addTransport() {
    const key = transportChoice.value;
    const def = TRANSPORT_FACTORS[key];
    const km = numberFrom(distanceKm);
    if (!def || km <= 0) {
      if (typeof window.showToast === "function") {
        window.showToast("error", "Pick a transport mode and set a distance greater than 0 km.");
      }
      return;
    }
    const kg = km * def.kgPerKm;
    transportEntries.push({
      id: uid(),
      key,
      label: def.label,
      icon: def.icon,
      km,
      kg,
    });
    render();
  }

  function removeEntry(listName, id) {
    if (listName === "food") {
      foodEntries = foodEntries.filter((e) => e.id !== id);
    } else if (listName === "transport") {
      transportEntries = transportEntries.filter((e) => e.id !== id);
    }
    render();
  }

  // ---------- Calculation ----------
  function calculate() {
    const includeFood = enableFood.checked;
    const includeTransport = enableTransport.checked;
    const includeElectricity = enableElectricity.checked;

    const kwh = numberFrom(electricKwh);

    const foodKg = includeFood ? foodEntries.reduce((sum, e) => sum + e.kg, 0) : 0;
    const transportKg = includeTransport ? transportEntries.reduce((sum, e) => sum + e.kg, 0) : 0;
    const electricKg = includeElectricity ? kwh * KG_PER_KWH : 0;
    const totalKg = foodKg + transportKg + electricKg;

    const foodSummary = foodEntries.map((e) => `${e.label} ${e.grams}g`).join(" + ");
    const transportSummary = transportEntries
      .map((e) => `${e.label} ${formatKm(e.km)}`)
      .join(" + ");
    const totalDistanceKm = transportEntries.reduce((sum, e) => sum + e.km, 0);

    return {
      id: `log-${Date.now()}`,
      createdAt: new Date().toISOString(),
      includeFood,
      includeTransport,
      includeElectricity,
      // Detailed arrays
      foodEntries: includeFood ? foodEntries.slice() : [],
      transportEntries: includeTransport ? transportEntries.slice() : [],
      // Backwards-compatible summary fields for dashboard.js
      foodLabel: includeFood && foodSummary ? foodSummary : null,
      foodIcon: includeFood && foodEntries[0] ? foodEntries[0].icon : null,
      transportLabel: includeTransport && transportSummary ? transportSummary : null,
      transportIcon: includeTransport && transportEntries[0] ? transportEntries[0].icon : null,
      distanceKm: includeTransport ? Number(totalDistanceKm.toFixed(2)) : 0,
      electricKwh: includeElectricity ? kwh : 0,
      foodKg,
      transportKg,
      electricKg,
      totalKg,
      note: (activityNote.value || "").trim(),
    };
  }

  function formatKm(value) {
    return `${Number(value).toFixed(value < 10 ? 1 : 0)} km`;
  }

  // ---------- Rendering ----------
  function syncSection(section, enabled) {
    section.classList.toggle("is-disabled", !enabled);
    section.querySelectorAll("input:not([type='checkbox']), select, button.log-add-btn").forEach((field) => {
      field.disabled = !enabled;
    });
    section.querySelectorAll(".log-entry-remove").forEach((btn) => {
      btn.disabled = !enabled;
    });
  }

  function renderFoodEntries() {
    foodEntriesEl.innerHTML = "";
    if (foodEntries.length === 0) {
      foodEmpty.hidden = false;
      return;
    }
    foodEmpty.hidden = true;
    foodEntries.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "log-entry";
      li.innerHTML = `
        <span class="log-entry-icon" aria-hidden="true">${entry.icon}</span>
        <div class="log-entry-body">
          <p class="log-entry-title">${entry.label}</p>
          <p class="log-entry-meta">${entry.grams} g · <strong>${formatKg(entry.kg)} CO₂</strong></p>
        </div>
        <button type="button" class="log-entry-remove" aria-label="Remove ${entry.label}">×</button>
      `;
      li.querySelector(".log-entry-remove").addEventListener("click", () => {
        removeEntry("food", entry.id);
      });
      foodEntriesEl.appendChild(li);
    });
  }

  function renderTransportEntries() {
    transportEntriesEl.innerHTML = "";
    if (transportEntries.length === 0) {
      transportEmpty.hidden = false;
      return;
    }
    transportEmpty.hidden = true;
    transportEntries.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "log-entry";
      li.innerHTML = `
        <span class="log-entry-icon" aria-hidden="true">${entry.icon}</span>
        <div class="log-entry-body">
          <p class="log-entry-title">${entry.label}</p>
          <p class="log-entry-meta">${formatKm(entry.km)} · <strong>${formatKg(entry.kg)} CO₂</strong></p>
        </div>
        <button type="button" class="log-entry-remove" aria-label="Remove ${entry.label}">×</button>
      `;
      li.querySelector(".log-entry-remove").addEventListener("click", () => {
        removeEntry("transport", entry.id);
      });
      transportEntriesEl.appendChild(li);
    });
  }

  function render() {
    syncSection(sectionFood, enableFood.checked);
    syncSection(sectionTransport, enableTransport.checked);
    syncSection(sectionElectricity, enableElectricity.checked);

    renderFoodEntries();
    renderTransportEntries();

    document.querySelectorAll(".calculator-breakdown p").forEach((row) => {
      const cat = row.dataset.row;
      const map = {
        food: enableFood.checked,
        transport: enableTransport.checked,
        electricity: enableElectricity.checked,
      };
      row.classList.toggle("is-disabled", !map[cat]);
    });

    const result = calculate();
    totalEl.textContent = result.totalKg.toFixed(1);
    foodEl.textContent = formatKg(result.foodKg);
    transportEl.textContent = formatKg(result.transportKg);
    electricEl.textContent = formatKg(result.electricKg);

    const anyEnabled =
      enableFood.checked || enableTransport.checked || enableElectricity.checked;
    saveBtn.disabled = !anyEnabled;
    saveBtn.textContent = anyEnabled
      ? "Save activity"
      : "Enable a category to save";
  }

  // ---------- Storage ----------
  function readLogs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveLog(log) {
    const logs = readLogs();
    logs.unshift(log);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 30)));
  }

  // ---------- Wire up ----------
  addFoodBtn.addEventListener("click", addFood);
  addTransportBtn.addEventListener("click", addTransport);

  // Allow Enter inside the food/transport add rows to add the entry instead of submitting the form.
  foodGrams.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFood();
    }
  });
  distanceKm.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTransport();
    }
  });

  [electricKwh, activityNote, enableFood, enableTransport, enableElectricity].forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  resetButton.addEventListener("click", () => {
    foodEntries = [];
    transportEntries = [];
    form.reset();
    enableFood.checked = true;
    enableTransport.checked = true;
    enableElectricity.checked = true;
    render();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (saveBtn.disabled) return;
    saveLog(calculate());
    if (typeof window.showToast === "function") {
      window.showToast("success", "Activity saved. Dashboard updated.");
    }
    window.setTimeout(() => {
      window.location.href = "./overview.html#recentActivities";
    }, 350);
  });

  render();
})();
