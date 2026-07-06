const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs){ const n = document.createElementNS(NS, tag); for(const k in attrs) n.setAttribute(k, attrs[k]); return n; }
function svgEl(w,h,vb){ return el("svg", {viewBox: vb || `0 0 ${w} ${h}`, width:"100%", height:h, preserveAspectRatio:"none"}); }
function mount(id, node){ document.getElementById(id).appendChild(node); }

/* ---------------- tabs ---------------- */
document.getElementById("tabs").addEventListener("click", e=>{
  const btn = e.target.closest(".tab-btn"); if(!btn) return;
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("active", b===btn));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active", v.id===btn.dataset.view));
});

/* ---------------- shared chart primitives ---------------- */
function areaChart(values, color, opts={}){
  const W=opts.w||400, H=opts.h||120, pad=6;
  const svg = svgEl(W,H);
  const max = Math.max(...values), min = Math.min(...values)*0.9;
  const step = (W-2*pad)/(values.length-1);
  const pts = values.map((v,i)=>[pad+i*step, H-6-((v-min)/(max-min))*(H-16)]);
  const uid = "g"+Math.random().toString(36).slice(2,8);
  const defs = el("defs",{});
  const grad = el("linearGradient",{id:uid,x1:"0",y1:"0",x2:"0",y2:"1"});
  grad.appendChild(el("stop",{offset:"0%","stop-color":color,"stop-opacity":"0.45"}));
  grad.appendChild(el("stop",{offset:"100%","stop-color":color,"stop-opacity":"0"}));
  defs.appendChild(grad); svg.appendChild(defs);
  let line = `M${pts[0][0]},${pts[0][1]}`;
  for(let i=1;i<pts.length;i++){ const mx=(pts[i-1][0]+pts[i][0])/2; line += ` Q${pts[i-1][0]},${pts[i-1][1]} ${mx},${(pts[i-1][1]+pts[i][1])/2}`; }
  line += ` T${pts[pts.length-1][0]},${pts[pts.length-1][1]}`;
  const area = line + ` L${pts[pts.length-1][0]},${H} L${pts[0][0]},${H} Z`;
  svg.appendChild(el("path",{d:area, fill:`url(#${uid})`}));
  svg.appendChild(el("path",{d:line, fill:"none", stroke:color, "stroke-width":2}));
  if(opts.dots){ pts.forEach(p=>svg.appendChild(el("circle",{cx:p[0],cy:p[1],r:2.4,fill:color}))); }
  const last = pts[pts.length-1];
  svg.appendChild(el("circle",{cx:last[0],cy:last[1],r:4,fill:"#fff",stroke:color,"stroke-width":2}));
  return svg;
}

function barChart(values, colorFn, opts={}){
  const W=opts.w||400, H=opts.h||130, padB=opts.labels?18:4;
  const svg = svgEl(W,H);
  const max = Math.max(...values);
  const step = W/values.length, bw = step*0.5;
  values.forEach((v,i)=>{
    const h = (v/max)*(H-padB-6);
    const x = step*i+(step-bw)/2, y = H-padB-h;
    svg.appendChild(el("rect",{x,y,width:bw,height:h,rx:3,fill:colorFn(i,v)}));
  });
  return svg;
}

function ringChart(pct, color, size=90, stroke=9, track){
  const r=(size-stroke)/2, c=size/2, circ=2*Math.PI*r;
  const svg = svgEl(size,size,`0 0 ${size} ${size}`);
  svg.appendChild(el("circle",{cx:c,cy:c,r,fill:"none",stroke:track||"var(--surface-3)","stroke-width":stroke}));
  svg.appendChild(el("circle",{cx:c,cy:c,r,fill:"none",stroke:color,"stroke-width":stroke,"stroke-linecap":"round",
    "stroke-dasharray":circ,"stroke-dashoffset":circ*(1-pct/100), transform:`rotate(-90 ${c} ${c})`}));
  return svg;
}

