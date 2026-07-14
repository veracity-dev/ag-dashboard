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
   [{label, data, color, axis}, …]; colors are assigned by the caller in
   a fixed order (never auto-cycled) and rendered via an external HTML
   legend rather than Chart.js's built-in one, matching the rest of
   the dashboard's legend treatment. Pass axis:'y1' on a series (plus
   opts.dualAxis / opts.y1Label) to plot it against a right-hand scale
   when its unit isn't comparable to the rest (e.g. LKR vs. kg/ha). */
function multiLineChart(id, series, labels, opts = {}) {
  const canvas = mkCanvas(id, opts.h || 160);
  const scales = {
    x: { grid: { color: CLR.border + '60' }, ticks: { font: { size: 8.5 }, maxRotation: 0, color: CLR.textFaint } },
    y: { position: 'left', grid: { color: CLR.border }, ticks: { font: { size: 8.5 }, color: CLR.textFaint },
      title: opts.yLabel ? { display: true, text: opts.yLabel, font: { size: 9 }, color: CLR.textFaint } : undefined },
  };
  if (opts.dualAxis) {
    scales.y1 = { position: 'right', grid: { display: false },
      ticks: { font: { size: 8.5 }, color: CLR.textFaint, ...(opts.y1Suffix ? { callback: v => v + opts.y1Suffix } : {}) },
      title: opts.y1Label ? { display: true, text: opts.y1Label, font: { size: 9 }, color: CLR.textFaint } : undefined };
  }
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
        yAxisID: s.axis || 'y',
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
      scales
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
  ["Revenue protected", "$18,420", "▲ 6.1%", "up"],
  ["ROI of precision program", "27.4%", "▲ 1.1 pts", "up"],
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
[["Target", CLR.green], ["Block 4NW", CLR.amber]].forEach(([n, c]) => {
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
   average 30-Day Yield Forecast and Green Leaf Yield Estimate share the
   left axis (both kg/ha); Revenue at Risk is a different unit (LKR) so
   it plots against its own right-hand axis instead of being squashed
   onto the kg/ha scale. */
const c1yWeeks = Array.from({ length: 12 }, (_, i) => "W" + (i + 1));
const c1yieldSeries = [
  { label: "Avg. Yield Forecast (kg/ha)",       color: "var(--green)", axis: "y",  data: [2050, 2080, 2070, 2110, 2140, 2160, 2180, 2210, 2240, 2260, 2290, 2320] },
  { label: "Green Leaf Yield Estimate (kg/ha)", color: "var(--blue)",  axis: "y",  data: [2000, 2030, 2060, 2090, 2100, 2130, 2150, 2170, 2200, 2220, 2250, 2280] },
  { label: "Revenue at Risk (LKR M)",           color: "var(--amber)", axis: "y1", data: [15.2, 14.5, 13.9, 13.2, 12.6, 12.0, 11.4, 10.9, 10.4, 10.0, 9.7, 9.5] },
];
multiLineChart("c1-yield-forecast", c1yieldSeries, c1yWeeks, { h: 160, dualAxis: true, yLabel: "kg/ha", y1Label: "LKR M", y1Suffix: 'M' });
const c1yLegend = document.getElementById("c1-yield-forecast-legend");
c1yieldSeries.forEach(s => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.label}`; c1yLegend.appendChild(d);
});

/* Estate block map — a concentric ring/sector diagram (5 rings × 4
   quadrants = 20 blocks) standing in for a geographic layout, colored
   by Disease Risk Score using the same target/warning/critical bands
   as the Block Health Score chart (<20% / 20–50% / ≥50%). Click a
   block to inspect it; adapted from a reference SVG mock into the
   dashboard's dark theme and KPI vocabulary. */
(function () {
  const svgNS = "http://www.w3.org/2000/svg";
  const cx = 255, cy = 255;
  const radii = [0, 40, 80, 120, 160, 200];
  const sectors = 4;
  const quadrantNames = ["NE", "SE", "SW", "NW"];

  function riskColor(risk) {
    if (risk >= 50) return CLR.red;
    if (risk >= 20) return CLR.amber;
    return CLR.green;
  }
  function riskIssue(risk) {
    if (risk >= 50) return "Blister blight";
    if (risk >= 30) return "Red rust";
    return "None significant";
  }

  const riskPool = [12, 18, 24, 31, 38, 45, 52, 60];
  const blocks = [];
  for (let ring = 0; ring < radii.length - 1; ring++) {
    for (let s = 0; s < sectors; s++) {
      const risk = riskPool[(ring * sectors + s) % riskPool.length];
      blocks.push({
        name: `Block ${ring + 1}${quadrantNames[s]}`,
        area: (1.2 + ring * 0.4).toFixed(1) + " ha",
        ndvi: (0.78 - risk * 0.006).toFixed(2),
        risk: risk + "%",
        issue: riskIssue(risk),
        scan: (1 + ((ring + s) % 3)) + "d ago",
        color: riskColor(risk),
      });
    }
  }

  const polar = (r, angle) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  const fillsGroup = document.getElementById("terrace-fills");
  let idx = 0;
  for (let ring = 0; ring < radii.length - 1; ring++) {
    const r0 = radii[ring], r1 = radii[ring + 1];
    for (let s = 0; s < sectors; s++) {
      const a0 = (s / sectors) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((s + 1) / sectors) * Math.PI * 2 - Math.PI / 2;
      const [x0, y0] = polar(r1, a0);
      const [x1, y1] = polar(r1, a1);
      const [x2, y2] = polar(r0, a1);
      const [x3, y3] = polar(r0, a0);
      const d = r0 === 0
        ? `M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${r1},${r1} 0 0,1 ${x1.toFixed(1)},${y1.toFixed(1)} Z`
        : `M${x0.toFixed(1)},${y0.toFixed(1)} A${r1},${r1} 0 0,1 ${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} A${r0},${r0} 0 0,0 ${x3.toFixed(1)},${y3.toFixed(1)} Z`;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", blocks[idx].color);
      path.setAttribute("fill-opacity", "0.6");
      path.setAttribute("stroke", CLR.surface);
      path.setAttribute("stroke-width", "1");
      path.style.cursor = "pointer";
      path.dataset.idx = idx;
      fillsGroup.appendChild(path);
      idx++;
    }
  }

  const fields = { name: "tm-name", area: "tm-area", ndvi: "tm-ndvi", risk: "tm-risk", issue: "tm-issue", scan: "tm-scan" };
  const regions = fillsGroup.querySelectorAll("path");
  regions.forEach(region => {
    region.addEventListener("click", () => {
      regions.forEach(p => { p.setAttribute("stroke-width", "1"); p.setAttribute("stroke", CLR.surface); });
      region.setAttribute("stroke-width", "2.5");
      region.setAttribute("stroke", CLR.text);
      const b = blocks[region.dataset.idx];
      Object.entries(fields).forEach(([key, id]) => { document.getElementById(id).textContent = b[key]; });
    });
    region.addEventListener("mouseenter", () => region.setAttribute("fill-opacity", "0.85"));
    region.addEventListener("mouseleave", () => region.setAttribute("fill-opacity", "0.6"));
  });
})();

/* Two blocks spotlighted against their yield baseline — moved here from
   the old Finance tab since Health & Yield is where yield content lives. */
bannerWithOverlay("c4-banner1", "alpine", "Block 5NE", "Yield +4.2% vs baseline", "Above target");
bannerWithOverlay("c4-banner2", "dusk",   "Block 2NW", "Yield -1.8% vs baseline", "Below target");

mount("c4-pie", pieChart([{ v:34,color:CLR.green },{ v:22,color:CLR.blue },{ v:28,color:CLR.amber },{ v:16,color:CLR.red }]));
const pieLegend = document.getElementById("c4-pie-legend");
[["Fertilizer",CLR.green],["Pesticide",CLR.blue],["Irrigation",CLR.amber],["Labor",CLR.red]].forEach(([n, c]) => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${c}"></span>${n}`; pieLegend.appendChild(d);
});

document.getElementById("c4-ring1").appendChild(ringChart(64, CLR.green, 100, 10)); centerLabel("c4-ring1", "$6,840", "saved / qtr");
mount("c4-pie2", pieChart([{ v:45,color:CLR.green },{ v:35,color:CLR.surface3 },{ v:20,color:CLR.red }], 90));

/* ================================================================
   VIEW 2 — Input & Resources
   Groups A-D per "Precision Agriculture Intelligence for Horana
   Plantations": A Nutrient & Fertiliser, B Water & Irrigation,
   C Crop Protection & Agrochemical, D Energy/Labour/Operational.
   ================================================================ */
bannerWithOverlay("c2-hero", "forest", "Nitrogen Use Efficiency", "8.4 kg yield / kg N", "Group A");

/* Water Use Efficiency (WUE) — kg made-tea / m3 water, vs. an estate benchmark of 3.5 */
document.getElementById("c2-ring").appendChild(ringChart(91, CLR.green, 110, 10));
centerLabel("c2-ring", "3.2", "kg/m³");

/* quick-glance status — one headline stat per resource group */
const c2icons = document.getElementById("c2-icons");
[["Fertiliser rate","142 kg/ha","var(--green)"],["Irrigation applied","38 m³/ha","var(--green)"],["Targeted spray area","34% of block","var(--amber)"],["Labour hours saved","126 hrs/ha","var(--green)"],["Drone flight hours","18 hrs this mo","var(--green)"]].forEach(([l, v, dot]) => {
  const c = document.createElement("div"); c.className = "icon-stat";
  c.innerHTML = `<div class="icon-btn"><span class="dot" style="background:${dot}"></span></div><div class="n mono">${v}</div><div class="l">${l}</div>`;
  c2icons.appendChild(c);
});

/* Fertiliser Cost Efficiency (FCE) — LKR per kg yield, trending down = improving */
lineChart("c2-a1", [42, 41, 40, 39, 38, 37, 36, 35], CLR.green, { h: 90 });

/* Irrigation Trigger Compliance — % of decisions image-supported, target >=80% */
document.getElementById("c2-irrigation-ring").appendChild(ringChart(83, CLR.green, 90, 9));
centerLabel("c2-irrigation-ring", "83%", "compliant");

/* Agrochemical Use Reduction — blanket vs. targeted application, indexed */
barChart("c2-bars", [100, 82], (i) => i === 0 ? CLR.textFaint : CLR.green, { h: 100, labels: ["Blanket", "Targeted"] });
const c2barsRows = document.getElementById("c2-bars-rows");
[["Reduction vs. baseline", "18%"], ["Target range", "10–20%"]].forEach(([k, v]) => {
  const r = document.createElement("div"); r.className = "mini-row"; r.innerHTML = `<span class="k">${k}</span><span class="v mono">${v}</span>`; c2barsRows.appendChild(r);
});

/* Nitrogen deficiency by block — target <5%. Block 4NW (the block flagged
   in the priority-alert card on Health & Yield) is kept as the worst
   performer here too, so the same block reads as a problem estate-wide
   rather than each tab inventing its own "zone" identity. */
const c2ndef = document.getElementById("c2-ndef-zones");
[["Block 1NE", "3%", CLR.green], ["Block 2SE", "4%", CLR.green], ["Block 3SW", "6%", CLR.amber], ["Block 4NW", "9%", CLR.red]].forEach(([n, v, c]) => {
  const row = document.createElement("div"); row.className = "list-row";
  row.innerHTML = `<span class="dot" style="background:${c}"></span><span class="name">${n}</span><span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v};background:${c}"></span></span></span><span class="val mono">${v}</span>`;
  c2ndef.appendChild(row);
});

/* Irrigation compliance by block — target >=80% */
const c2irr = document.getElementById("c2-irrigation-zones");
[["Block 1NE", "88%", CLR.green], ["Block 2SE", "91%", CLR.green], ["Block 3SW", "79%", CLR.amber], ["Block 4NW", "68%", CLR.red]].forEach(([n, v, c]) => {
  const row = document.createElement("div"); row.className = "list-row";
  row.innerHTML = `<span class="dot" style="background:${c}"></span><span class="name">${n}</span><span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v};background:${c}"></span></span></span><span class="val mono">${v}</span>`;
  c2irr.appendChild(row);
});

/* Drone operations (Group D) — Monitoring Coverage Efficiency + Drone Flight Hours */
const c2drone = document.getElementById("c2-drone-rows");
[["Coverage / flight", "38 ha"], ["Flight hours (month)", "18 hrs"], ["Flights completed", "6"], ["Fuel/energy use", "4.2 L/ha"]].forEach(([k, v]) => {
  const r = document.createElement("div"); r.className = "mini-row"; r.innerHTML = `<span class="k">${k}</span><span class="v mono">${v}</span>`; c2drone.appendChild(r);
});

/* ================================================================
   VIEW 3 — Soil Health (Category D: 5 KPIs)
   ================================================================ */
bannerWithOverlay("c3-banner", "alpine", "Soil Moisture Status", "0.24 NDMI", "Above target");

/* Soil Moisture (NDMI) by block — target >0.20, warning 0.10-0.20, critical <0.10 */
const c3t = document.getElementById("c3-tickets");
[["Block 1NE", 0.26, CLR.green], ["Block 2SE", 0.22, CLR.green], ["Block 3SW", 0.18, CLR.amber], ["Block 4NW", 0.09, CLR.red]].forEach(([n, v, c]) => {
  const width = Math.min(100, Math.round((v / 0.3) * 100));
  const row = document.createElement("div"); row.className = "list-row";
  row.innerHTML = `<span class="dot" style="background:${c}"></span><span class="name">${n}</span><span class="track"><span class="bar-track"><span class="bar-fill" style="width:${width}%;background:${c}"></span></span></span><span class="val mono">${v.toFixed(2)}</span>`;
  c3t.appendChild(row);
});

/* Surface Heat Stress — LST anomaly vs. seasonal baseline (relative, not a fixed target) */
lineChart("c3-heat", [0.4, 0.6, 0.3, 0.8, 1.1, 0.9, 1.4, 1.2], CLR.amber, { h: 100 });

/* ================================================================
   VIEW 4 — Predictive AI (Category E: 5 KPIs)
   Reuses the Block <ring><compass> identity from the Estate block map
   and the Drone/Sentinel-2/Landsat/AI Fusion imagery-source identities
   from Health & Yield's "Imagery sources" widget, so this tab reads as
   the AI layer behind those alerts rather than a disconnected page.
   ================================================================ */
bannerWithOverlay("c4-priority-banner", "dusk", "Block 4NW", "2 of 2 cycles — escalate", "High priority");

/* AI Data Quality Score — target >85/100 */
document.getElementById("c4-quality-ring").appendChild(ringChart(88, CLR.green, 110, 10));
centerLabel("c4-quality-ring", "88", "quality score");

/* quick AI-ops status strip */
const c4icons = document.getElementById("c4-icons");
[["Model confidence","84%","var(--green)"],["Blocks at high priority","3","var(--amber)"],["Cloud-contaminated scenes","2","var(--amber)"],["Avg forecast error","9.4%","var(--green)"],["Recs this cycle","14","var(--green)"]].forEach(([l, v, dot]) => {
  const c = document.createElement("div"); c.className = "icon-stat";
  c.innerHTML = `<div class="icon-btn"><span class="dot" style="background:${dot}"></span></div><div class="n mono">${v}</div><div class="l">${l}</div>`;
  c4icons.appendChild(c);
});

/* Yield Prediction Confidence — target >=80% */
document.getElementById("c4-ring2").appendChild(ringChart(83, CLR.blue, 100, 10)); centerLabel("c4-ring2", "83%", "confidence");

/* 14-Day Disease Risk Probability by block — target <20%, critical >=50% */
const c4risk = document.getElementById("c4-disease-risk");
[["Block 1NE", "12%", CLR.green], ["Block 2SE", "18%", CLR.green], ["Block 3SW", "34%", CLR.amber], ["Block 4NW", "58%", CLR.red]].forEach(([n, v, c]) => {
  const row = document.createElement("div"); row.className = "list-row";
  row.innerHTML = `<span class="dot" style="background:${c}"></span><span class="name">${n}</span><span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v};background:${c}"></span></span></span><span class="val mono">${v}</span>`;
  c4risk.appendChild(row);
});

/* Fertiliser Recommendation Accuracy — improving cycle over cycle */
lineChart("c4-fert-accuracy", [68, 71, 70, 74, 76, 75, 79, 81], CLR.green, { h: 90 });

/* Block Priority Score — ranks blocks needing attention; Block 4NW is the
   same block already flagged in Health & Yield's priority-alert card */
const c4priority = document.getElementById("c4-priority-list");
[["Block 4NW · 2 of 2 cycles", "92", CLR.red], ["Block 3SW", "61", CLR.amber], ["Block 2SE", "34", CLR.green], ["Block 1NE", "18", CLR.green]].forEach(([n, v, c]) => {
  const row = document.createElement("div"); row.className = "list-row";
  row.innerHTML = `<span class="dot" style="background:${c}"></span><span class="name">${n}</span><span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v}%;background:${c}"></span></span></span><span class="val mono">${v}</span>`;
  c4priority.appendChild(row);
});

/* AI Data Quality by source — same imagery sources as the Health tab;
   Landsat is the one already shown stale there, and it's dragging the
   quality score down here too */
const c4quality = document.getElementById("c4-quality-sources");
[["Drone", "96", CLR.green], ["Sentinel-2", "94", CLR.green], ["Landsat", "71", CLR.amber], ["AI Fusion", "90", CLR.green]].forEach(([n, v, c]) => {
  const row = document.createElement("div"); row.className = "list-row";
  row.innerHTML = `<span class="dot" style="background:${c}"></span><span class="name">${n}</span><span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v}%;background:${c}"></span></span></span><span class="val mono">${v}</span>`;
  c4quality.appendChild(row);
});
