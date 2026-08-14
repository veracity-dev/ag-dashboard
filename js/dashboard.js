/* ================================================================
   Veracity — Field Monitor  |  Chart.js v4 implementation
   ================================================================ */

/* ---- theme ---- */
const THEME_KEY = 'vfm-theme';
const THEME = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

/* ---- resolved color palettes (canvas can't read CSS vars) — must
   mirror the light/dark tokens in styles/styles.css ---- */
const THEME_PALETTES = {
  light: {
    green:    '#2f9457',
    greenDim: '#1f7442',
    greenDeep:'#d7efe0',
    green2:   '#4fb377',
    amber:    '#b8791a',
    blue:     '#2f6fa3',
    red:      '#c14a3d',
    accent:   '#196f82',
    accentDim:'#124f5d',
    surface:  '#ffffff',
    surface2: '#eef2f5',
    surface3: '#e2e8ed',
    border:   '#dde3e9',
    text:     '#17232c',
    textDim:  '#55636f',
    textFaint:'#8794a1',
  },
  dark: {
    green:    '#8ed14f',
    greenDim: '#4f8a3a',
    greenDeep:'#2c4a26',
    green2:   '#a8d86a',
    amber:    '#f2b134',
    blue:     '#5fa8d3',
    red:      '#e2685a',
    accent:   '#49b2ca',
    accentDim:'#2e8698',
    surface:  '#171f28',
    surface2: '#1e2733',
    surface3: '#26313d',
    border:   '#2c3946',
    text:     '#eef2f5',
    textDim:  '#8b97a3',
    textFaint:'#576270',
  },
};
const CLR = THEME_PALETTES[THEME];

/* resolve a CSS var string or pass hex through */
const rc = c => ({
  'var(--green)':      CLR.green,
  'var(--green-dim)':  CLR.greenDim,
  'var(--amber)':      CLR.amber,
  'var(--blue)':       CLR.blue,
  'var(--red)':        CLR.red,
  'var(--accent)':     CLR.accent,
  'var(--accent-dim)': CLR.accentDim,
  'var(--surface-3)':  CLR.surface3,
  'var(--text-faint)': CLR.textFaint,
}[c] || c);

/* ---- theme switch (sidebar) ---- */
document.querySelectorAll('.theme-opt').forEach(btn => {
  btn.classList.toggle('active', btn.dataset.themeChoice === THEME);
  btn.addEventListener('click', () => {
    if (btn.dataset.themeChoice === THEME) return;
    localStorage.setItem(THEME_KEY, btn.dataset.themeChoice);
    location.reload();
  });
});

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

/* create a canvas inside a container div, set container height.
   Pass a falsy h (or opts.fill in the chart wrappers) to instead stretch
   the container to fill its flex parent, e.g. to match a paired card's
   height instead of a fixed pixel value. */
function mkCanvas(id, h) {
  const wrap = document.getElementById(id);
  if (h) {
    wrap.style.height = h + 'px';
  } else {
    wrap.style.flex = '1';
    wrap.style.minHeight = '0';
  }
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  return canvas;
}

/* line / area chart — renders into div#id. Pass opts.timeSeries to render
   a full chart (axes + hover tooltip) instead of the default bare sparkline. */