function pieChart(segments, size=110){
  const c = size/2, r = size/2-4;
  const svg = svgEl(size,size,`0 0 ${size} ${size}`);
  const total = segments.reduce((a,s)=>a+s.v,0);
  let ang = -Math.PI/2;
  segments.forEach(s=>{
    const frac = s.v/total, a2 = ang + frac*Math.PI*2;
    const x0=c+r*Math.cos(ang), y0=c+r*Math.sin(ang), x1=c+r*Math.cos(a2), y1=c+r*Math.sin(a2);
    const large = frac>0.5?1:0;
    svg.appendChild(el("path",{d:`M${c},${c} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`, fill:s.color}));
    ang = a2;
  });
  svg.appendChild(el("circle",{cx:c,cy:c,r:r*0.55,fill:"var(--surface)"}));
  return svg;
}

function centerLabel(wrapId, n, l){
  const wrap = document.getElementById(wrapId);
  wrap.style.position="relative";
  const lab = document.createElement("div");
  lab.className = "ring-center";
  lab.innerHTML = `<span class="n mono" style="font-size:${n.length>4?18:22}px;">${n}</span><span class="l">${l}</span>`;
  wrap.appendChild(lab);
}

/* Block Health Score chart: 0-100 composite index with target/warning/critical
   bands, plotted against an inverse Disease Risk Score overlay. */
function kpiTrendChart(scoreVals, riskVals, weekLabels, opts={}){
  const W=opts.w||760, H=opts.h||190, padL=26, padR=10, padT=8, padB=18;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const svg = svgEl(W,H);
  const y = v => padT + plotH - (v/100)*plotH;
  const x = i => padL + (i/(scoreVals.length-1))*plotW;

  const bands = [ [0,60,"var(--red)",0.10], [60,80,"var(--amber)",0.10], [80,100,"var(--green)",0.10] ];
  bands.forEach(([lo,hi,color,op])=>{
    svg.appendChild(el("rect",{x:padL, y:y(hi), width:plotW, height:y(lo)-y(hi), fill:color, opacity:op}));
  });
  [0,60,80,100].forEach(v=>{
    svg.appendChild(el("line",{x1:padL,y1:y(v),x2:W-padR,y2:y(v),stroke:"var(--border)","stroke-width":1}));
    svg.appendChild(el("text",{x:4,y:y(v)+3,fill:"var(--text-faint)","font-size":8.5}, )).textContent=v;
  });

  const uid = "khs"+Math.random().toString(36).slice(2,8);
  const defs = el("defs",{});
  const grad = el("linearGradient",{id:uid,x1:"0",y1:"0",x2:"0",y2:"1"});
  grad.appendChild(el("stop",{offset:"0%","stop-color":"var(--green)","stop-opacity":"0.4"}));
  grad.appendChild(el("stop",{offset:"100%","stop-color":"var(--green)","stop-opacity":"0"}));
  defs.appendChild(grad); svg.appendChild(defs);

  const scorePts = scoreVals.map((v,i)=>[x(i),y(v)]);
  let scoreLine = `M${scorePts[0][0]},${scorePts[0][1]}`;
  for(let i=1;i<scorePts.length;i++) scoreLine += ` L${scorePts[i][0]},${scorePts[i][1]}`;
  const scoreArea = scoreLine + ` L${scorePts[scorePts.length-1][0]},${y(0)} L${scorePts[0][0]},${y(0)} Z`;
  svg.appendChild(el("path",{d:scoreArea, fill:`url(#${uid})`}));
  svg.appendChild(el("path",{d:scoreLine, fill:"none", stroke:"var(--green)", "stroke-width":2.25}));
  scorePts.forEach(p=>svg.appendChild(el("circle",{cx:p[0],cy:p[1],r:2.2,fill:"var(--surface)",stroke:"var(--green)","stroke-width":1.6})));

  const riskPts = riskVals.map((v,i)=>[x(i),y(v)]);
  let riskLine = `M${riskPts[0][0]},${riskPts[0][1]}`;
  for(let i=1;i<riskPts.length;i++) riskLine += ` L${riskPts[i][0]},${riskPts[i][1]}`;
  svg.appendChild(el("path",{d:riskLine, fill:"none", stroke:"var(--red)", "stroke-width":1.75, "stroke-dasharray":"4,3"}));

  const last = scorePts[scorePts.length-1];
  svg.appendChild(el("line",{x1:last[0],y1:last[1],x2:last[0],y2:y(0),stroke:"var(--green)","stroke-width":1,"stroke-dasharray":"2,3",opacity:0.6}));
  svg.appendChild(el("circle",{cx:last[0],cy:last[1],r:4,fill:"#fff",stroke:"var(--green)","stroke-width":2}));

  weekLabels.forEach((wl,i)=>{
    if(i%2!==0) return;
    svg.appendChild(el("text",{x:x(i),y:H-4,fill:"var(--text-faint)","font-size":8.5,"text-anchor":"middle"})).textContent=wl;
  });
  return svg;
}

