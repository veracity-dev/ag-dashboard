/* ================================================================
   AG Drones — Dashboard  |  Chart.js v4 implementation
   ================================================================ */

/* ---- resolved color palette (canvas can't read CSS vars) ---- */
const CLR = {
  green:    '#8ed14f',
  greenDim: '#4f8a3a',
  greenDeep:'#2c4a26',
  green2:   '#a8d86a',
  amber:    '#f2b134',
  blue:     '#5fa8d3',
  red:      '#e2685a',
  surface:  '#171f28',
  surface2: '#1e2733',
  surface3: '#26313d',
  border:   '#2c3946',
  text:     '#eef2f5',
  textDim:  '#8b97a3',
  textFaint:'#576270',
};

/* resolve a CSS var string or pass hex through */
const rc = c => ({
  'var(--green)':      CLR.green,
  'var(--green-dim)':  CLR.greenDim,
  'var(--amber)':      CLR.amber,
  'var(--blue)':       CLR.blue,
  'var(--red)':        CLR.red,
  'var(--surface-3)':  CLR.surface3,
  'var(--text-faint)': CLR.textFaint,
}[c] || c);

/* ---- Chart.js global dark-theme defaults ---- */
Chart.defaults.color           = CLR.textFaint;
Chart.defaults.borderColor     = CLR.border;
Chart.defaults.font.family     = '-apple-system,"Segoe UI","Helvetica Neue",Arial,sans-serif';
Chart.defaults.font.size       = 10;
Chart.defaults.animation       = false;

/* ---- tabs ---- */
document.getElementById("sidebar-toggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("collapsed");
});

document.getElementById("tabs").addEventListener("click", e => {
  const btn = e.target.closest(".tab-btn"); if (!btn) return;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === btn.dataset.view));
  /* resize any Chart.js charts that were hidden while their tab was inactive */
  setTimeout(() => {
    document.querySelectorAll('.view.active canvas').forEach(c => {
      const ch = Chart.getChart(c); if (ch) ch.resize();
    });
  }, 30);
});

/* ================================================================
   Chart.js wrapper functions
   ================================================================ */

/* create a canvas inside a container div, set container height */
function mkCanvas(id, h) {
  const wrap = document.getElementById(id);
  wrap.style.height = h + 'px';
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  return canvas;
}

/* line / area chart — renders into div#id */
function lineChart(id, values, color, opts = {}) {
  const col = rc(color);
  const canvas = mkCanvas(id, opts.h || 120);
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: opts.labels || values.map(() => ''),
      datasets: [{
        data: values,
        borderColor: col,
        backgroundColor: col + '38',
        fill: true,
        tension: 0.35,
        pointRadius: opts.dots ? 3 : 0,
        pointHoverRadius: opts.dots ? 5 : 0,
        pointBackgroundColor: col,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

/* bar chart — renders into div#id */
function barChart(id, values, colorFn, opts = {}) {
  const canvas = mkCanvas(id, opts.h || 130);
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: opts.labels || values.map(() => ''),
      datasets: [{
        data: values,
        backgroundColor: values.map((v, i) => rc(colorFn(i, v))),
        borderRadius: 3,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: !!opts.labels, grid: { display: false }, ticks: { font: { size: 9 }, color: CLR.textFaint } },
        y: { display: false }
      }
    }
  });
}

/* grouped bar chart — renders into div#id */
function groupedBarChart(id, groups, series, colors, opts = {}) {
  const canvas = mkCanvas(id, opts.h || 110);
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: groups,
      datasets: series.map((s, si) => ({
        data: s.values,
        backgroundColor: rc(colors[si]),
        borderRadius: 3,
        borderSkipped: false,
        barPercentage: 0.85,
        categoryPercentage: 0.7,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 8.5 }, color: CLR.textFaint } },
        y: { display: false }
      }
    }
  });
}