function lineChart(id, values, color, opts = {}) {
  const col = rc(color);
  const canvas = mkCanvas(id, opts.fill ? 0 : (opts.h || 120));
  /* tap/hover any point to "investigate" it — shows the exact date
     (from opts.labels) plus the value and, when the caller passes
     opts.bandFn (a value -> {label} lookup, e.g. Good/Watch/Act),
     the quality that value represents at that point in time */
  const interactive = opts.timeSeries || opts.endpointsOnly;
  return new Chart(canvas, {
    type: 'line',
    plugins: opts.chartPlugins || [],
    data: {
      labels: opts.labels || values.map(() => ''),
      datasets: [{
        data: values,
        borderColor: col,
        backgroundColor: col + '38',
        fill: true,
        tension: 0.35,
        pointRadius: opts.dots ? 3 : 0,
        pointHoverRadius: opts.dots ? 5 : (opts.endpointsOnly ? 4 : 0),
        pointHoverBackgroundColor: col,
        pointBackgroundColor: col,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: interactive ? { mode: 'index', intersect: false } : undefined,
      plugins: {
        legend: { display: false },
        tooltip: interactive ? {
          enabled: true, backgroundColor: CLR.surface2, borderColor: CLR.border, borderWidth: 1,
          titleColor: CLR.textDim, bodyColor: CLR.text, padding: 9,
          callbacks: opts.bandFn ? {
            label: ctx => {
              const v = ctx.parsed.y;
              const band = opts.bandFn(v);
              return `${v}${opts.unit || ''} — ${band.label}`;
            }
          } : undefined,
        } : { enabled: false }
      },
      scales: opts.timeSeries ? {
        x: { grid: { color: CLR.border + '60' }, ticks: { font: { size: 8.5 }, maxRotation: 0, color: CLR.textFaint } },
        y: {
          grid: { color: CLR.border },
          ticks: { font: { size: 8.5 }, color: CLR.textFaint, ...(opts.ySuffix ? { callback: v => v + opts.ySuffix } : {}) },
          title: opts.yLabel ? { display: true, text: opts.yLabel, font: { size: 9 }, color: CLR.textFaint } : undefined
        }
      } : opts.endpointsOnly ? {
        /* a full axis is too much for a 50px-tall tile — show just the
           start and end date so the timeline is still legible without
           turning the sparkline into something that needs reading */
        x: {
          display: true, grid: { display: false }, border: { display: false },
          ticks: {
            font: { size: 9 }, color: CLR.textFaint, maxRotation: 0, autoSkip: false, padding: 4,
            callback: (val, idx, ticks) => (idx === 0 || idx === ticks.length - 1) ? ((opts.labels || [])[idx] || '') : ''
          }
        },
        y: { display: false }
      } : { x: { display: false }, y: { display: false } }
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

/* shared dark-theme tooltip style used by ring/pie hover states */
const HOVER_TOOLTIP = {
  enabled: true,
  backgroundColor: CLR.surface2, borderColor: CLR.border, borderWidth: 1,
  titleColor: CLR.textDim, bodyColor: CLR.text, padding: 9, displayColors: true,
  boxPadding: 3,
};

/* ring / doughnut — returns a canvas node (caller appends it) */
function ringChart(pct, color, size = 90, stroke = 9, track, opts = {}) {
  const col = rc(color);
  const canvas = document.createElement('canvas');
  canvas.width  = size * 2;  /* 2× for retina sharpness */
  canvas.height = size * 2;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  const cutout = Math.round((1 - (stroke * 2) / size) * 100) + '%';
  const valueLabel = opts.label || 'Value';
  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: [valueLabel, 'Remaining'],
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: [col, track || CLR.surface3],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: false, cutout,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...HOVER_TOOLTIP,
          callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}%` }
        }
      }
    }
  });
  return canvas;
}

/* pie / doughnut — returns a canvas node. segments: [{v, color, label}] */
function pieChart(segments, size = 110) {
  const canvas = document.createElement('canvas');
  canvas.width  = size * 2;
  canvas.height = size * 2;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  const total = segments.reduce((a, s) => a + s.v, 0);
  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: segments.map(s => s.label || ''),
      datasets: [{
        data: segments.map(s => s.v),
        backgroundColor: segments.map(s => rc(s.color)),
        borderWidth: 2,
        borderColor: CLR.surface,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: false, cutout: '45%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...HOVER_TOOLTIP,
          callbacks: {
            label: ctx => {
              const pct = Math.round(ctx.parsed / total * 100);
              return `${ctx.label ? ctx.label + ': ' : ''}${ctx.parsed} (${pct}%)`;
            }
          }
        }
      }
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
  const canvas = mkCanvas(id, opts.fill ? 0 : (opts.h || 190));

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
  const canvas = mkCanvas(id, opts.fill ? 0 : (opts.h || 160));
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
   VIEW 1 — Crop Health & Disease Intelligence (Section A)
   ================================================================ */
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
multiLineChart("c1-yield-forecast", c1yieldSeries, c1yWeeks, { fill: true, dualAxis: true, yLabel: "kg/ha", y1Label: "LKR M", y1Suffix: 'M' });
const c1yLegend = document.getElementById("c1-yield-forecast-legend");
c1yieldSeries.forEach(s => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.label}`; c1yLegend.appendChild(d);
});

/* Yield history — actual monthly green-leaf yield, this season vs. last
   season (kg/ha), replacing the old Block 2NW spotlight banner. */
const c1yhMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const c1yieldHistorySeries = [
  { label: "This season (kg/ha)", color: "var(--green)", data: [1650, 1700, 1780, 1900, 2050, 2150, 2200, 2180, 2100, 1980, 1850, 1820] },
  { label: "Last season (kg/ha)",  color: "var(--text-faint)", data: [1580, 1620, 1690, 1810, 1960, 2050, 2100, 2080, 2010, 1900, 1780, 1750] },
];
multiLineChart("c1-yield-history", c1yieldHistorySeries, c1yhMonths, { h: 160, yLabel: "kg/ha" });
const c1yhLegend = document.getElementById("c1-yield-history-legend");
c1yieldHistorySeries.forEach(s => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.label}`; c1yhLegend.appendChild(d);
});

/* Yield Anomaly Index — % gap between current and expected yield.
   Good >=0% vs. baseline · watch -5 to -10% · act <-10%. Estate is
   currently ahead of a normal season, having recovered from a small
   deficit a few weeks back. */
lineChart("yf-anomaly-spark", [-2, -1, 0, 1, 2, 2.5, 3, 3.2], CLR.green, { h: 80, dots: false });

/* Revenue Protected — value of crop saved via early disease detection
   (Section A's disease KPIs turned into a rupee figure). Target:
   positive and increasing over time. Same $18,420 headline figure as
   the estate-overview tile, so the two tabs agree. */
lineChart("yf-protected-spark", [14200, 15100, 15800, 16400, 17200, 17800, 18420], CLR.green, { h: 70, dots: false });

/* Revenue at Risk — financial exposure from drought/crop stress,
   reusing the same series already plotted on the Yield & Financial
   Trend chart so the current value (LKR 9.5M) matches everywhere it
   appears. Target: 0 or decreasing. */
lineChart("yf-risk-spark", [15.2, 14.5, 13.9, 13.2, 12.6, 12.0, 11.4, 10.9, 10.4, 10.0, 9.7, 9.5], CLR.amber, { h: 70, dots: false });

mount("c4-pie", pieChart([{ v:34,color:CLR.green,label:"Fertilizer" },{ v:22,color:CLR.blue,label:"Pesticide" },{ v:28,color:CLR.amber,label:"Irrigation" },{ v:16,color:CLR.red,label:"Labor" }]));
const pieLegend = document.getElementById("c4-pie-legend");
[["Fertilizer",CLR.green],["Pesticide",CLR.blue],["Irrigation",CLR.amber],["Labor",CLR.red]].forEach(([n, c]) => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${c}"></span>${n}`; pieLegend.appendChild(d);
});

document.getElementById("c4-ring1").appendChild(ringChart(64, CLR.green, 100, 10, null, { label: "Saved" })); centerLabel("c4-ring1", "$6,840", "saved / qtr");
mount("c4-pie2", pieChart([{ v:45,color:CLR.green,label:"Above baseline" },{ v:35,color:CLR.surface3,label:"At baseline" },{ v:20,color:CLR.red,label:"Below baseline" }], 90));

/* Input cost savings — trend over time, by category (same categories/
   colors as the "Input cost savings by category" pie above) */
const c4costMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"];
const c4costSeries = [
  { label: "Fertilizer", color: "var(--green)", data: [200, 230, 255, 275, 295, 310, 325, 340] },
  { label: "Pesticide",  color: "var(--blue)",  data: [130, 145, 160, 175, 190, 200, 210, 220] },
  { label: "Irrigation", color: "var(--amber)", data: [160, 180, 200, 220, 240, 255, 270, 280] },
  { label: "Labor",      color: "var(--red)",   data: [90, 100, 110, 120, 130, 140, 150, 160] },
];
multiLineChart("c4-cost-trend", c4costSeries, c4costMonths, { h: 160, yLabel: "LKR '000" });
const c4costLegend = document.getElementById("c4-cost-trend-legend");
c4costSeries.forEach(s => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.label}`; c4costLegend.appendChild(d);
});

/* ================================================================
   VIEW 2 — Input & Resource Utilization (Section B)
   Nutrient Management, Chemical Input Management, plus the estate's
   existing Water/Irrigation and Labour/Drone widgets kept as
   supplementary (not named in the KPI framework doc, not contradicted
   by it either).
   ================================================================ */
/* Nitrogen Use Reduction — application volume trend, blanket baseline
   vs. targeted (deficiency-zone-guided) application, Nutrient
   Management group. Same shape as Agrochemical Use Reduction below,
   for the nitrogen/fertiliser side of input spend. */
const irNMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"];
const irNSeries = [
  { label: "Blanket (baseline)",    color: "var(--text-faint)", data: [100, 100, 100, 100, 100, 100, 100, 100] },
  { label: "Targeted application",  color: "var(--green)",      data: [97, 94, 91, 89, 87, 86, 85, 85] },
];
multiLineChart("ir-n-trend", irNSeries, irNMonths, { fill: true, yLabel: "Index" });
const irNLegend = document.getElementById("ir-n-trend-legend");
irNSeries.forEach(s => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.label}`; irNLegend.appendChild(d);
});

barChart("ir-n-bars", [100, 85], (i) => i === 0 ? CLR.textFaint : CLR.green, { h: 100, labels: ["Blanket", "Targeted"] });
const irNBarsRows = document.getElementById("ir-n-bars-rows");
[["Reduction vs. baseline", "15%"], ["Deficiency area remaining", "4% of estate"]].forEach(([k, v]) => {
  const r = document.createElement("div"); r.className = "mini-row"; r.innerHTML = `<span class="k">${k}</span><span class="v mono">${v}</span>`; irNBarsRows.appendChild(r);
});