/* landscape banner generator — stands in for photography, colour-graded per view.
   Uses a fixed virtual viewBox stretched to 100%/100% so it renders correctly
   even while its tab is hidden (display:none reports 0px, which would otherwise
   collapse a size measured from getBoundingClientRect). */
function landscape(w,h,palette){
  const svg = el("svg", {viewBox:`0 0 ${w} ${h}`, width:"100%", height:"100%", preserveAspectRatio:"none"});
  const defs = el("defs",{});
  const sky = el("linearGradient",{id:"sky",x1:"0",y1:"0",x2:"0",y2:"1"});
  palette.sky.forEach((c,i)=>sky.appendChild(el("stop",{offset:`${i*100/(palette.sky.length-1)}%`,"stop-color":c})));
  defs.appendChild(sky);
  palette.ridges.forEach((ridge,i)=>{
    const g = el("linearGradient",{id:"ridge"+i,x1:"0",y1:"0",x2:"0",y2:"1"});
    g.appendChild(el("stop",{offset:"0%","stop-color":ridge.top}));
    g.appendChild(el("stop",{offset:"100%","stop-color":ridge.bottom}));
    defs.appendChild(g);
  });
  svg.appendChild(defs);
  svg.appendChild(el("rect",{x:0,y:0,width:w,height:h,fill:"url(#sky)"}));
  svg.appendChild(el("circle",{cx:w*palette.sunX, cy:h*palette.sunY, r:h*0.22, fill:palette.sun, opacity:"0.5"}));
  svg.appendChild(el("circle",{cx:w*palette.sunX, cy:h*palette.sunY, r:h*0.09, fill:palette.sun, opacity:"0.9"}));
  palette.ridges.forEach((ridge,i)=>{
    const baseY = h*ridge.base, amp = h*ridge.amp, seedOffset = i*37+11;
    let d = `M0,${h}`;
    const pts = 6;
    for(let p=0;p<=pts;p++){
      const x = w*p/pts;
      const y = baseY - amp*Math.abs(Math.sin((p+seedOffset)*1.3));
      if(p===0) d += ` L${x},${y}`; else {
        const px = w*(p-1)/pts;
        d += ` Q${(px+x)/2},${y-amp*0.15} ${x},${y}`;
      }
    }
    d += ` L${w},${h} Z`;
    svg.appendChild(el("path",{d, fill:`url(#ridge${i})`, opacity: ridge.opacity!=null?ridge.opacity:1}));
  });
  return svg;
}

const PALETTES = {
  forest: { sky:["#16241b","#0d1712"], sun:"#cfe6a0", sunX:0.78, sunY:0.28,
    ridges:[ {top:"#22381f",bottom:"#111d10", base:0.55, amp:0.22, opacity:0.55},
             {top:"#365e2c",bottom:"#182b14", base:0.72, amp:0.28, opacity:0.75},
             {top:"#5f9143",bottom:"#233c19", base:0.92, amp:0.3, opacity:1} ]},
  alpine: { sky:["#1b2c3a","#0e1a22"], sun:"#eaf3f7", sunX:0.25, sunY:0.22,
    ridges:[ {top:"#33505f",bottom:"#16242c", base:0.5, amp:0.24, opacity:0.5},
             {top:"#4a7383",bottom:"#1c2f37", base:0.68, amp:0.3, opacity:0.75},
             {top:"#7fa9ad",bottom:"#28454b", base:0.9, amp:0.32, opacity:1} ]},
  autumn: { sky:["#2a2015","#150f0a"], sun:"#f2b134", sunX:0.7, sunY:0.24,
    ridges:[ {top:"#4a3418",bottom:"#1c130a", base:0.52, amp:0.22, opacity:0.55},
             {top:"#7a5522",bottom:"#2a1d0d", base:0.7, amp:0.26, opacity:0.8},
             {top:"#a97a2c",bottom:"#3c2a10", base:0.92, amp:0.3, opacity:1} ]},
  dusk: { sky:["#221a30","#0f0c18"], sun:"#e2685a", sunX:0.6, sunY:0.3,
    ridges:[ {top:"#3a2c4a",bottom:"#170f22", base:0.55, amp:0.2, opacity:0.55},
             {top:"#5a3f5f",bottom:"#211729", base:0.72, amp:0.26, opacity:0.78},
             {top:"#8a5a6e",bottom:"#301f2b", base:0.92, amp:0.3, opacity:1} ]},
};