/* ring / doughnut — returns a canvas node (caller appends it) */
function ringChart(pct, color, size = 90, stroke = 9, track) {
  const col = rc(color);
  const canvas = document.createElement('canvas');
  canvas.width  = size * 2;  /* 2× for retina sharpness */
  canvas.height = size * 2;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  const cutout = Math.round((1 - (stroke * 2) / size) * 100) + '%';
  new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: [col, track || CLR.surface3],
        borderWidth: 0,
        hoverOffset: 0,
      }]
    },
    options: {
      responsive: false, cutout,
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
  return canvas;
}

/* pie / doughnut — returns a canvas node */
function pieChart(segments, size = 110) {
  const canvas = document.createElement('canvas');
  canvas.width  = size * 2;
  canvas.height = size * 2;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: segments.map(s => s.v),
        backgroundColor: segments.map(s => rc(s.color)),
        borderWidth: 2,
        borderColor: CLR.surface,
        hoverOffset: 0,
      }]
    },
    options: {
      responsive: false, cutout: '45%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
  return canvas;
}

/* append a node-based chart (ring/pie) into a div by id */
function mount(id, node) { document.getElementById(id).appendChild(node); }

/* overlay center label on a ring-wrap div */
function centerLabel(wrapId, n, l) {
  const wrap = document.getElementById(wrapId);
  wrap.style.position = 'relative';
  const lab = document.createElement('div');
  lab.className = 'ring-center';
  lab.innerHTML = `<span class="n mono" style="font-size:${n.length > 4 ? 18 : 22}px;">${n}</span><span class="l">${l}</span>`;
  wrap.appendChild(lab);
}

/* KPI trend chart with health/risk bands — renders into div#id */
function kpiChart(id, scoreVals, riskVals, weekLabels, opts = {}) {
  const canvas = mkCanvas(id, opts.h || 190);

  const bandPlugin = {
    id: 'kpiBands',
    beforeDraw(chart) {
      const { ctx, chartArea, scales: { y } } = chart;
      if (!chartArea) return;
      [[0, 60, CLR.red], [60, 80, CLR.amber], [80, 100, CLR.green]].forEach(([lo, hi, col]) => {
        ctx.save();
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.09;
        ctx.fillRect(chartArea.left, y.getPixelForValue(hi), chartArea.width, y.getPixelForValue(lo) - y.getPixelForValue(hi));
        ctx.restore();
      });
    }
  };

  return new Chart(canvas, {
    type: 'line',
    plugins: [bandPlugin],
    data: {
      labels: weekLabels,
      datasets: [
        {
          label: 'Block Health Score',
          data: scoreVals,
          borderColor: CLR.green,
          backgroundColor: CLR.green + '30',
          fill: true, tension: 0,
          pointRadius: 3, pointHoverRadius: 5,
          pointBackgroundColor: CLR.surface2,
          pointBorderColor: CLR.green,
          pointBorderWidth: 1.6,
          borderWidth: 2.25, order: 1,
        },
        {
          label: 'Disease Risk Score',
          data: riskVals,
          borderColor: CLR.red,
          backgroundColor: 'transparent',
          fill: false, tension: 0,
          pointRadius: 0, borderWidth: 1.75,
          borderDash: [4, 3], order: 2,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CLR.surface2, borderColor: CLR.border, borderWidth: 1,
          titleColor: CLR.textDim, bodyColor: CLR.text, padding: 10,
        }
      },
      scales: {
        x: { grid: { color: CLR.border + '60' }, ticks: { font: { size: 8.5 }, maxRotation: 0, color: CLR.textFaint } },
        y: {
          min: 0, max: 100,
          grid: { color: CLR.border },
          ticks: { font: { size: 8.5 }, color: CLR.textFaint, stepSize: 20, callback: v => [0, 60, 80, 100].includes(v) ? v : '' }
        }
      }
    }
  });
}

/* multi-series line chart — renders into div#id. `series` is
   [{label, data, color}, …]; colors are assigned by the caller in a
   fixed order (never auto-cycled) and rendered via an external HTML
   legend rather than Chart.js's built-in one, matching the rest of
   the dashboard's legend treatment. */
