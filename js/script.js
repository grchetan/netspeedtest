// ─── Canvas Gauge ────────────────────────────────────────────────────────────
const canvas = document.getElementById('gaugeCanvas');
const ctx = canvas.getContext('2d');
const W = 260,
  H = 150,
  CX = W / 2,
  CY = H - 10,
  R = 115;
const START_ANGLE = Math.PI,
  END_ANGLE = 0;

function drawGauge(value, maxVal = 150) {
  ctx.clearRect(0, 0, W, H);
  const pct = Math.min(value / maxVal, 1);
  const sweepAngle = Math.PI * pct;

  // track
  ctx.beginPath();
  ctx.arc(CX, CY, R, START_ANGLE, END_ANGLE, false);
  ctx.strokeStyle = '#1a2236';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

  // ticks
  for (let i = 0; i <= 10; i++) {
    const angle = Math.PI + (Math.PI / 10) * i;
    const inner = R - 18,
      outer = R - 8;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(angle) * inner, CY + Math.sin(angle) * inner);
    ctx.lineTo(CX + Math.cos(angle) * outer, CY + Math.sin(angle) * outer);
    ctx.strokeStyle = '#1e2d42';
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.stroke();
  }

  // colored arc
  if (pct > 0) {
    const grd = ctx.createLinearGradient(0, CY, W, CY);
    if (pct < 0.33) {
      grd.addColorStop(0, '#ef4444');
      grd.addColorStop(1, '#f59e0b');
    } else if (pct < 0.66) {
      grd.addColorStop(0, '#f59e0b');
      grd.addColorStop(1, '#3b82f6');
    } else {
      grd.addColorStop(0, '#3b82f6');
      grd.addColorStop(1, '#10b981');
    }
    ctx.beginPath();
    ctx.arc(CX, CY, R, START_ANGLE, START_ANGLE + sweepAngle, false);
    ctx.strokeStyle = grd;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    // needle dot
    const na = START_ANGLE + sweepAngle;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(na) * R, CY + Math.sin(na) * R, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // center dot
  ctx.beginPath();
  ctx.arc(CX, CY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#1e2d42';
  ctx.fill();
}

drawGauge(0);

// ─── History Graph ────────────────────────────────────────────────────────────
const historyData = { dl: [], ul: [] };

function drawHistoryGraph() {
  const gc = document.getElementById('historyGraph');
  if (!gc) return;
  const gctx = gc.getContext('2d');
  const W2 = gc.offsetWidth || 520;
  const H2 = 120;
  gc.width = W2;
  gctx.clearRect(0, 0, W2, H2);

  const allVals = [...historyData.dl, ...historyData.ul];
  if (allVals.length === 0) return;

  const maxV = Math.max(...allVals, 10) * 1.15;
  const pad = { l: 10, r: 10, t: 10, b: 10 };
  const chartW = W2 - pad.l - pad.r;
  const chartH = H2 - pad.t - pad.b;

  function toX(i, total) {
    return pad.l + (i / (total - 1 || 1)) * chartW;
  }
  function toY(v) {
    return pad.t + chartH - (v / maxV) * chartH;
  }

  // Grid lines (subtle)
  gctx.strokeStyle = 'rgba(255,255,255,0.04)';
  gctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (i / 4) * chartH;
    gctx.beginPath();
    gctx.moveTo(pad.l, y);
    gctx.lineTo(W2 - pad.r, y);
    gctx.stroke();
  }

  function drawLine(data, color) {
    if (data.length < 2) return;
    // Filled area
    const grad = gctx.createLinearGradient(0, pad.t, 0, H2);
    grad.addColorStop(0, color.replace(')', ', 0.25)').replace('rgb', 'rgba'));
    grad.addColorStop(1, color.replace(')', ', 0.0)').replace('rgb', 'rgba'));
    gctx.beginPath();
    gctx.moveTo(toX(0, data.length), toY(data[0]));
    for (let i = 1; i < data.length; i++)
      gctx.lineTo(toX(i, data.length), toY(data[i]));
    gctx.lineTo(toX(data.length - 1, data.length), H2 - pad.b);
    gctx.lineTo(toX(0, data.length), H2 - pad.b);
    gctx.closePath();
    gctx.fillStyle = grad;
    gctx.fill();
    // Line
    gctx.beginPath();
    gctx.moveTo(toX(0, data.length), toY(data[0]));
    for (let i = 1; i < data.length; i++)
      gctx.lineTo(toX(i, data.length), toY(data[i]));
    gctx.strokeStyle = color;
    gctx.lineWidth = 2;
    gctx.lineJoin = 'round';
    gctx.stroke();
    // Dots
    data.forEach((v, i) => {
      gctx.beginPath();
      gctx.arc(toX(i, data.length), toY(v), 3.5, 0, Math.PI * 2);
      gctx.fillStyle = color;
      gctx.fill();
    });
  }

  drawLine(historyData.dl, 'rgb(59,130,246)');
  drawLine(historyData.ul, 'rgb(16,185,129)');
}