function bannerWithOverlay(id, palette, title, big, chip){
  const host = document.getElementById(id);
  const svg = landscape(800, 400, PALETTES[palette]);
  host.appendChild(svg);
  const top = document.createElement("div"); top.className="banner-top";
  top.innerHTML = chip ? `<span class="chip-float">${chip}</span>` : "";
  host.appendChild(top);
  const overlay = document.createElement("div"); overlay.className="banner-overlay";
  overlay.innerHTML = `<div class="card-title">${title}</div><div class="big">${big}</div>`;
  host.appendChild(overlay);
}

/* ================= VIEW 1 — health console ================= */
const c1WeekLabels = Array.from({length:14},(_,i)=>"W"+(i+1));
const c1BlockHealth = [58,61,64,63,67,70,69,74,77,76,81,83,85,88];
const c1DiseaseRisk = [42,40,38,39,35,33,34,29,26,25,21,19,16,14];
mount("c1-area", kpiTrendChart(c1BlockHealth, c1DiseaseRisk, c1WeekLabels, {w:760,h:190}));

const c1LegendItems = [
  ["NDVI","var(--green)"], ["EVI2","#a8d86a"], ["NDRE","var(--blue)"],
  ["NDMI","#5fc4c1"], ["Disease hotspots","var(--red)"],
];
const c1Legend = document.getElementById("c1-legend");
c1LegendItems.forEach(([n,c])=>{
  const d = document.createElement("div"); d.className="legend-item";
  d.innerHTML = `<span class="dot" style="background:${c}"></span>${n}`; c1Legend.appendChild(d);
});

const c1rings = document.getElementById("c1-rings");
[["Illum.",78,"var(--amber)"],["Tide",45,"var(--blue)"],["Cycle",62,"var(--green)"]].forEach(([l,pct,color])=>{
  const wrap = document.createElement("div"); wrap.className="mini-ring";
  const ringHost = document.createElement("div"); ringHost.className="ring-wrap"; ringHost.style.position="relative";
  ringHost.appendChild(ringChart(pct,color,40,5));
  const lab = document.createElement("div"); lab.className="ring-center";
  lab.innerHTML = `<span class="n mono" style="font-size:9.5px;">${pct}</span>`;
  ringHost.appendChild(lab);
  wrap.appendChild(ringHost);
  const cap = document.createElement("span"); cap.className="l"; cap.style.color="var(--text-faint)"; cap.style.fontSize="9px"; cap.textContent=l;
  wrap.appendChild(cap);
  c1rings.appendChild(wrap);
});

const c1IconGridGlyphs = [
  '<circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  '<path d="M3,9 L3,5 Q3,3 5,3 L9,3 Q11,3 11,5 L11,9 Z" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  '<path d="M4,9 Q4,5 7,5 Q10,5 10,9" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="4" r="1.4" fill="currentColor"/>',
  '<rect x="3" y="4" width="8" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5,4 V3 M9,4 V3" stroke="currentColor" stroke-width="1.2"/>',
  '<circle cx="7" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M7,2 V3.4 M7,10.6 V12 M2,7 H3.4 M10.6,7 H12" stroke="currentColor" stroke-width="1.2"/>',
  '<path d="M4,10 L4,6 Q4,4 7,4 Q10,4 10,6 L10,10" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="4" cy="10" r="1.1" fill="currentColor"/><circle cx="10" cy="10" r="1.1" fill="currentColor"/>',
];
const c1grid = document.getElementById("c1-icongrid");
c1IconGridGlyphs.forEach(glyph=>{
  const b = document.createElement("div"); b.className="icon-btn";
  b.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" style="color:var(--text-dim)">${glyph}</svg>`;
  c1grid.appendChild(b);
});