function multiLineChart(id, series, labels, opts = {}) {
  const canvas = mkCanvas(id, opts.h || 160);
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: series.map(s => ({
        label: s.label,
        data: s.data,
        borderColor: rc(s.color),
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.25,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        pointBackgroundColor: rc(s.color),
        pointBorderColor: CLR.surface,
        pointBorderWidth: 1,
        borderWidth: 2,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CLR.surface2, borderColor: CLR.border, borderWidth: 1,
          titleColor: CLR.textDim, bodyColor: CLR.text, padding: 10,
        }
      },
      scales: {
        x: { grid: { color: CLR.border + '60' }, ticks: { font: { size: 8.5 }, maxRotation: 0, color: CLR.textFaint } },
        y: { grid: { color: CLR.border }, ticks: { font: { size: 8.5 }, color: CLR.textFaint } }
      }
    }
  });
}

/* ================================================================
   SVG helpers — kept only for decorative landscape banners
   ================================================================ */
const NS = "http://www.w3.org/2000/svg";
function svgNode(tag, attrs) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }

function landscape(w, h, palette) {
  const svg = svgNode("svg", { viewBox: `0 0 ${w} ${h}`, width: "100%", height: "100%", preserveAspectRatio: "none" });
  const defs = svgNode("defs", {});
  const sky = svgNode("linearGradient", { id: "sky", x1: "0", y1: "0", x2: "0", y2: "1" });
  palette.sky.forEach((c, i) => sky.appendChild(svgNode("stop", { offset: `${i * 100 / (palette.sky.length - 1)}%`, "stop-color": c })));
  defs.appendChild(sky);
  palette.ridges.forEach((ridge, i) => {
    const g = svgNode("linearGradient", { id: "ridge" + i, x1: "0", y1: "0", x2: "0", y2: "1" });
    g.appendChild(svgNode("stop", { offset: "0%", "stop-color": ridge.top }));
    g.appendChild(svgNode("stop", { offset: "100%", "stop-color": ridge.bottom }));
    defs.appendChild(g);
  });
  svg.appendChild(defs);
  svg.appendChild(svgNode("rect", { x: 0, y: 0, width: w, height: h, fill: "url(#sky)" }));
  svg.appendChild(svgNode("circle", { cx: w * palette.sunX, cy: h * palette.sunY, r: h * 0.22, fill: palette.sun, opacity: "0.5" }));
  svg.appendChild(svgNode("circle", { cx: w * palette.sunX, cy: h * palette.sunY, r: h * 0.09, fill: palette.sun, opacity: "0.9" }));
  palette.ridges.forEach((ridge, i) => {
    const baseY = h * ridge.base, amp = h * ridge.amp, seedOffset = i * 37 + 11;
    let d = `M0,${h}`;
    for (let p = 0; p <= 6; p++) {
      const x = w * p / 6, y = baseY - amp * Math.abs(Math.sin((p + seedOffset) * 1.3));
      if (p === 0) d += ` L${x},${y}`; else { const px = w * (p - 1) / 6; d += ` Q${(px + x) / 2},${y - amp * 0.15} ${x},${y}`; }
    }
    d += ` L${w},${h} Z`;
    svg.appendChild(svgNode("path", { d, fill: `url(#ridge${i})`, opacity: ridge.opacity != null ? ridge.opacity : 1 }));
  });
  return svg;
}

