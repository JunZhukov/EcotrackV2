const fs = require("fs");
const p = "home.html";
let h = fs.readFileSync(p, "utf8");
const start = h.indexOf('<div class="missions-progress">');
const cta = h.indexOf('class="missions-cta"');
const end = h.indexOf("</a>", cta) + 4;
if (start < 0 || end < 4) {
  console.error("markers not found", start, end);
  process.exit(1);
}
const replacement = `                <motion class="home-footprint-snapshot">
                  <p class="home-snapshot-value">
                    <span id="homeFootprintTotal">0.0</span>
                    <span class="home-snapshot-unit">kg CO₂</span>
                  </p>
                  <p class="home-snapshot-label">Total footprint from your logs</p>
                </motion>

                <ul class="home-activity-list eco-scroll" id="homeActivityList" aria-label="Recent activity logs"></ul>

                <div class="home-category-bars" id="homeCategoryBars" aria-label="Footprint by category">
                  <div class="home-cat-row" data-cat="food">
                    <span class="home-cat-icon" aria-hidden="true">🥗</span>
                    <div class="home-cat-body">
                      <div class="home-cat-head">
                        <span>Food</span>
                        <strong id="homeCatFood">0.0 kg</strong>
                      </div>
                      <div class="home-cat-track"><div class="home-cat-fill home-cat-fill--food" id="homeCatFoodBar"></div></div>
                    </div>
                  </div>
                  <div class="home-cat-row" data-cat="transport">
                    <span class="home-cat-icon" aria-hidden="true">🚗</span>
                    <div class="home-cat-body">
                      <div class="home-cat-head">
                        <span>Transport</span>
                        <strong id="homeCatTransport">0.0 kg</strong>
                      </div>
                      <motion class="home-cat-track"><div class="home-cat-fill home-cat-fill--transport" id="homeCatTransportBar"></div></div>
                    </div>
                  </div>
                  <div class="home-cat-row" data-cat="energy">
                    <span class="home-cat-icon" aria-hidden="true">💡</span>
                    <div class="home-cat-body">
                      <div class="home-cat-head">
                        <span>Electricity</span>
                        <strong id="homeCatEnergy">0.0 kg</strong>
                      </div>
                      <div class="home-cat-track"><motion class="home-cat-fill home-cat-fill--energy" id="homeCatEnergyBar"></div></div>
                    </div>
                  </div>
                </div>

                <div class="home-activity-actions">
                  <a class="home-activity-cta home-activity-cta--primary" href="./log-activity.html">
                    <span aria-hidden="true">+</span>
                    <span>Log activity</span>
                  </a>
                  <a class="home-activity-cta" href="./overview.html#recentActivities">
                    <span>View dashboard</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="M13 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>`;
h = h.slice(0, start) + replacement + h.slice(end);
fs.writeFileSync(p, h);
console.log("patched ok");