/* Agrochemical Use Reduction — application volume trend, blanket
   baseline vs. targeted (image-guided) spraying, Group C */
const c2agroMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"];
const c2agroSeries = [
  { label: "Blanket (baseline)",    color: "var(--text-faint)", data: [100, 100, 100, 100, 100, 100, 100, 100] },
  { label: "Targeted application",  color: "var(--green)",      data: [96, 93, 90, 88, 86, 84, 83, 82] },
];
multiLineChart("c2-agro-trend", c2agroSeries, c2agroMonths, { fill: true, yLabel: "Index" });
const c2agroLegend = document.getElementById("c2-agro-trend-legend");
c2agroSeries.forEach(s => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${s.color}"></span>${s.label}`; c2agroLegend.appendChild(d);
});

/* Water Use Efficiency (WUE) — kg made-tea / m3 water, vs. an estate benchmark of 3.5 */
document.getElementById("c2-ring").appendChild(ringChart(91, CLR.green, 110, 10, null, { label: "WUE" }));
centerLabel("c2-ring", "3.2", "kg/m³");

/* quick-glance status — one headline stat per resource group */
const c2icons = document.getElementById("c2-icons");
[["Fertiliser rate","142 kg/ha","var(--green)"],["Irrigation applied","38 m³/ha","var(--green)"],["Targeted spray area","34% of block","var(--amber)"],["Labour hours saved","126 hrs/ha","var(--green)"],["Drone flight hours","18 hrs this mo","var(--green)"]].forEach(([l, v, dot]) => {
  const c = document.createElement("div"); c.className = "icon-stat";
  c.innerHTML = `<div class="icon-btn"><span class="dot" style="background:${dot}"></span></div><div class="n mono">${v}</div><div class="l">${l}</div>`;
  c2icons.appendChild(c);
});

/* Fertiliser Cost Efficiency (FCE) — LKR per kg yield, trending down = improving */
lineChart("c2-a1", [42, 41, 40, 39, 38, 37, 36, 35], CLR.green, {
  h: 140, timeSeries: true, dots: true,
  labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"],
});

/* Irrigation Trigger Compliance — % of decisions image-supported, target >=80% */
document.getElementById("c2-irrigation-ring").appendChild(ringChart(83, CLR.green, 90, 9, null, { label: "Compliant" }));
centerLabel("c2-irrigation-ring", "83%", "compliant");

/* Agrochemical Use Reduction — blanket vs. targeted application, indexed */
barChart("c2-bars", [100, 82], (i) => i === 0 ? CLR.textFaint : CLR.green, { h: 100, labels: ["Blanket", "Targeted"] });
const c2barsRows = document.getElementById("c2-bars-rows");
[["Reduction vs. baseline", "18%"], ["Target range", "10–20%"]].forEach(([k, v]) => {
  const r = document.createElement("div"); r.className = "mini-row"; r.innerHTML = `<span class="k">${k}</span><span class="v mono">${v}</span>`; c2barsRows.appendChild(r);
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
   VIEW 3 — Soil Health: Soil Risk Map (erosion / waterlogging)
   Reads the same block boundaries drawn on the Digital Twin map —
   shares its localStorage key by value (not by variable reference,
   since this code runs before Digital Twin's own consts are defined
   further down the file) so blocks drawn there just show up here,
   colored by whichever soil-risk layer is selected. Read-only: no
   drawing tools here, Digital Twin owns the boundaries themselves. */
const SOIL_RISK_STORAGE_KEY = "vfm-estate-blocks";
const SOIL_RISK_CENTER = [6.4820373, 80.1045973];
const SOIL_RISK_LAYER_LABEL = { erosion: "Erosion Risk", waterlogging: "Waterlogging Risk" };

function soilRiskBand(v) {
  if (v < 20) return { label: "Good", color: CLR.green };
  if (v < 50) return { label: "Watch", color: CLR.amber };
  return { label: "Act", color: CLR.red };
}

/* placeholder generator standing in for a real erosion/waterlogging
   model — skewed healthy, same convention as the Digital Twin KPIs.
   Generated once per block and persisted, not re-rolled every load. */
function generateSoilRisk() {
  const biased = () => Math.round(Math.pow(Math.random(), 1.8) * 70);
  return { erosion: biased(), waterlogging: biased() };
}

(function () {
  const mapHost = document.getElementById("soil-risk-map");
  if (!mapHost || typeof L === "undefined") return;

  const map = L.map(mapHost, { center: SOIL_RISK_CENTER, zoom: 18 });
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 21,
    attribution: "Imagery &copy; Esri",
  }).addTo(map);

  let layer = "erosion";
  let blocks = [];
  const polysById = {};

  function load() {
    try {
      const raw = localStorage.getItem(SOIL_RISK_STORAGE_KEY);
      blocks = raw ? JSON.parse(raw) : [];
    } catch (e) { blocks = []; }
    let backfilled = false;
    blocks.forEach(b => {
      if (!b.soilRisk || !Number.isFinite(b.soilRisk.erosion) || !Number.isFinite(b.soilRisk.waterlogging)) {
        b.soilRisk = generateSoilRisk();
        backfilled = true;
      }
    });
    if (backfilled) {
      try { localStorage.setItem(SOIL_RISK_STORAGE_KEY, JSON.stringify(blocks)); } catch (e) {}
    }
  }

  function renderLegend() {
    const leg = document.getElementById("soil-risk-legend");
    leg.innerHTML = "";
    [["Good · <20%", CLR.green], ["Watch · 20–50%", CLR.amber], ["Act · ≥50%", CLR.red]].forEach(([label, color]) => {
      const d = document.createElement("div"); d.className = "legend-item";
      d.innerHTML = `<span class="dot" style="background:${color}"></span>${label}`;
      leg.appendChild(d);
    });
  }

  function drawBlocks() {
    Object.values(polysById).forEach(p => map.removeLayer(p));
    for (const k in polysById) delete polysById[k];
    blocks.forEach(b => {
      const value = b.soilRisk[layer];
      const band = soilRiskBand(value);
      const poly = L.polygon(b.latlngs.map(p => [p.lat, p.lng]), {
        color: "rgba(238,242,245,0.75)", weight: 1.5, fillColor: band.color, fillOpacity: 0.55,
      });
      poly.bindTooltip(`${b.name} · ${SOIL_RISK_LAYER_LABEL[layer]}: ${value}% (${band.label})`, { sticky: true });
      poly.addTo(map);
      polysById[b.id] = poly;
    });
    document.getElementById("soil-risk-empty").style.display = blocks.length ? "none" : "block";
  }

  function refresh() { load(); drawBlocks(); }

  refresh();
  renderLegend();

  document.getElementById("soil-risk-layers").addEventListener("click", (e) => {
    const btn = e.target.closest(".pill-btn"); if (!btn) return;
    layer = btn.dataset.layer;
    document.querySelectorAll("#soil-risk-layers .pill-btn").forEach(b => b.classList.toggle("active", b === btn));
    drawBlocks();
  });

  /* Leaflet sizes itself at 0x0 while its tab is hidden, and blocks
     may have changed since this tab last rendered (e.g. a new one
     drawn on Digital Twin) — resync both whenever this tab is opened */
  document.getElementById("tabs").addEventListener("click", (e) => {
    if (e.target.closest('[data-view="v3"]')) setTimeout(() => { refresh(); map.invalidateSize(); }, 40);
  });
})();