const PALETTES = {
  forest: { sky: ["#16241b", "#0d1712"], sun: "#cfe6a0", sunX: 0.78, sunY: 0.28, ridges: [{ top: "#22381f", bottom: "#111d10", base: 0.55, amp: 0.22, opacity: 0.55 }, { top: "#365e2c", bottom: "#182b14", base: 0.72, amp: 0.28, opacity: 0.75 }, { top: "#5f9143", bottom: "#233c19", base: 0.92, amp: 0.3, opacity: 1 }] },
  alpine: { sky: ["#1b2c3a", "#0e1a22"], sun: "#eaf3f7", sunX: 0.25, sunY: 0.22, ridges: [{ top: "#33505f", bottom: "#16242c", base: 0.5, amp: 0.24, opacity: 0.5 }, { top: "#4a7383", bottom: "#1c2f37", base: 0.68, amp: 0.3, opacity: 0.75 }, { top: "#7fa9ad", bottom: "#28454b", base: 0.9, amp: 0.32, opacity: 1 }] },
  autumn: { sky: ["#2a2015", "#150f0a"], sun: "#f2b134", sunX: 0.7, sunY: 0.24, ridges: [{ top: "#4a3418", bottom: "#1c130a", base: 0.52, amp: 0.22, opacity: 0.55 }, { top: "#7a5522", bottom: "#2a1d0d", base: 0.7, amp: 0.26, opacity: 0.8 }, { top: "#a97a2c", bottom: "#3c2a10", base: 0.92, amp: 0.3, opacity: 1 }] },
  dusk:   { sky: ["#221a30", "#0f0c18"], sun: "#e2685a", sunX: 0.6, sunY: 0.3,  ridges: [{ top: "#3a2c4a", bottom: "#170f22", base: 0.55, amp: 0.2, opacity: 0.55 }, { top: "#5a3f5f", bottom: "#211729", base: 0.72, amp: 0.26, opacity: 0.78 }, { top: "#8a5a6e", bottom: "#301f2b", base: 0.92, amp: 0.3, opacity: 1 }] },
};

function bannerWithOverlay(id, palette, title, big, chip) {
  const host = document.getElementById(id);
  host.appendChild(landscape(800, 400, PALETTES[palette]));
  const top = document.createElement("div"); top.className = "banner-top";
  top.innerHTML = chip ? `<span class="chip-float">${chip}</span>` : "";
  host.appendChild(top);
  const overlay = document.createElement("div"); overlay.className = "banner-overlay";
  overlay.innerHTML = `<div class="card-title">${title}</div><div class="big">${big}</div>`;
  host.appendChild(overlay);
}

/* ================================================================
   VIEW 1 — Health
   ================================================================ */
const c1WeekLabels  = Array.from({ length: 14 }, (_, i) => "W" + (i + 1));
const c1BlockHealth = [58, 61, 64, 63, 67, 70, 69, 74, 77, 76, 81, 83, 85, 88];
const c1DiseaseRisk = [42, 40, 38, 39, 35, 33, 34, 29, 26, 25, 21, 19, 16, 14];
kpiChart("c1-area", c1BlockHealth, c1DiseaseRisk, c1WeekLabels, { h: 190 });

const c1Legend = document.getElementById("c1-legend");
[["NDVI", CLR.green], ["EVI2", CLR.green2], ["NDRE", CLR.blue], ["NDMI", "#5fc4c1"], ["Disease hotspots", CLR.red]].forEach(([n, c]) => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${c}"></span>${n}`; c1Legend.appendChild(d);
});

/* plantation overview — headline estate stats */
const c1tiles = document.getElementById("c1-overview-tiles");
[
  ["Total estate area", "2,450 ha", "Estate-wide", "info"],
  ["Tea blocks monitored", "87", "Active", "up"],
  ["Average bush health", "91%", "Good", "up"],
  ["Monthly green leaf forecast", "1,820 t", "+6% vs last month", "up"],
].forEach(([l, n, badge, tone]) => {
  const tile = document.createElement("div"); tile.className = "stat-tile";
  tile.innerHTML = `<span class="l">${l}</span><span class="n mono">${n}</span><span class="delta ${tone}">${badge}</span>`;
  c1tiles.appendChild(tile);
});