const hero1Rows = [["Elevation","1,240 m"],["Trail length","8.2 km"],["Rainfall","62 mm"],["Sightings","14"]];
const c1h1 = document.getElementById("c1-hero1-rows");
hero1Rows.forEach(([k,v])=>{
  const r = document.createElement("div"); r.className="mini-row";
  r.innerHTML = `<span class="k">${k}</span><span class="v mono">${v}</span>`; c1h1.appendChild(r);
});

mount("c1-hero2-spark", areaChart([62,68,64,74,80,76,88,84,92], "var(--green)", {w:520,h:56,dots:false}));

mount("c1-bars1", barChart([12,18,15,22,19,25,21], (i)=> i%2? "var(--green-dim)":"var(--green)", {w:520,h:100}));
const bars1Rows = [["Mon","New 12"],["Tue","New 18"],["Wed","Ret. 9"],["Thu","New 22"],["Fri","Ret. 14"],["Sat","New 21"]];
const c1b1 = document.getElementById("c1-bars1-rows");
bars1Rows.forEach(([k,v])=>{ const r=document.createElement("div"); r.className="mini-row"; r.innerHTML=`<span class="k">${k}</span><span class="v mono">${v}</span>`; c1b1.appendChild(r); });

mount("c1-bars2", barChart([40,30,20,10,26,33,18], (i,v)=> v>28? "var(--blue)":"var(--amber)", {w:520,h:100}));
const bars2Rows = [["Desktop","40%"],["Mobile","30%"],["Tablet","20%"],["Other","10%"],["Kiosk","26%"],["TV","18%"]];
const c1b2 = document.getElementById("c1-bars2-rows");
bars2Rows.forEach(([k,v])=>{ const r=document.createElement("div"); r.className="mini-row"; r.innerHTML=`<span class="k">${k}</span><span class="v mono">${v}</span>`; c1b2.appendChild(r); });

/* ================= VIEW 2 ================= */
bannerWithOverlay("c2-hero","alpine","Site — Meridian Ridge","18.4°C / 62% humidity","Live feed");

const ring2 = document.getElementById("c2-ring");
ring2.appendChild(ringChart(72,"var(--green)",110,10));
centerLabel("c2-ring","72","AQI good");

const c2icons = document.getElementById("c2-icons");
[["Wind","12 km/h"],["UV","3 low"],["Pressure","1013 hPa"],["Visibility","9.5 km"],["Dew pt.","11°C"]].forEach(([l,v])=>{
  const c = document.createElement("div"); c.className="icon-stat";
  c.innerHTML = `<div class="icon-btn"><span class="dot" style="background:var(--green)"></span></div><div class="n mono">${v}</div><div class="l">${l}</div>`;
  c2icons.appendChild(c);
});

mount("c2-a1", areaChart([40,44,41,47,50,48,53], "var(--blue)", {w:220,h:90}));
mount("c2-a2", areaChart([18,20,19,22,21,24,23], "var(--amber)", {w:220,h:90}));
mount("c2-a3", areaChart([2,0,5,8,3,1,6], "var(--green)", {w:220,h:90}));

mount("c2-bars", barChart([98,96,91,99,88], ()=> "var(--green)", {w:220,h:100}));
mount("c2-area2", areaChart([10,18,24,30,42,55,70,88], "var(--green)", {w:220,h:100,dots:true}));

const zones = [["Zone A","92%","var(--green)"],["Zone B","81%","var(--blue)"],["Zone C","74%","var(--amber)"],["Zone D","63%","var(--text-faint)"]];
const c2list = document.getElementById("c2-list");
zones.forEach(([n,v,c])=>{
  const row = document.createElement("div"); row.className="list-row";
  row.innerHTML = `<span class="dot" style="background:${c}"></span><span class="name">${n}</span>
    <span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v}; background:${c}"></span></span></span>
    <span class="val mono">${v}</span>`;
  c2list.appendChild(row);
});

/* ================= VIEW 3 ================= */
bannerWithOverlay("c3-banner","autumn","Sprint 24","Week 2 of 3","On track");