/* ================================================================
   VIEW 4 — Predictive & AI Trend Indicators (Section E)
   Hero card is the 30-Day Yield Forecast, benchmarked block-by-block
   rather than as one universal figure. Reuses the Drone/Sentinel-2/
   Landsat/AI Fusion imagery-source identities from the Crop Health
   tab's imagery widget, so this tab reads as the AI layer behind
   those alerts rather than a disconnected page.
   ================================================================ */
/* 30-Day Yield Forecast — predicted green-leaf yield vs. each block's
   own historical baseline (folds in the old per-hectare "Green Leaf
   Yield Estimate" so it isn't shown to the owner twice). Same four
   named blocks and yield deltas as the Digital Twin's yield-vs-baseline
   layer, so the numbers agree tab to tab. */
groupedBarChart("c4-confidence-trend", ["Block 1NE", "Block 2SE", "Block 3SW", "Block 4NW"],
  [{ values: [2320, 2160, 1960, 1530] }, { values: [2130, 2080, 2020, 1780] }],
  [CLR.blue, CLR.textFaint], { h: 210 });
const c4confLegend = document.getElementById("c4-confidence-trend-legend");
[["30-day forecast (kg/ha)", CLR.blue], ["Block baseline (kg/ha)", CLR.textFaint]].forEach(([n, c]) => {
  const d = document.createElement("div"); d.className = "legend-item";
  d.innerHTML = `<span class="dot" style="background:${c}"></span>${n}`; c4confLegend.appendChild(d);
});

/* AI Data Quality Score — target >85/100 */
document.getElementById("c4-quality-ring").appendChild(ringChart(88, CLR.green, 110, 10, null, { label: "Quality score" }));
centerLabel("c4-quality-ring", "88", "quality score");

/* quick AI-ops status strip */
const c4icons = document.getElementById("c4-icons");
[["Model confidence","84%","var(--green)"],["Blocks at high priority","3","var(--amber)"],["Cloud-contaminated scenes","2","var(--amber)"],["Avg forecast error","9.4%","var(--green)"],["Recs this cycle","14","var(--green)"]].forEach(([l, v, dot]) => {
  const c = document.createElement("div"); c.className = "icon-stat";
  c.innerHTML = `<div class="icon-btn"><span class="dot" style="background:${dot}"></span></div><div class="n mono">${v}</div><div class="l">${l}</div>`;
  c4icons.appendChild(c);
});

/* Forecast error — target <=10-15% after calibration */
document.getElementById("c4-ring2").appendChild(ringChart(9, CLR.green, 100, 10, null, { label: "Forecast error" })); centerLabel("c4-ring2", "9%", "forecast error");

/* 14-Day Disease Risk Probability by block — target <20%, watch 20-50%, act >=50% */
const c4risk = document.getElementById("c4-disease-risk");
[["Block 1NE", "12%", CLR.green], ["Block 2SE", "18%", CLR.green], ["Block 3SW", "34%", CLR.amber], ["Block 4NW", "58%", CLR.red]].forEach(([n, v, c]) => {
  const row = document.createElement("div"); row.className = "list-row";
  row.innerHTML = `<span class="dot" style="background:${c}"></span><span class="name">${n}</span><span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v};background:${c}"></span></span></span><span class="val mono">${v}</span>`;
  c4risk.appendChild(row);
});

/* Fertiliser Recommendation Accuracy — improving cycle over cycle */
lineChart("c4-fert-accuracy", [68, 71, 70, 74, 76, 75, 79, 81], CLR.green, {
  h: 140, timeSeries: true, dots: true,
  labels: ["C1","C2","C3","C4","C5","C6","C7","C8"],
  yLabel: "Accuracy", ySuffix: "%",
});

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

/* ================================================================
   VIEW 1 — Crop Health & Disease: estate block map (draw-your-own)
   A real satellite map centered on the estate's own coordinates.
   Blocks are hand-drawn polygons (Leaflet.draw), persisted to
   localStorage — there's no backend yet, so boundaries live in the
   browser until this is wired to a real store. Selecting a block (or
   "All blocks") drives an 8-tile KPI panel; "All blocks" is the plain
   average of every drawn block's KPI values.
   ================================================================ */
const DT_STORAGE_KEY = "vfm-estate-blocks";
const DT_CENTER = [6.4820373, 80.1045973]; /* the estate, from the Google Maps pin */

const KPI_DEFS = [
  { key: "blockHealth",   label: "Block Health Score",       unit: "",  goodIsHigh: true,  t1: 60, t2: 80 },
  { key: "vigor",         label: "Crop Vigor Score",         unit: "",  goodIsHigh: true,  t1: 70, t2: 85 },
  { key: "canopy",        label: "Canopy Density Score",     unit: "",  goodIsHigh: true,  t1: 60, t2: 80 },
  { key: "moistureStress",label: "Moisture Stress Score",    unit: "",  goodIsHigh: false, t1: 20, t2: 45 },
  { key: "nitrogenStress",label: "Nitrogen Stress Score",    unit: "",  goodIsHigh: false, t1: 15, t2: 35 },
  { key: "heatStress",    label: "Heat Stress Score",        unit: "",  goodIsHigh: false, t1: 20, t2: 40 },
  { key: "diseaseRisk",   label: "Disease Risk Score",       unit: "%", goodIsHigh: false, t1: 20, t2: 50 },
  { key: "hotspot",       label: "Disease Hotspot Coverage", unit: "%", goodIsHigh: false, t1: 5,  t2: 15 },
  { key: "spreadRate",    label: "Disease Spread Rate",      unit: "%", goodIsHigh: false, t1: 0,  t2: 5  },
];
const DT_RISK_DEF = KPI_DEFS.find(d => d.key === "diseaseRisk");
const DT_HEALTH_DEF = KPI_DEFS.find(d => d.key === "blockHealth");
const DT_SNAPSHOT_DEFS = KPI_DEFS.filter(d => d.key !== "blockHealth"); /* the snapshot tiles show all of these */

/* trend history: kept to 8 weekly points — enough to read a direction
   without turning every tile into something that needs to be studied.
   Labelled with real calendar dates (not "W1..W8") so the timeline
   itself, including a month rolling over, is legible at a glance. */
const DT_WEEKS = 8;
const DT_WEEK_LABELS = Array.from({ length: DT_WEEKS }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (DT_WEEKS - 1 - i) * 7);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
});