/* plantation overview — quick-glance rows */
const c1rows = document.getElementById("c1-overview-rows");
[
  ["Water-stressed blocks", "6 blocks", '<path d="M7,2 C7,2 3,7 3,9.5 A4,4 0 0 0 11,9.5 C11,7 7,2 7,2 Z" fill="none" stroke="currentColor" stroke-width="1.2"/>'],
  ["Pest risk", "Moderate", '<path d="M7,2 L12.5,11.5 H1.5 Z" fill="none" stroke="currentColor" stroke-width="1.1"/><line x1="7" y1="6" x2="7" y2="8.3" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="9.8" r="0.6" fill="currentColor"/>'],
  ["Harvest-ready blocks", "12 blocks", '<circle cx="4" cy="10" r="1.4" fill="none" stroke="currentColor" stroke-width="1.1"/><circle cx="4" cy="4" r="1.4" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M5.2,5.2 L12,11 M5.2,8.8 L12,3" stroke="currentColor" stroke-width="1.1"/>'],
  ["Last satellite update", "Yesterday", '<path d="M4,9 Q3,9 3,7.5 Q3,6 4.5,6 Q5,4 7,4 Q9,4 9.3,6 Q10.5,6.2 10.5,7.7 Q10.5,9 9.3,9 Z" fill="none" stroke="currentColor" stroke-width="1.1"/>'],
].forEach(([l, v, glyph]) => {
  const item = document.createElement("div"); item.className = "stat-row-item";
  item.innerHTML = `<span class="ico"><svg width="14" height="14" viewBox="0 0 14 14">${glyph}</svg></span><span><span class="l" style="display:block;">${l}</span><span class="v mono">${v}</span></span>`;
  c1rows.appendChild(item);
});

/* hero card 1 — metric rows */
const c1h1 = document.getElementById("c1-hero1-rows");
[["Disease Risk Score","38% · Warning"],["Soil moisture (NDMI)","0.13 · Warning"],["Canopy vigour","Low · ▼ 12%"],["Cycles at high priority","2 of 2"],["Recommended action","Inspect + irrigate"]].forEach(([k, v]) => {
  const r = document.createElement("div"); r.className = "mini-row";
  r.innerHTML = `<span class="k">${k}</span><span class="v mono">${v}</span>`; c1h1.appendChild(r);
});

groupedBarChart("c1-hero1-bars", ["W10","W11","W12","W13","W14"], [{ values:[78,81,80,82,84] }, { values:[70,67,62,56,50] }], [CLR.green, CLR.amber], { h: 106 });
const h1leg = document.getElementById("c1-hero1-legend");
[["Target", CLR.green], ["Block C4", CLR.amber]].forEach(([n, c]) => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${c}"></span>${n}`; h1leg.appendChild(d);
});

/* hero card 2 — Canopy Density Score line chart overlay */
(function () {
  const canvas = mkCanvas("c1-hero2-spark", 148);
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: Array.from({ length: 14 }, (_, i) => 'W' + (i + 1)),
      datasets: [
        {
          label: 'Canopy Density',
          data: [72, 74, 73, 77, 79, 78, 82, 84, 83, 86, 88, 89, 90, 90.2],
          borderColor: CLR.green,
          backgroundColor: CLR.green + '28',
          fill: true,
          tension: 0.4,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          pointBackgroundColor: CLR.green,
          pointBorderColor: CLR.surface,
          pointBorderWidth: 1,
          borderWidth: 2,
        },
        {
          label: 'Block baseline',
          data: Array(14).fill(82),
          borderColor: 'rgba(238,242,245,0.35)',
          backgroundColor: 'transparent',
          fill: false,
          tension: 0,
          pointRadius: 0,
          borderWidth: 1.2,
          borderDash: [5, 4],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CLR.surface2,
          borderColor: CLR.border,
          borderWidth: 1,
          titleColor: CLR.textDim,
          bodyColor: CLR.text,
          padding: 9,
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(44,57,70,0.45)' },
          ticks: { font: { size: 8 }, color: 'rgba(238,242,245,0.55)', maxRotation: 0 }
        },
        y: {
          min: 60, max: 100,
          grid: { color: 'rgba(44,57,70,0.45)' },
          ticks: { font: { size: 8 }, color: 'rgba(238,242,245,0.55)', stepSize: 20 }
        }
      }
    }
  });
})();

/* hero card 2 — LAI/MTVI2 vs. NDVI cross-check (doc: "NDVI saturation can
   occur when LAI is high, so LAI/MTVI2 should support NDVI") */