const tickets = [["A. Novak","12"],["R. Diaz","9"],["S. Coates","7"],["M. Iyer","6"],["J. Park","3"]];
const c3t = document.getElementById("c3-tickets");
tickets.forEach(([n,v])=>{
  const row = document.createElement("div"); row.className="list-row";
  row.innerHTML = `<span class="thumb" style="background:linear-gradient(135deg,var(--surface-3),var(--surface-2));"></span>
    <span class="name">${n}</span>
    <span class="track"><span class="bar-track"><span class="bar-fill" style="width:${v*7}%; background:var(--green)"></span></span></span>
    <span class="val mono">${v}</span>`;
  c3t.appendChild(row);
});

const teams = [["Design",84,"var(--green)"],["Eng.",67,"var(--blue)"],["QA",91,"var(--amber)"],["Support",58,"var(--red)"]];
const c3rings = document.getElementById("c3-rings");
teams.forEach(([n,pct,color])=>{
  const wrap = document.createElement("div"); wrap.className="span-3";
  wrap.style.cssText="display:flex; flex-direction:column; align-items:center; gap:6px;";
  const ringHost = document.createElement("div"); ringHost.className="ring-wrap"; ringHost.style.position="relative";
  wrap.appendChild(ringHost); c3rings.appendChild(wrap);
  ringHost.appendChild(ringChart(pct,color,66,7));
  const lab = document.createElement("div"); lab.className="ring-center";
  lab.innerHTML = `<span class="n mono" style="font-size:13px;">${pct}%</span>`;
  ringHost.appendChild(lab);
  const cap = document.createElement("div"); cap.className="l"; cap.style.cssText="font-size:10.5px;color:var(--text-faint);";
  cap.textContent = n; wrap.appendChild(cap);
});

/* ================= VIEW 4 ================= */
bannerWithOverlay("c4-banner1","dusk","Facility — East Campus","Utility cost -8%","Optimized");
bannerWithOverlay("c4-banner2","forest","Facility — South Depot","Utility cost +3%","Review");

mount("c4-pie", pieChart([{v:38,color:"var(--green)"},{v:26,color:"var(--blue)"},{v:20,color:"var(--amber)"},{v:16,color:"var(--red)"}]));
const pieLegend = document.getElementById("c4-pie-legend");
[["Payroll","var(--green)"],["Infra","var(--blue)"],["Marketing","var(--amber)"],["Other","var(--red)"]].forEach(([n,c])=>{
  const d = document.createElement("div"); d.className="legend-item";
  d.innerHTML = `<span class="dot" style="background:${c}"></span>${n}`; pieLegend.appendChild(d);
});

const ring1 = document.getElementById("c4-ring1"); ring1.appendChild(ringChart(64,"var(--green)",100,10)); centerLabel("c4-ring1","$4,120","saved / mo");
const ring2b = document.getElementById("c4-ring2"); ring2b.appendChild(ringChart(81,"var(--blue)",100,10)); centerLabel("c4-ring2","81","score");

mount("c4-pie2", pieChart([{v:50,color:"var(--green)"},{v:30,color:"var(--surface-3)"},{v:20,color:"var(--amber)"}],90));
mount("c4-pie3", pieChart([{v:60,color:"var(--blue)"},{v:40,color:"var(--green-dim)"}],90));

(function(){
  const W=680,H=140; const svg = svgEl(W,H);
  const rev = [40,44,46,50,55,58,60,66,70,74,80,88];
  const exp = [30,31,33,34,36,38,40,42,44,45,48,50];
  function toPath(vals,color,fillGrad){
    const max=100, step=W/(vals.length-1);
    const pts = vals.map((v,i)=>[i*step, H-10-(v/max)*(H-20)]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for(let i=1;i<pts.length;i++) d += ` L${pts[i][0]},${pts[i][1]}`;
    svg.appendChild(el("path",{d, fill:"none", stroke:color, "stroke-width":2.5}));
    pts.forEach(p=>svg.appendChild(el("circle",{cx:p[0],cy:p[1],r:2,fill:color})));
  }
  toPath(exp,"var(--amber)");
  toPath(rev,"var(--green)");
  mount("c4-dual", svg);
})();