function kpiBand(def, v) {
  if (def.goodIsHigh) {
    if (v >= def.t2) return { label: "Good", color: CLR.green, cls: "up" };
    if (v >= def.t1) return { label: "Watch", color: CLR.amber, cls: "watch" };
    return { label: "Act", color: CLR.red, cls: "down" };
  }
  if (v <= def.t1) return { label: "Good", color: CLR.green, cls: "up" };
  if (v <= def.t2) return { label: "Watch", color: CLR.amber, cls: "watch" };
  return { label: "Act", color: CLR.red, cls: "down" };
}

/* plain-language trend direction for a history series — phrased around
   "is this getting better or worse" rather than raw up/down, since a
   rising Moisture Stress Score is bad while a rising Crop Vigor Score
   is good; a factory-floor reader shouldn't have to work that out */
function trendPhrase(def, series) {
  const delta = series[series.length - 1] - series[0];
  const flat = def.key === "spreadRate" ? 0.8 : def.key === "hotspot" ? 1.5 : 2.5;
  if (Math.abs(delta) < flat) return { text: "Steady", cls: "info" };
  const improving = def.goodIsHigh ? delta > 0 : delta < 0;
  return improving ? { text: "Improving", cls: "up" } : { text: "Worsening", cls: "down" };
}

/* shades the Good/Watch/Act zones behind an expanded chart's line, using
   whatever y-range Chart.js actually settled on — the "full picture" view
   is where this context earns its keep; the compact tiles stay plain */
function kpiBandZonePlugin(def) {
  return {
    id: "kpiBandZones",
    beforeDraw(chart) {
      const { ctx, chartArea, scales: { y } } = chart;
      if (!chartArea) return;
      const zones = def.goodIsHigh
        ? [[y.min, def.t1, CLR.red], [def.t1, def.t2, CLR.amber], [def.t2, y.max, CLR.green]]
        : [[y.min, def.t1, CLR.green], [def.t1, def.t2, CLR.amber], [def.t2, y.max, CLR.red]];
      zones.forEach(([lo, hi, col]) => {
        const loC = Math.max(lo, y.min), hiC = Math.min(hi, y.max);
        if (hiC <= loC) return;
        ctx.save();
        ctx.fillStyle = col; ctx.globalAlpha = 0.08;
        ctx.fillRect(chartArea.left, y.getPixelForValue(hiC), chartArea.width, y.getPixelForValue(loC) - y.getPixelForValue(hiC));
        ctx.restore();
      });
    }
  };
}

/* plain-language description of a KPI's Good/Watch/Act thresholds,
   shown under the expanded chart so the shaded zones are self-explanatory */
function kpiBandLegend(def) {
  const fmt = v => `${v}${def.unit}`;
  const zones = def.goodIsHigh
    ? [["Good", `≥ ${fmt(def.t2)}`, CLR.green], ["Watch", `${fmt(def.t1)}–${fmt(def.t2)}`, CLR.amber], ["Act", `< ${fmt(def.t1)}`, CLR.red]]
    : [["Good", `≤ ${fmt(def.t1)}`, CLR.green], ["Watch", `${fmt(def.t1)}–${fmt(def.t2)}`, CLR.amber], ["Act", `> ${fmt(def.t2)}`, CLR.red]];
  return zones.map(([label, range, color]) =>
    `<span class="legend-item"><span class="dot" style="background:${color}"></span>${label} · ${range}</span>`
  ).join("");
}

/* "investigate" modal — the full picture behind any compact sparkline:
   full date axis, real dots on every point, tap-for-detail tooltips
   (inherited from lineChart's timeSeries mode) and the Good/Watch/Act
   zones shaded in behind the line so the numbers have context. */
function openChartModal(def, series, rawVal, scopeLabel) {
  const band = kpiBand(def, rawVal);
  const trend = trendPhrase(def, series);
  const displayVal = Number.isInteger(rawVal) ? rawVal : Math.round(rawVal * 10) / 10;

  document.getElementById("dt-modal-scope").textContent = scopeLabel;
  document.getElementById("dt-modal-title").textContent = def.label;
  document.getElementById("dt-modal-stats").innerHTML = `
    <span class="n mono" style="color:${band.color}">${displayVal}${def.unit}</span>
    <span class="delta ${band.cls}">${band.label}</span>
    <span class="delta ${trend.cls}">${trend.text}</span>
    <span class="card-sub" style="margin:0;">over the last ${DT_WEEKS} weeks · tap any point to inspect it</span>`;

  resetChartHost("dt-modal-chart");
  lineChart("dt-modal-chart", series, band.color, {
    fill: true, timeSeries: true, dots: true, labels: DT_WEEK_LABELS,
    unit: def.unit, bandFn: v => kpiBand(def, v),
    chartPlugins: [kpiBandZonePlugin(def)],
  });
  document.getElementById("dt-modal-legend").innerHTML = kpiBandLegend(def);

  const modal = document.getElementById("dt-chart-modal");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("dt-modal-close").focus();
}
function closeChartModal() {
  const modal = document.getElementById("dt-chart-modal");
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = "";
  resetChartHost("dt-modal-chart");
}
document.getElementById("dt-modal-close").addEventListener("click", closeChartModal);
document.getElementById("dt-chart-modal").addEventListener("click", e => { if (e.target.id === "dt-chart-modal") closeChartModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeChartModal(); });

/* placeholder KPI generator, standing in for a real satellite/drone
   feed — skewed toward the healthy end so a freshly-drawn block reads
   as plausible rather than alarming by default */
function generateBlockKpis() {
  const biased = (min, max, goodIsHigh) => {
    let t = Math.pow(Math.random(), 1.6);
    if (goodIsHigh) t = 1 - t;
    return Math.round(min + t * (max - min));
  };
  const vigor = biased(55, 97, true);
  const canopy = biased(45, 96, true);
  const diseaseRisk = biased(3, 62, false);
  return {
    /* the top-line indicator: canopy strength + structure + disease
       signal folded into one number, same framing as the Crop Health
       & Disease tab's Block Health Score */
    blockHealth: Math.round(0.4 * vigor + 0.3 * canopy + 0.3 * (100 - diseaseRisk)),
    vigor,
    canopy,
    moistureStress: biased(3, 60, false),
    nitrogenStress: biased(2, 48, false),
    heatStress: biased(3, 48, false),
    diseaseRisk,
    hotspot: biased(0, 22, false),
    spreadRate: biased(-4, 9, false),
  };
}

/* backward random-walk from the current snapshot value — cheap stand-in
   for real weekly history, guaranteed to land exactly on today's number */
function generateHistory(current, key) {
  const bounds = key === "spreadRate" ? [-6, 12] : [0, 100];
  const step = key === "spreadRate" ? 1.1 : key === "hotspot" ? 2 : 3.5;
  current = Number.isFinite(current) ? current : 0;
  const seq = [current];
  for (let i = 1; i < DT_WEEKS; i++) {
    const v = Math.max(bounds[0], Math.min(bounds[1], seq[seq.length - 1] + (Math.random() - 0.5) * 2 * step));
    seq.push(Math.round(v * 10) / 10);
  }
  return seq.reverse();
}
function generateBlockHistory(kpi) {
  const history = {};
  KPI_DEFS.forEach(def => { history[def.key] = generateHistory(kpi[def.key], def.key); });
  return history;
}