const c1h2 = document.getElementById("c1-hero2-rows");
[["LAI (current)","4.8 m²/m²"],["MTVI2 (current)","0.61"],["NDVI cross-check","0.78 · saturated"],["Margin to alert","23% (vs. 15% drop)"]].forEach(([k, v]) => {
  const r = document.createElement("div"); r.className = "mini-row";
  r.innerHTML = `<span class="k">${k}</span><span class="v mono">${v}</span>`; c1h2.appendChild(r);
});

/* Yield & Financial Trend — three Category C KPIs on one chart:
   average 30-Day Yield Forecast and Green Leaf Yield Estimate (both
   kg/ha) alongside Revenue at Risk (LKR). Raw units aren't comparable,
   so all three are indexed to their OWN 12-week average = 100 (not to
   a shared Week-1 point) — that keeps one readable axis without
   forcing every line to launch from the same artificial starting dot. */
const c1yWeeks = Array.from({ length: 12 }, (_, i) => "W" + (i + 1));
const c1yRaw = {
  "Avg. Yield Forecast (kg/ha)":       [206, 208, 207, 210, 209, 211, 210, 213, 212, 214, 215, 213],
  "Green Leaf Yield Estimate (kg/ha)": [195, 197, 200, 202, 204, 206, 205, 208, 210, 209, 212, 214],
  "Revenue at Risk (LKR)":             [7400, 7100, 6900, 6600, 6300, 6100, 5800, 5600, 5400, 5200, 5000, 4900],
};
const c1yColors = { "Avg. Yield Forecast (kg/ha)": "var(--green)", "Green Leaf Yield Estimate (kg/ha)": "var(--blue)", "Revenue at Risk (LKR)": "var(--amber)" };
const c1yieldSeries = Object.entries(c1yRaw).map(([label, data]) => {
  const base = data.reduce((a, b) => a + b, 0) / data.length;
  return { label, color: c1yColors[label], data: data.map(v => Math.round((v / base) * 1000) / 10), raw: data };
});
multiLineChart("c1-yield-forecast", c1yieldSeries, c1yWeeks, { h: 160 });
const c1yLegend = document.getElementById("c1-yield-forecast-legend");
c1yieldSeries.forEach(s => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.label}`; c1yLegend.appendChild(d);
});

/* ================================================================
   VIEW 2 — Environment
   ================================================================ */
bannerWithOverlay("c2-hero", "alpine", "Site — Meridian Ridge", "18.4°C / 62% humidity", "Live feed");

document.getElementById("c2-ring").appendChild(ringChart(72, CLR.green, 110, 10));
centerLabel("c2-ring", "72", "AQI good");

const c2icons = document.getElementById("c2-icons");
[["Wind","12 km/h"],["UV","3 low"],["Pressure","1013 hPa"],["Visibility","9.5 km"],["Dew pt.","11°C"]].forEach(([l, v]) => {
  const c = document.createElement("div"); c.className = "icon-stat";
  c.innerHTML = `<div class="icon-btn"><span class="dot" style="background:var(--green)"></span></div><div class="n mono">${v}</div><div class="l">${l}</div>`;
  c2icons.appendChild(c);
});

lineChart("c2-a1", [40, 44, 41, 47, 50, 48, 53], CLR.blue,  { h: 90 });
lineChart("c2-a2", [18, 20, 19, 22, 21, 24, 23], CLR.amber, { h: 90 });
lineChart("c2-a3", [2,  0,  5,  8,  3,  1,  6],  CLR.green, { h: 90 });
barChart("c2-bars", [98, 96, 91, 99, 88], () => CLR.green, { h: 100 });
lineChart("c2-area2", [10, 18, 24, 30, 42, 55, 70, 88], CLR.green, { h: 100, dots: true });

const c2list = document.getElementById("c2-list");
[["Zone A","92%",CLR.green],["Zone B","81%",CLR.blue],["Zone C","74%",CLR.amber],["Zone D","63%",CLR.textFaint]].forEach(([n, v, c]) => {
  const row = document.createElement("div"); row.className = "list-row";
  row.innerHTML = `<span class="dot" style="background:${c}"></span><span class="name">${n}</span><span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v};background:${c}"></span></span></span><span class="val mono">${v}</span>`;
  c2list.appendChild(row);
});