// ─── Live gauge (updates every animation frame ~1ms) ─────────────────────────
let liveRafId = null;
let currentSpeed = 0;
let liveTargetSpeed = 0; // set from outside, gauge chases it every frame

function startLiveGauge() {
  if (liveRafId) return;
  function frame() {
    // Smooth chase: closes 18% of gap each frame (~60fps = ~1ms per tick feel)
    currentSpeed += (liveTargetSpeed - currentSpeed) * 0.18;
    drawGauge(currentSpeed);
    const s = currentSpeed;
    document.getElementById('speedNum').textContent =
      s < 1 ? s.toFixed(2) : s.toFixed(1);
    liveRafId = requestAnimationFrame(frame);
  }
  liveRafId = requestAnimationFrame(frame);
}

function stopLiveGauge() {
  if (liveRafId) {
    cancelAnimationFrame(liveRafId);
    liveRafId = null;
  }
}

// Instant snap for reset
function snapGaugeTo(val) {
  stopLiveGauge();
  currentSpeed = val;
  liveTargetSpeed = val;
  drawGauge(val);
  document.getElementById('speedNum').textContent =
    val === 0 ? '0' : val.toFixed(1);
}

function setProgress(pct, label) {
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('phaseLabel').textContent = label;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Ping ─────────────────────────────────────────────────────────────────────
async function measurePing(samples = 8) {
  const targets = [
    'https://www.google.com/favicon.ico',
    'https://www.cloudflare.com/favicon.ico',
    'https://www.apple.com/favicon.ico',
  ];
  const times = [];
  for (let i = 0; i < samples; i++) {
    const url = targets[i % targets.length] + '?_=' + Date.now();
    const t0 = performance.now();
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store' });
    } catch (e) {}
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const trimmed = times.slice(1, -1);
  return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
}

// ─── Download — streaming, gauge updates on every chunk ───────────────────────
async function streamDownload(bytes) {
  const url =
    `https://speed.cloudflare.com/__down?bytes=${bytes}&t=` + Date.now();
  const t0 = performance.now();
  let received = 0;
  try {
    const resp = await fetch(url, { cache: 'no-store' });
    const reader = resp.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      const elapsed = (performance.now() - t0) / 1000;
      // live speed from bytes received so far
      liveTargetSpeed = (received * 8) / elapsed / 1e6;
    }
  } catch (e) {
    const elapsed = (performance.now() - t0) / 1000 || 1;
    liveTargetSpeed = (bytes * 8) / elapsed / 1e6;
  }
  const totalElapsed = (performance.now() - t0) / 1000 || 0.001;
  return (received * 8) / totalElapsed / 1e6;
}

async function measureDownload() {
  const sizes = [500000, 1000000, 2000000, 3000000, 5000000];
  const results = [];
  for (let i = 0; i < sizes.length; i++) {
    setProgress(30 + i * 7, `Download sample ${i + 1}/${sizes.length}`);
    const mbps = await streamDownload(sizes[i]);
    results.push(mbps);
    historyData.dl.push(parseFloat(mbps.toFixed(2)));
    drawHistoryGraph();
  }
  results.sort((a, b) => a - b);
  const trimmed = results.slice(1, -1);
  return parseFloat(
    (trimmed.reduce((a, b) => a + b, 0) / trimmed.length).toFixed(2),
  );
}

// ─── Upload — XHR with progress event = per-chunk live updates ────────────────
function xhrUpload(blob) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const t0 = performance.now();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.loaded > 0) {
        const elapsed = (performance.now() - t0) / 1000;
        liveTargetSpeed = (e.loaded * 8) / elapsed / 1e6;
      }
    });
    xhr.addEventListener('loadend', () => {
      const elapsed = (performance.now() - t0) / 1000 || 0.001;
      resolve((blob.size * 8) / elapsed / 1e6);
    });
    xhr.addEventListener('error', () => {
      const elapsed = (performance.now() - t0) / 1000 || 0.001;
      resolve((blob.size * 8) / elapsed / 1e6);
    });
    try {
      xhr.open('POST', 'https://speed.cloudflare.com/__up?t=' + Date.now());
      xhr.send(blob);
    } catch (e) {
      resolve(0);
    }
  });
}