function repairBlockKpis(block) {
  block.kpi = block.kpi || {};
  if (!Number.isFinite(block.kpi.vigor)) block.kpi.vigor = 75;
  if (!Number.isFinite(block.kpi.canopy)) block.kpi.canopy = 75;
  if (!Number.isFinite(block.kpi.diseaseRisk)) block.kpi.diseaseRisk = Number.isFinite(block.risk) ? block.risk : 20;
  if (!Number.isFinite(block.kpi.blockHealth)) {
    block.kpi.blockHealth = Math.round(0.4 * block.kpi.vigor + 0.3 * block.kpi.canopy + 0.3 * (100 - block.kpi.diseaseRisk));
  }
  KPI_DEFS.forEach(def => {
    if (!Number.isFinite(block.kpi[def.key])) block.kpi[def.key] = generateBlockKpis()[def.key];
  });

  block.history = block.history || {};
  KPI_DEFS.forEach(def => {
    if (!Array.isArray(block.history[def.key]) || block.history[def.key].some(v => !Number.isFinite(v))) {
      block.history[def.key] = generateHistory(block.kpi[def.key], def.key);
    }
  });
}

function dtAverageKpis(blocks) {
  const avg = {};
  KPI_DEFS.forEach(def => {
    const vals = blocks.map(b => b.kpi && b.kpi[def.key]).filter(Number.isFinite);
    avg[def.key] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  });
  return avg;
}
function dtAverageHistory(blocks, key) {
  return Array.from({ length: DT_WEEKS }, (_, i) => {
    const vals = blocks.map(b => b.history && b.history[key] && b.history[key][i]).filter(Number.isFinite);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  });
}

/* clears a chart container before re-rendering into it — lineChart()
   always appends a fresh canvas, so without this, re-selecting blocks
   would stack up a new chart on top of the old one every time */
function resetChartHost(id) {
  const host = document.getElementById(id);
  if (!host) return;
  host.querySelectorAll("canvas").forEach(c => { const ch = Chart.getChart(c); if (ch) ch.destroy(); });
  host.innerHTML = "";
}

/* stretches a trailing lone tile to fill its row instead of leaving a
   gap next to it — computed from the grid's actual current column
   count, so it self-corrects at any breakpoint and for any tile count
   instead of relying on the tile count happening to divide evenly */
function fillTrailingGridGap(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  const items = Array.from(grid.children);
  items.forEach(el => { el.style.gridColumn = ""; });
  if (!items.length) return;
  const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
  const remainder = items.length % cols;
  if (cols > 1 && remainder !== 0) {
    items[items.length - 1].style.gridColumn = `span ${cols - remainder + 1}`;
  }
}
let dtGapFillTimer = null;
function scheduleGapFill() {
  clearTimeout(dtGapFillTimer);
  dtGapFillTimer = setTimeout(() => {
    fillTrailingGridGap("dt-kpi-grid");
    fillTrailingGridGap("dt-trend-grid");
  }, 60);
}
window.addEventListener("resize", scheduleGapFill);