/* ================================================================
   VIEW 3 — Team
   ================================================================ */
bannerWithOverlay("c3-banner", "autumn", "Monitoring cycle 24", "Day 3 of 5", "On track");

const c3t = document.getElementById("c3-tickets");
[["A. Novak","12"],["R. Diaz","9"],["S. Coates","7"],["M. Iyer","6"],["J. Park","3"]].forEach(([n, v]) => {
  const row = document.createElement("div"); row.className = "list-row";
  row.innerHTML = `<span class="thumb" style="background:linear-gradient(135deg,var(--surface-3),var(--surface-2));"></span><span class="name">${n}</span><span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v * 7}%;background:var(--green)"></span></span></span><span class="val mono">${v}</span>`;
  c3t.appendChild(row);
});

const c3rings = document.getElementById("c3-rings");
[["Scouting",84,CLR.green],["Irrigation",67,CLR.blue],["Spraying",91,CLR.amber],["Harvest",58,CLR.red]].forEach(([n, pct, color]) => {
  const wrap = document.createElement("div"); wrap.className = "span-3";
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px;";
  const ringHost = document.createElement("div"); ringHost.className = "ring-wrap"; ringHost.style.position = "relative";
  ringHost.appendChild(ringChart(pct, color, 66, 7));
  const lab = document.createElement("div"); lab.className = "ring-center";
  lab.innerHTML = `<span class="n mono" style="font-size:13px;">${pct}%</span>`;
  ringHost.appendChild(lab);
  wrap.appendChild(ringHost); c3rings.appendChild(wrap);
  const cap = document.createElement("div"); cap.className = "l"; cap.style.cssText = "font-size:10.5px;color:var(--text-faint);";
  cap.textContent = n; wrap.appendChild(cap);
});

/* ================================================================
   VIEW 4 — Finance
   ================================================================ */
bannerWithOverlay("c4-banner1", "alpine", "Nuwara block — Highland", "Yield +4.2% vs baseline", "Above target");
bannerWithOverlay("c4-banner2", "dusk",   "Dimbula block — Lowland", "Yield -1.8% vs baseline", "Below target");

mount("c4-pie", pieChart([{ v:34,color:CLR.green },{ v:22,color:CLR.blue },{ v:28,color:CLR.amber },{ v:16,color:CLR.red }]));
const pieLegend = document.getElementById("c4-pie-legend");
[["Fertilizer",CLR.green],["Pesticide",CLR.blue],["Irrigation",CLR.amber],["Labor",CLR.red]].forEach(([n, c]) => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${c}"></span>${n}`; pieLegend.appendChild(d);
});

document.getElementById("c4-ring1").appendChild(ringChart(64, CLR.green, 100, 10)); centerLabel("c4-ring1", "$6,840", "saved / qtr");
document.getElementById("c4-ring2").appendChild(ringChart(83, CLR.blue,  100, 10)); centerLabel("c4-ring2", "83%",    "confidence");

mount("c4-pie2", pieChart([{ v:45,color:CLR.green },{ v:35,color:CLR.surface3 },{ v:20,color:CLR.red }], 90));
mount("c4-pie3", pieChart([{ v:72,color:CLR.green },{ v:28,color:CLR.amber }], 90));

/* 30-day yield forecast vs actual */
(function () {
  const canvas = mkCanvas("c4-dual", 140);
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: Array.from({ length: 12 }, (_, i) => `P${i + 1}`),
      datasets: [
        { label:'Forecast', data:[62,65,67,70,72,74,76,78,80,82,85,88], borderColor:CLR.green, backgroundColor:'transparent', fill:false, tension:0, pointRadius:2, pointBackgroundColor:CLR.green, borderWidth:2.5 },
        { label:'Actual',   data:[56,60,61,64,68,68,70,74,74,78,79,84], borderColor:CLR.amber, backgroundColor:'transparent', fill:false, tension:0, pointRadius:2, pointBackgroundColor:CLR.amber, borderWidth:2.5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 }, color: CLR.textFaint } },
        y: { display: false }
      }
    }
  });
})();
