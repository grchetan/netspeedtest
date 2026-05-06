// ─── Canvas Gauge ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('gaugeCanvas');
const ctx = canvas.getContext('2d');
const W = 260,
  H = 150,
  CX = W / 2,
  CY = H - 10,
  R = 115;

function drawGauge(value, maxVal = 200) {
  ctx.clearRect(0, 0, W, H);
  const pct = Math.min(value / maxVal, 1);
  const sweepAngle = Math.PI * pct;

  ctx.beginPath();
  ctx.arc(CX, CY, R, Math.PI, 0, false);
  ctx.strokeStyle = '#1a2236';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

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
    ctx.arc(CX, CY, R, Math.PI, Math.PI + sweepAngle, false);
    ctx.strokeStyle = grd;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    const na = Math.PI + sweepAngle;
    ctx.beginPath();
    ctx.arc(CX + Math.cos(na) * R, CY + Math.sin(na) * R, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(CX, CY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#1e2d42';
  ctx.fill();
}

drawGauge(0);

// ─── Speed display ────────────────────────────────────────────────────────────
const speedEl = document.getElementById('speedNum');
function setSpeedDisplay(v) {
  const unitEl = document.getElementById('gaugeUnit');
  if (v >= 1000) {
    speedEl.textContent = (v / 1000).toFixed(2);
    if (unitEl) unitEl.textContent = 'GBPS';
  } else if (v >= 0.1) {
    speedEl.textContent = v < 10 ? v.toFixed(2) : v.toFixed(1);
    if (unitEl) unitEl.textContent = 'MBPS';
  } else if (v > 0) {
    speedEl.textContent = (v * 1000).toFixed(1);
    if (unitEl) unitEl.textContent = 'KBPS';
  } else {
    speedEl.textContent = '0';
    if (unitEl) unitEl.textContent = 'MBPS';
  }
}

// ─── Live Gauge Loop ──────────────────────────────────────────────────────────
let rafId = null;
let displaySpeed = 0;
let targetSpeed = 0;

function startGauge() {
  if (rafId) return;
  function frame() {
    displaySpeed += (targetSpeed - displaySpeed) * 0.15;
    drawGauge(displaySpeed);
    setSpeedDisplay(displaySpeed);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
}

function stopGauge() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function resetGauge() {
  stopGauge();
  displaySpeed = 0;
  targetSpeed = 0;
  drawGauge(0);
  setSpeedDisplay(0);
}

// ─── History Graph ────────────────────────────────────────────────────────────
const graphPoints = { dl: [], ul: [] };

function renderGraph() {
  const gc = document.getElementById('historyGraph');
  if (!gc || !gc.offsetParent) return;
  const gctx = gc.getContext('2d');
  const W2 = gc.offsetWidth || 520,
    H2 = 120;
  gc.width = W2;
  gctx.clearRect(0, 0, W2, H2);

  const all = [...graphPoints.dl, ...graphPoints.ul];
  if (all.length < 1) return;
  const maxV = Math.max(...all, 5) * 1.2;
  const pad = { l: 8, r: 8, t: 8, b: 8 };
  const cW = W2 - pad.l - pad.r,
    cH = H2 - pad.t - pad.b;
  const toX = (i, n) => pad.l + (i / Math.max(n - 1, 1)) * cW;
  const toY = (v) => pad.t + cH - (v / maxV) * cH;

  gctx.strokeStyle = 'rgba(255,255,255,0.04)';
  gctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad.t + (i / 3) * cH;
    gctx.beginPath();
    gctx.moveTo(pad.l, y);
    gctx.lineTo(W2 - pad.r, y);
    gctx.stroke();
  }

  function drawLine(data, color) {
    if (data.length < 1) return;
    const grad = gctx.createLinearGradient(0, pad.t, 0, H2);
    grad.addColorStop(0, color.replace('rgb(', 'rgba(').replace(')', ',0.2)'));
    grad.addColorStop(1, color.replace('rgb(', 'rgba(').replace(')', ',0)'));

    if (data.length === 1) {
      gctx.beginPath();
      gctx.arc(pad.l + cW / 2, toY(data[0]), 4, 0, Math.PI * 2);
      gctx.fillStyle = color;
      gctx.fill();
      return;
    }

    gctx.beginPath();
    gctx.moveTo(toX(0, data.length), toY(data[0]));
    for (let i = 1; i < data.length; i++)
      gctx.lineTo(toX(i, data.length), toY(data[i]));
    gctx.lineTo(toX(data.length - 1, data.length), H2 - pad.b);
    gctx.lineTo(toX(0, data.length), H2 - pad.b);
    gctx.closePath();
    gctx.fillStyle = grad;
    gctx.fill();

    gctx.beginPath();
    gctx.moveTo(toX(0, data.length), toY(data[0]));
    for (let i = 1; i < data.length; i++)
      gctx.lineTo(toX(i, data.length), toY(data[i]));
    gctx.strokeStyle = color;
    gctx.lineWidth = 2;
    gctx.lineJoin = 'round';
    gctx.stroke();

    data.forEach((v, i) => {
      gctx.beginPath();
      gctx.arc(toX(i, data.length), toY(v), 3, 0, Math.PI * 2);
      gctx.fillStyle = color;
      gctx.fill();
    });
  }

  drawLine(graphPoints.dl, 'rgb(59,130,246)');
  drawLine(graphPoints.ul, 'rgb(16,185,129)');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMbps(v) {
  if (v >= 1000) return { val: (v / 1000).toFixed(2), unit: 'GBPS' };
  if (v >= 0.1)
    return { val: v < 10 ? v.toFixed(2) : v.toFixed(1), unit: 'MBPS' };
  return { val: (v * 1000).toFixed(1), unit: 'KBPS' };
}

function setProgress(pct, label) {
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('phaseLabel').textContent = label;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Ping ─────────────────────────────────────────────────────────────────────
async function measurePing() {
  const urls = [
    'https://www.google.com/favicon.ico',
    'https://www.cloudflare.com/favicon.ico',
    'https://www.apple.com/favicon.ico',
  ];
  const times = [];
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    try {
      await fetch(urls[i % urls.length] + '?_=' + Date.now(), {
        mode: 'no-cors',
        cache: 'no-store',
      });
    } catch (e) {}
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const mid = times.slice(2, -2);
  return Math.round(mid.reduce((a, b) => a + b, 0) / mid.length);
}

// ─── Download — Fast.com style ────────────────────────────────────────────────
// 4 parallel streams, 25MB each, 2-sec sliding window, stops when stable
async function measureDownload() {
  const PARALLEL = 4;
  const CHUNK_SIZE = 25_000_000; // 25MB per stream
  const MAX_DUR = 15000;
  const WINDOW = 2000;
  const SAMPLE_INT = 200;

  const startTime = performance.now();
  let totalBytes = 0;
  let stopped = false;
  const snapshots = [{ ts: 0, bytes: 0 }];
  let lastGraphPush = 0;

  function currentMbps() {
    const now = performance.now() - startTime;
    while (snapshots.length > 1 && now - snapshots[0].ts > WINDOW)
      snapshots.shift();
    const dt = (now - snapshots[0].ts) / 1000;
    const db = totalBytes - snapshots[0].bytes;
    return dt > 0 ? (db * 8) / dt / 1e6 : 0;
  }

  async function runStream() {
    while (!stopped) {
      const url =
        `https://speed.cloudflare.com/__down?bytes=${CHUNK_SIZE}&t=` +
        Date.now() +
        Math.random();
      try {
        const resp = await fetch(url, { cache: 'no-store' });
        const reader = resp.body.getReader();
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.length;
          snapshots.push({
            ts: performance.now() - startTime,
            bytes: totalBytes,
          });
          targetSpeed = currentMbps();
          const now = performance.now();
          if (now - lastGraphPush > SAMPLE_INT) {
            lastGraphPush = now;
            graphPoints.dl.push(parseFloat(targetSpeed.toFixed(2)));
            renderGraph();
          }
        }
      } catch (e) {
        /* retry */
      }
    }
  }

  const streams = [];
  for (let i = 0; i < PARALLEL; i++) streams.push(runStream());

  const progressTimer = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const pct = Math.min(30 + (elapsed / MAX_DUR) * 36, 64);
    setProgress(pct, 'Testing download speed...');
  }, 300);

  let stableFor = 0,
    lastCheck = 0;
  await new Promise((resolve) => {
    const check = setInterval(() => {
      const now = performance.now() - startTime;
      const mbps = currentMbps();
      const delta = Math.abs(mbps - lastCheck);
      lastCheck = mbps;
      if (now > 5000 && mbps > 0 && delta / mbps < 0.1) {
        stableFor += 500;
        if (stableFor >= 3000) {
          clearInterval(check);
          stopped = true;
          resolve();
        }
      } else {
        stableFor = 0;
      }
      if (now >= MAX_DUR) {
        clearInterval(check);
        stopped = true;
        resolve();
      }
    }, 500);
  });

  clearInterval(progressTimer);
  await Promise.allSettled(streams);

  const pts = [...graphPoints.dl].sort((a, b) => a - b);
  const lo = Math.floor(pts.length * 0.2),
    hi = Math.ceil(pts.length * 0.8);
  const mid = pts.slice(lo, hi);
  return mid.length
    ? parseFloat((mid.reduce((a, b) => a + b, 0) / mid.length).toFixed(2))
    : parseFloat(targetSpeed.toFixed(2));
}

// ─── Upload — Fast.com style ──────────────────────────────────────────────────
async function measureUpload() {
  const MAX_DUR = 14000;
  const WINDOW = 3000;
  const SAMPLE_INT = 250;

  // All these endpoints allow CORS POST
  const ENDPOINTS = [
    'https://httpbin.org/post',
    'https://postman-echo.com/post',
    'https://jsonplaceholder.typicode.com/posts',
    'https://httpbin.org/anything',
  ];

  // Probe to find working endpoint
  setProgress(71, 'Finding upload server...');
  let endpoint = ENDPOINTS[0];
  for (const url of ENDPOINTS) {
    try {
      const r = await fetch(url + '?p=1', {
        method: 'POST',
        body: new Blob([new Uint8Array(200).fill(65)]),
        cache: 'no-store',
      });
      if (r.status < 500) {
        endpoint = url;
        break;
      }
    } catch (e) {}
  }

  const startTime = performance.now();
  let totalSent = 0;
  let stopped = false;
  const snapshots = [{ ts: 0, bytes: 0 }];
  let lastGraphTime = startTime;
  const activeXhrs = [];

  function currentMbps() {
    const now = performance.now() - startTime;
    while (snapshots.length > 1 && now - snapshots[0].ts > WINDOW)
      snapshots.shift();
    const dt = (now - snapshots[0].ts) / 1000;
    const db = totalSent - snapshots[0].bytes;
    return dt > 0.1 ? (db * 8) / dt / 1e6 : 0;
  }

  function onBytesSent(bytes) {
    totalSent += bytes;
    snapshots.push({ ts: performance.now() - startTime, bytes: totalSent });
    targetSpeed = currentMbps();
    const now = performance.now();
    if (now - lastGraphTime > SAMPLE_INT) {
      lastGraphTime = now;
      graphPoints.ul.push(parseFloat(targetSpeed.toFixed(2)));
      renderGraph();
    }
  }

  // XHR-based worker — uses upload.onprogress for live bytes, abortable
  function xhrWorker(blobSize) {
    return new Promise((resolve) => {
      let running = true;

      function sendOne() {
        if (stopped || !running) {
          resolve();
          return;
        }
        const blob = new Blob([new Uint8Array(blobSize).fill(65)]);
        const xhr = new XMLHttpRequest();
        activeXhrs.push(xhr);
        let lastLoaded = 0;

        xhr.upload.onprogress = (e) => {
          if (stopped) {
            xhr.abort();
            return;
          }
          const diff = e.loaded - lastLoaded;
          if (diff > 0) {
            lastLoaded = e.loaded;
            onBytesSent(diff);
          }
        };

        xhr.onloadend = () => {
          const idx = activeXhrs.indexOf(xhr);
          if (idx !== -1) activeXhrs.splice(idx, 1);
          if (stopped) {
            running = false;
            resolve();
            return;
          }
          // If progress events didn't fire (some servers), count full blob
          if (lastLoaded === 0) onBytesSent(blobSize);
          sendOne(); // chain next upload immediately
        };

        xhr.onerror = () => {
          const idx = activeXhrs.indexOf(xhr);
          if (idx !== -1) activeXhrs.splice(idx, 1);
          if (!stopped) setTimeout(sendOne, 300);
          else {
            running = false;
            resolve();
          }
        };

        xhr.open(
          'POST',
          endpoint + '?t=' + Date.now() + ((Math.random() * 1000) | 0),
        );
        xhr.send(blob);
      }

      sendOne();
    });
  }

  // Launch 3 parallel XHR workers
  const workers = [
    xhrWorker(1_500_000),
    xhrWorker(2_000_000),
    xhrWorker(1_000_000),
  ];

  const progressTimer = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const pct = Math.min(72 + (elapsed / MAX_DUR) * 24, 96);
    setProgress(pct, 'Testing upload speed...');
  }, 300);

  let stableFor = 0,
    lastCheck = 0;
  await new Promise((resolve) => {
    const check = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const mbps = currentMbps();
      const delta = Math.abs(mbps - lastCheck);
      lastCheck = mbps;
      if (elapsed > 5000 && mbps > 0.1 && delta / mbps < 0.12) {
        stableFor += 500;
        if (stableFor >= 2500) {
          clearInterval(check);
          resolve();
        }
      } else {
        stableFor = 0;
      }
      if (elapsed >= MAX_DUR) {
        clearInterval(check);
        resolve();
      }
    }, 500);
  });

  // Stop all workers
  stopped = true;
  activeXhrs.forEach((x) => {
    try {
      x.abort();
    } catch (e) {}
  });
  clearInterval(progressTimer);
  await Promise.allSettled(workers);

  const pts = [...graphPoints.ul].sort((a, b) => a - b);
  if (pts.length < 3) {
    const totalElapsed = (performance.now() - startTime) / 1000;
    return parseFloat(((totalSent * 8) / totalElapsed / 1e6).toFixed(2));
  }
  const lo = Math.floor(pts.length * 0.2),
    hi = Math.ceil(pts.length * 0.8);
  const mid = pts.slice(lo, hi);
  return parseFloat((mid.reduce((a, b) => a + b, 0) / mid.length).toFixed(2));
}