(function () {
  const mapHost = document.getElementById("dt-map");
  if (!mapHost || typeof L === "undefined") return;

  const map = L.map(mapHost, { center: DT_CENTER, zoom: 18 });
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 21,
    attribution: "Imagery &copy; Esri",
  }).addTo(map);

  const drawnItems = new L.FeatureGroup().addTo(map);
  const POLYGON_OPTS = { allowIntersection: false, showArea: false, shapeOptions: { color: CLR.text } };
  /* topright, not topleft: the control's own "Finish / Delete last
     point / Cancel" action toolbar pops up fixed next to it while
     drawing, and topleft is exactly where people instinctively start
     tracing a boundary — clicks meant for the map were landing on
     that overlay instead of placing a vertex */
  map.addControl(new L.Control.Draw({
    position: "topright",
    draw: {
      polygon: POLYGON_OPTS,
      polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
    },
    edit: { featureGroup: drawnItems, remove: true },
  }));

  /* the map's own polygon icon deactivates after every shape, so it's
     easy to lose track of — a persistent "+ New block" button in the
     card toolbar (outside the map) re-arms the same draw handler
     without the user having to hunt for the small on-map icon */
  const newBlockBtn = document.getElementById("dt-new-block-btn");
  let polygonHandler = null;
  function armPolygonDraw() {
    if (polygonHandler) polygonHandler.disable();
    polygonHandler = new L.Draw.Polygon(map, POLYGON_OPTS);
    polygonHandler.enable();
    newBlockBtn.classList.add("active");
    newBlockBtn.textContent = "Drawing… click the map to place points";
  }
  function disarmPolygonDraw() {
    newBlockBtn.classList.remove("active");
    newBlockBtn.textContent = "+ New block";
  }
  newBlockBtn.addEventListener("click", () => {
    if (newBlockBtn.classList.contains("active")) { if (polygonHandler) polygonHandler.disable(); disarmPolygonDraw(); }
    else armPolygonDraw();
  });

  /* blocks: [{ id, name, latlngs:[{lat,lng}], kpi:{...} }], mirrored to localStorage */
  let blocks = [];
  let selectedId = null; /* null => "all blocks" average view */
  const layersById = {};

  (function load() {
    try {
      const raw = localStorage.getItem(DT_STORAGE_KEY);
      blocks = raw ? JSON.parse(raw) : [];
    } catch (e) { blocks = []; }
  })();
  function persist() {
    try { localStorage.setItem(DT_STORAGE_KEY, JSON.stringify(blocks)); } catch (e) {}
  }

  function styleFor(block) {
    const band = kpiBand(DT_RISK_DEF, block.kpi.diseaseRisk);
    const isSelected = block.id === selectedId;
    return {
      color: isSelected ? CLR.text : "rgba(238,242,245,0.75)",
      weight: isSelected ? 3 : 1.5,
      fillColor: band.color,
      fillOpacity: isSelected ? 0.55 : 0.4,
    };
  }

  function drawBlockLayer(block) {
    const layer = L.polygon(block.latlngs.map(p => [p.lat, p.lng]), styleFor(block));
    layer.on("click", () => selectBlock(block.id));
    layer.bindTooltip(block.name, { sticky: true });
    drawnItems.addLayer(layer);
    layersById[block.id] = layer;
  }

  function restyleAll() {
    blocks.forEach(b => { if (layersById[b.id]) layersById[b.id].setStyle(styleFor(b)); });
  }

  function updateToggleUi() {
    document.querySelector('#dt-view-toggle .pill-btn[data-scope="all"]').classList.toggle("active", selectedId === null);
    document.getElementById("dt-selected-hint").textContent = selectedId === null
      ? "Tap a block on the map to inspect it individually"
      : "Tap “All blocks” to return to the estate average";
  }

  /* a scrollable row of real buttons mirroring the map's polygons —
     the reliable way to pick a block when the map is small, zoomed
     out, or the shape is awkward to tap precisely on a touchscreen */
  function renderBlockChips() {
    const host = document.getElementById("dt-block-chips");
    host.innerHTML = "";
    if (!blocks.length) {
      host.innerHTML = '<span class="dt-block-chips-empty">Blocks you draw will appear here for quick switching</span>';
      return;
    }
    blocks.forEach(b => {
      const band = kpiBand(DT_RISK_DEF, b.kpi.diseaseRisk);
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "dt-block-chip" + (b.id === selectedId ? " active" : "");
      chip.setAttribute("aria-pressed", b.id === selectedId ? "true" : "false");
      chip.innerHTML = `<span class="dot" style="background:${band.color}"></span>${b.name}`;
      chip.addEventListener("click", () => selectBlock(b.id));
      host.appendChild(chip);
    });
  }

  function selectBlock(id) {
    selectedId = id;
    restyleAll();
    updateToggleUi();
    renderBlockChips();
    renderPanel();
    renderTrendSection();
  }
  function selectAll() {
    selectedId = null;
    restyleAll();
    updateToggleUi();
    renderBlockChips();
    renderPanel();
    renderTrendSection();
  }

  function renderPanel() {
    const grid = document.getElementById("dt-kpi-grid");
    const title = document.getElementById("dt-panel-title");
    const scope = document.getElementById("dt-panel-scope");
    const actions = document.getElementById("dt-panel-actions");
    grid.innerHTML = "";

    if (!blocks.length) {
      scope.textContent = "Get started";
      title.textContent = "No blocks yet";
      actions.style.display = "none";
      grid.innerHTML = '<div class="card-sub" style="margin:0;">Use the polygon tool on the map (top-left corner) to draw your first block boundary.</div>';
      return;
    }

    const block = selectedId ? blocks.find(b => b.id === selectedId) : null;
    const kpiValues = block ? block.kpi : dtAverageKpis(blocks);
    scope.textContent = block ? "Selected block" : "Estate average";
    title.textContent = block ? block.name : `All blocks — average of ${blocks.length}`;
    actions.style.display = block ? "flex" : "none";

    DT_SNAPSHOT_DEFS.forEach(def => {
      const raw = kpiValues[def.key];
      const band = kpiBand(def, raw);
      const val = block ? raw : Math.round(raw * 10) / 10;
      const tile = document.createElement("div"); tile.className = "kpi-tile";
      tile.innerHTML = `<span class="kpi-tile-label">${def.label}</span>
        <span class="kpi-tile-value mono" style="color:${band.color}">${val}${def.unit}</span>
        <span class="delta ${band.cls}">${band.label}</span>`;
      grid.appendChild(tile);
    });
    scheduleGapFill();
  }

  /* "Block trend" section — one hero chart for the top-line Block
     Health Score, plus a small sparkline per remaining KPI. Kept as
     its own card below the snapshot panel (rather than folded into
     it) so the default view stays a quick glance, and history is
     there to open up only once you scroll to it. */
  function renderTrendSection() {
    const sub = document.getElementById("dt-trend-sub");
    const grid = document.getElementById("dt-trend-grid");
    resetChartHost("dt-hero-trend");
    grid.innerHTML = "";

    if (!blocks.length) {
      sub.textContent = "Draw a block above to see its history here";
      document.getElementById("dt-hero-value").innerHTML = "–";
      document.getElementById("dt-hero-badge").innerHTML = "";
      document.getElementById("dt-hero-phrase").innerHTML = "";
      return;
    }

    const block = selectedId ? blocks.find(b => b.id === selectedId) : null;
    const kpiValues = block ? block.kpi : dtAverageKpis(blocks);
    const historyFor = key => (block ? block.history[key] : dtAverageHistory(blocks, key));

    sub.textContent = block
      ? `${block.name} · last ${DT_WEEKS} weeks`
      : `All blocks — average of ${blocks.length} · last ${DT_WEEKS} weeks`;

    const heroSeries = historyFor(DT_HEALTH_DEF.key);
    const heroRaw = kpiValues[DT_HEALTH_DEF.key];
    const heroVal = block ? Math.round(heroRaw) : Math.round(heroRaw * 10) / 10;
    const heroBand = kpiBand(DT_HEALTH_DEF, heroRaw);
    const heroTrend = trendPhrase(DT_HEALTH_DEF, heroSeries);
    const scopeLabel = block ? block.name : `All blocks — average of ${blocks.length}`;
    document.getElementById("dt-hero-value").innerHTML = `<span class="mono" style="color:${heroBand.color}">${heroVal}</span>`;
    document.getElementById("dt-hero-badge").innerHTML = `<span class="delta ${heroBand.cls}">${heroBand.label}</span>`;
    document.getElementById("dt-hero-phrase").innerHTML = `<span class="delta ${heroTrend.cls}">${heroTrend.text}</span> over the last ${DT_WEEKS} weeks`;
    lineChart("dt-hero-trend", heroSeries, heroBand.color, {
      h: 110, timeSeries: true, dots: true, labels: DT_WEEK_LABELS,
      unit: DT_HEALTH_DEF.unit, bandFn: v => kpiBand(DT_HEALTH_DEF, v),
    });
    document.getElementById("dt-hero-expand").onclick = () => openChartModal(DT_HEALTH_DEF, heroSeries, heroRaw, scopeLabel);

    DT_SNAPSHOT_DEFS.forEach(def => {
      const series = historyFor(def.key);
      const raw = kpiValues[def.key];
      const val = block ? raw : Math.round(raw * 10) / 10;
      const band = kpiBand(def, raw);
      const trend = trendPhrase(def, series);
      const trendDot = trend.cls === "up" ? CLR.green : trend.cls === "down" ? CLR.red : CLR.blue;
      const chartId = "dt-trend-spark-" + def.key;
      const expandId = "dt-trend-expand-" + def.key;
      const tile = document.createElement("div"); tile.className = "kpi-trend-tile";
      tile.innerHTML = `
        <div class="kpi-trend-tile-head">
          <span class="kpi-tile-label">${def.label}</span>
          <span class="kpi-trend-tile-head-right">
            <button class="dt-expand-btn" id="${expandId}" aria-label="Expand ${def.label} chart" title="View full chart">&#10530;</button>
            <span class="delta ${band.cls}" style="font-size:9.5px; padding:1px 6px;">${band.label}</span>
          </span>
        </div>
        <span class="kpi-tile-value mono" style="color:${band.color}">${val}${def.unit}</span>
        <div id="${chartId}" class="kpi-trend-tile-chart"></div>
        <span class="kpi-trend-tile-phrase"><span class="dot" style="background:${trendDot}"></span>${trend.text}</span>`;
      grid.appendChild(tile);
      document.getElementById(expandId).onclick = () => openChartModal(def, series, raw, scopeLabel);
      lineChart(chartId, series, band.color, {
        h: 50, dots: false, endpointsOnly: true, labels: DT_WEEK_LABELS,
        unit: def.unit, bandFn: v => kpiBand(def, v),
      });
    });
    scheduleGapFill();
  }

  function refreshSummary() {
    document.getElementById("dt-total").textContent = blocks.length;
    document.getElementById("dt-atrisk").textContent = blocks.filter(b => b.kpi.diseaseRisk >= 20).length;
    document.getElementById("dt-avg-vigor").textContent = blocks.length ? Math.round(blocks.reduce((s, b) => s + b.kpi.vigor, 0) / blocks.length) : "-";
    document.getElementById("dt-avg-risk").textContent = blocks.length ? Math.round(blocks.reduce((s, b) => s + b.kpi.diseaseRisk, 0) / blocks.length) + "%" : "-";

    const list = document.getElementById("dt-priority");
    list.innerHTML = "";
    if (!blocks.length) { list.innerHTML = '<div class="card-sub" style="margin:0;">No blocks drawn yet.</div>'; return; }
    [...blocks].sort((a, b) => b.kpi.diseaseRisk - a.kpi.diseaseRisk).forEach(b => {
      const band = kpiBand(DT_RISK_DEF, b.kpi.diseaseRisk);
      const row = document.createElement("div"); row.className = "list-row";
      row.innerHTML = `<span class="dot" style="background:${band.color}"></span><span class="name">${b.name}</span>
        <span class="track"><span class="bar-track"><span class="bar-fill" style="width:${b.kpi.diseaseRisk}%;background:${band.color}"></span></span></span>
        <span class="val mono">${b.kpi.diseaseRisk}%</span>`;
      list.appendChild(row);
    });
  }

  function refreshAll() { persist(); restyleAll(); renderBlockChips(); renderPanel(); renderTrendSection(); refreshSummary(); }

  /* blocks saved before this update won't have a `history` yet — backfill
     it once on load so old boundaries still get a trend section */
  let backfilled = false;
  blocks.forEach(b => {
    const before = JSON.stringify({ kpi: b.kpi, history: b.history });
    repairBlockKpis(b);
    if (before !== JSON.stringify({ kpi: b.kpi, history: b.history })) backfilled = true;
  });
  if (backfilled) persist();

  blocks.forEach(drawBlockLayer);
  updateToggleUi();
  renderBlockChips();
  renderPanel();
  renderTrendSection();
  refreshSummary();

  map.on(L.Draw.Event.DRAWSTOP, disarmPolygonDraw);

  map.on(L.Draw.Event.CREATED, (e) => {
    const name = window.prompt('Name this block (e.g. "Block 3 — Lower East")', `Block ${blocks.length + 1}`);
    if (!name) return; /* cancelled — discard the shape */
    const latlngs = e.layer.getLatLngs()[0].map(ll => ({ lat: ll.lat, lng: ll.lng }));
    const kpi = generateBlockKpis();
    const block = { id: "b" + Date.now() + Math.floor(Math.random() * 1000), name, latlngs, kpi, history: generateBlockHistory(kpi) };
    blocks.push(block);
    drawBlockLayer(block);
    selectBlock(block.id);
    refreshAll();
  });

  map.on(L.Draw.Event.EDITED, (e) => {
    e.layers.eachLayer(layer => {
      const id = Object.keys(layersById).find(k => layersById[k] === layer);
      const block = blocks.find(b => b.id === id);
      if (block) block.latlngs = layer.getLatLngs()[0].map(ll => ({ lat: ll.lat, lng: ll.lng }));
    });
    refreshAll();
  });

  map.on(L.Draw.Event.DELETED, (e) => {
    e.layers.eachLayer(layer => {
      const id = Object.keys(layersById).find(k => layersById[k] === layer);
      blocks = blocks.filter(b => b.id !== id);
      delete layersById[id];
      if (selectedId === id) selectedId = null;
    });
    updateToggleUi();
    refreshAll();
  });

  document.getElementById("dt-view-toggle").addEventListener("click", (e) => {
    if (e.target.closest('.pill-btn[data-scope="all"]')) selectAll();
  });

  document.getElementById("dt-rename-btn").addEventListener("click", () => {
    const block = blocks.find(b => b.id === selectedId); if (!block) return;
    const name = window.prompt("Rename block", block.name);
    if (!name) return;
    block.name = name;
    layersById[block.id].bindTooltip(name, { sticky: true });
    refreshAll();
  });

  document.getElementById("dt-delete-btn").addEventListener("click", () => {
    const block = blocks.find(b => b.id === selectedId); if (!block) return;
    if (!window.confirm(`Delete "${block.name}"?`)) return;
    drawnItems.removeLayer(layersById[block.id]);
    delete layersById[block.id];
    blocks = blocks.filter(b => b.id !== block.id);
    selectedId = null;
    updateToggleUi();
    refreshAll();
  });

  /* Leaflet lays itself out at 0×0 while its tab is hidden — force a
     resize once the Crop Health & Disease tab actually becomes visible
     again (it's the default tab, so the map is already visible on
     first load, but switching away and back still needs this) */
  document.getElementById("tabs").addEventListener("click", (e) => {
    if (e.target.closest('[data-view="v1"]')) setTimeout(() => map.invalidateSize(), 40);
  });
})();