async function measureUpload() {
  const sizes = [300000, 600000, 1500000, 3000000];
  const results = [];
  for (let i = 0; i < sizes.length; i++) {
    setProgress(70 + i * 6, `Upload sample ${i + 1}/${sizes.length}`);
    const blob = new Blob([new Uint8Array(sizes[i]).fill(65)]);
    const mbps = await xhrUpload(blob);
    results.push(mbps);
    historyData.ul.push(parseFloat(mbps.toFixed(2)));
    drawHistoryGraph();
  }
  results.sort((a, b) => a - b);
  const trimmed = results.slice(1, -1);
  return parseFloat(
    (trimmed.reduce((a, b) => a + b, 0) / trimmed.length).toFixed(2),
  );
}

// ─── IP Fetch ─────────────────────────────────────────────────────────────────
function getIp() {
  fetch('https://api.ipify.org?format=json')
    .then((r) => r.json())
    .then((d) => {
      document.getElementById('ipInfo').textContent = d.ip;
    })
    .catch(() => {});
}

// ─── Rating ───────────────────────────────────────────────────────────────────
function getRating(dl) {
  if (dl >= 50) return ['EXCELLENT', 'badge-great'];
  if (dl >= 25) return ['GOOD', 'badge-good'];
  if (dl >= 10) return ['AVERAGE', 'badge-avg'];
  return ['SLOW', 'badge-slow'];
}

// ─── Main Test ────────────────────────────────────────────────────────────────
async function runTest() {
  const btn = document.getElementById('btnStart');
  btn.disabled = true;
  btn.textContent = 'TESTING...';
  document.getElementById('resultRow').innerHTML = '';
  document.getElementById('pingVal').textContent = '—';
  document.getElementById('dlVal').textContent = '—';
  document.getElementById('ulVal').textContent = '—';
  ['statPing', 'statDl', 'statUl'].forEach((id) =>
    document.getElementById(id).classList.remove('done'),
  );

  // Reset + start live gauge loop
  snapGaugeTo(0);
  liveTargetSpeed = 0;
  startLiveGauge();

  // Reset history
  historyData.dl = [];
  historyData.ul = [];
  const graphSection = document.getElementById('graphSection');
  graphSection.style.display = 'none';

  getIp();

  // ── Ping ──
  setProgress(5, 'Measuring latency...');
  document.getElementById('phaseLabel').classList.add('pulsing');
  const ping = await measurePing();
  document.getElementById('phaseLabel').classList.remove('pulsing');
  document.getElementById('pingVal').textContent = ping;
  document.getElementById('statPing').classList.add('done');
  setProgress(28, 'Latency measured ✓');

  // ── Download ──
  graphSection.style.display = 'block';
  setProgress(30, 'Testing download speed...');
  document.getElementById('phaseLabel').classList.add('pulsing');
  const dl = await measureDownload();
  document.getElementById('phaseLabel').classList.remove('pulsing');
  document.getElementById('dlVal').textContent = dl.toFixed(1);
  document.getElementById('statDl').classList.add('done');
  setProgress(66, 'Download done ✓');

  // ── Upload ──
  liveTargetSpeed = 0;
  setProgress(70, 'Testing upload speed...');
  document.getElementById('phaseLabel').classList.add('pulsing');
  const ul = await measureUpload();
  document.getElementById('phaseLabel').classList.remove('pulsing');
  document.getElementById('ulVal').textContent = ul.toFixed(1);
  document.getElementById('statUl').classList.add('done');
  setProgress(100, 'Test complete ✓');

  // Settle gauge to final download speed
  liveTargetSpeed = dl;
  drawHistoryGraph();
  await sleep(1000);
  stopLiveGauge();

  const [ratingText, ratingClass] = getRating(dl);
  document.getElementById('resultRow').innerHTML =
    `<span class="badge ${ratingClass}">${ratingText} CONNECTION</span>`;

  btn.disabled = false;
  btn.textContent = '↺  Run Again';
}