// ─── IP ───────────────────────────────────────────────────────────────────────
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
  if (dl >= 100) return ['EXCELLENT', 'badge-great'];
  if (dl >= 50) return ['GOOD', 'badge-good'];
  if (dl >= 10) return ['AVERAGE', 'badge-avg'];
  return ['SLOW', 'badge-slow'];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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

  resetGauge();
  graphPoints.dl = [];
  graphPoints.ul = [];
  document.getElementById('graphSection').style.display = 'none';
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
  document.getElementById('graphSection').style.display = 'block';
  setProgress(30, 'Testing download speed...');
  document.getElementById('phaseLabel').classList.add('pulsing');
  startGauge();
  const dl = await measureDownload();
  document.getElementById('phaseLabel').classList.remove('pulsing');
  document.getElementById('dlVal').textContent = formatMbps(dl).val;
  document.getElementById('dlUnit').textContent = formatMbps(dl).unit;
  document.getElementById('statDl').classList.add('done');
  setProgress(66, 'Download complete ✓');
  await sleep(400);

  // ── Upload ──
  targetSpeed = 0;
  setProgress(70, 'Testing upload speed...');
  document.getElementById('phaseLabel').classList.add('pulsing');
  const ul = await measureUpload();
  document.getElementById('phaseLabel').classList.remove('pulsing');
  document.getElementById('ulVal').textContent = formatMbps(ul).val;
  document.getElementById('ulUnit').textContent = formatMbps(ul).unit;
  document.getElementById('statUl').classList.add('done');
  setProgress(100, 'Test complete ✓');

  targetSpeed = dl;
  renderGraph();
  await sleep(1200);
  stopGauge();
  displaySpeed = dl;
  drawGauge(dl);
  setSpeedDisplay(dl);

  const [ratingText, ratingClass] = getRating(dl);
  document.getElementById('resultRow').innerHTML =
    `<span class="badge ${ratingClass}">${ratingText} CONNECTION</span>`;

  btn.disabled = false;
  btn.textContent = '↺  Run Again';
}