/* ================================================================
   VIEW 7 — Estate Assets (Asset Monitoring Modules)
   Annual/on-demand land & asset surveys — a different cadence from
   the monthly/weekly KPI tabs, so these render as static status
   summaries rather than time-series charts.
   ================================================================ */
const eaInfra = document.getElementById("ea-infra-row");
[["Roads surveyed", "42 km", "var(--green)"], ["Buildings mapped", "18", "var(--green)"], ["Drainage channels", "26", "var(--green)"], ["Boundary markers", "140", "var(--amber)"]].forEach(([l, v, dot]) => {
  const c = document.createElement("div"); c.className = "icon-stat";
  c.innerHTML = `<div class="icon-btn"><span class="dot" style="background:${dot}"></span></div><div class="n mono">${v}</div><div class="l">${l}</div>`;
  eaInfra.appendChild(c);
});

const eaTree = document.getElementById("ea-tree-row");
[["Shade trees", "3,240", "var(--green)"], ["Fuel-wood trees", "1,860", "var(--green)"], ["New plantings (12 mo)", "210", "var(--green)"], ["Lost / removed (12 mo)", "34", "var(--amber)"]].forEach(([l, v, dot]) => {
  const c = document.createElement("div"); c.className = "icon-stat";
  c.innerHTML = `<div class="icon-btn"><span class="dot" style="background:${dot}"></span></div><div class="n mono">${v}</div><div class="l">${l}</div>`;
  eaTree.appendChild(c);
});

const eaHabitat = document.getElementById("ea-habitat-row");
[["Forest area", "86 ha", "var(--green)"], ["Streams mapped", "4.2 km", "var(--green)"], ["Protected buffer zones", "12 ha", "var(--green)"], ["Share of estate", "6.1%", "var(--blue)"]].forEach(([l, v, dot]) => {
  const c = document.createElement("div"); c.className = "icon-stat";
  c.innerHTML = `<div class="icon-btn"><span class="dot" style="background:${dot}"></span></div><div class="n mono">${v}</div><div class="l">${l}</div>`;
  eaHabitat.appendChild(c);
});
