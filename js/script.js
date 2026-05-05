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

// ─── Gauge animation ──────────────────────────────────────────────────────────
let animFrame = null;
let currentSpeed = 0;

function animateGaugeTo(target, duration = 600) {
  return new Promise((resolve) => {
    if (animFrame) cancelAnimationFrame(animFrame);
    const start = currentSpeed;
    const t0 = performance.now();
    function step(now) {
      const t = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      currentSpeed = start + (target - start) * ease;
      drawGauge(currentSpeed);
      document.getElementById('speedNum').textContent =
        currentSpeed < 1 ? currentSpeed.toFixed(2) : currentSpeed.toFixed(1);
      if (t < 1) animFrame = requestAnimationFrame(step);
      else {
        currentSpeed = target;
        resolve();
      }
    }
    animFrame = requestAnimationFrame(step);
  });
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
    // no pause — continuous
  }
  times.sort((a, b) => a - b);
  const trimmed = times.slice(1, -1);
  return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
}

// ─── Download (5 samples, continuous) ────────────────────────────────────────
async function measureDownload() {
  const tests = [
    { url: 'https://speed.cloudflare.com/__down?bytes=500000', bytes: 500000 },
    {
      url: 'https://speed.cloudflare.com/__down?bytes=1000000',
      bytes: 1000000,
    },
    {
      url: 'https://speed.cloudflare.com/__down?bytes=2000000',
      bytes: 2000000,
    },
    {
      url: 'https://speed.cloudflare.com/__down?bytes=3000000',
      bytes: 3000000,
    },
    {
      url: 'https://speed.cloudflare.com/__down?bytes=5000000',
      bytes: 5000000,
    },
  ];
  const results = [];

  for (let i = 0; i < tests.length; i++) {
    const { url, bytes } = tests[i];
    const t0 = performance.now();
    let mbps = 0;
    try {
      const r = await fetch(url + '&t=' + Date.now(), { cache: 'no-store' });
      const buf = await r.arrayBuffer();
      const elapsed = (performance.now() - t0) / 1000;
      mbps = (buf.byteLength * 8) / elapsed / 1e6;
    } catch (e) {
      // fallback estimate
      const elapsed = (performance.now() - t0) / 1000 || 1;
      mbps = (bytes * 8) / elapsed / 1e6;
    }
    results.push(mbps);
    historyData.dl.push(parseFloat(mbps.toFixed(2)));
    drawHistoryGraph();
    setProgress(
      30 + (i + 1) * 7,
      `Download sample ${i + 1}/5  (${mbps.toFixed(1)} Mbps)`,
    );
    animateGaugeTo(mbps, 350); // don't await — keep sampling
  }

  // drop best + worst for stability
  results.sort((a, b) => a - b);
  const trimmed = results.slice(1, -1);
  return parseFloat(
    (trimmed.reduce((a, b) => a + b, 0) / trimmed.length).toFixed(2),
  );
}

// ─── Upload (4 samples, continuous) ──────────────────────────────────────────
async function measureUpload() {
  const sizes = [300000, 600000, 1000000, 2000000];
  const results = [];

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const blob = new Blob([new Uint8Array(size).fill(65)]);
    const t0 = performance.now();
    try {
      await fetch('https://speed.cloudflare.com/__up?t=' + Date.now(), {
        method: 'POST',
        body: blob,
        cache: 'no-store',
      });
    } catch (e) {
      try {
        await fetch('https://httpbin.org/post?_=' + Date.now(), {
          method: 'POST',
          body: blob,
          mode: 'no-cors',
          cache: 'no-store',
        });
      } catch (e2) {}
    }
    const elapsed = (performance.now() - t0) / 1000 || 1;
    const mbps = (size * 8) / elapsed / 1e6;
    results.push(mbps);
    historyData.ul.push(parseFloat(mbps.toFixed(2)));
    drawHistoryGraph();
    setProgress(
      70 + (i + 1) * 6,
      `Upload sample ${i + 1}/4  (${mbps.toFixed(1)} Mbps)`,
    );
    animateGaugeTo(mbps, 350);
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
  currentSpeed = 0;
  drawGauge(0);
  document.getElementById('speedNum').textContent = '0';

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
  setProgress(70, 'Testing upload speed...');
  document.getElementById('phaseLabel').classList.add('pulsing');
  const ul = await measureUpload();
  document.getElementById('phaseLabel').classList.remove('pulsing');
  document.getElementById('ulVal').textContent = ul.toFixed(1);
  document.getElementById('statUl').classList.add('done');
  setProgress(100, 'Test complete ✓');

  await animateGaugeTo(dl, 700);
  drawHistoryGraph();

  const [ratingText, ratingClass] = getRating(dl);
  document.getElementById('resultRow').innerHTML =
    `<span class="badge ${ratingClass}">${ratingText} CONNECTION</span>`;

  btn.disabled = false;
  btn.textContent = '↺  Run Again';
}
