const canvas = document.getElementById('gaugeCanvas');
const ctx = canvas.getContext('2d');
const W = 260,
  H = 150;
const CX = W / 2,
  CY = H - 10;
const R = 115;
const START_ANGLE = Math.PI;
const END_ANGLE = 0;

function drawGauge(value, maxVal = 100) {
  ctx.clearRect(0, 0, W, H);
  const pct = Math.min(value / maxVal, 1);
  const sweepAngle = Math.PI * pct;

  // track
  ctx.beginPath();
  ctx.arc(CX, CY, R, START_ANGLE, END_ANGLE, false);
  ctx.strokeStyle = '#111927';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

  // ticks
  for (let i = 0; i <= 10; i++) {
    const angle = Math.PI + (Math.PI / 10) * i;
    const inner = R - 20,
      outer = R - 8;
    const cos = Math.cos(angle),
      sin = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(CX + cos * inner, CY + sin * inner);
    ctx.lineTo(CX + cos * outer, CY + sin * outer);
    ctx.strokeStyle = '#1e2d42';
    ctx.lineWidth = i % 5 === 0 ? 2 : 1;
    ctx.stroke();
  }

  // colored arc
  if (pct > 0) {
    const grd = ctx.createLinearGradient(0, CY, W, CY);
    if (pct < 0.3) {
      grd.addColorStop(0, '#ff453a');
      grd.addColorStop(1, '#ff9f0a');
    } else if (pct < 0.7) {
      grd.addColorStop(0, '#ff9f0a');
      grd.addColorStop(1, '#0099ff');
    } else {
      grd.addColorStop(0, '#0099ff');
      grd.addColorStop(1, '#00d4aa');
    }
    ctx.beginPath();
    ctx.arc(CX, CY, R, START_ANGLE, START_ANGLE + sweepAngle, false);
    ctx.strokeStyle = grd;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    // needle dot
    const needleAngle = START_ANGLE + sweepAngle;
    const nx = CX + Math.cos(needleAngle) * R;
    const ny = CY + Math.sin(needleAngle) * R;
    ctx.beginPath();
    ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  // center dot
  ctx.beginPath();
  ctx.arc(CX, CY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#1e2d42';
  ctx.fill();
}

drawGauge(0);

let animFrame = null;
let currentSpeed = 0;

function animateGaugeTo(target, duration = 800) {
  return new Promise((resolve) => {
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

async function measurePing(samples = 8) {
  const times = [];
  const targets = [
    'https://www.google.com/favicon.ico',
    'https://www.cloudflare.com/favicon.ico',
    'https://www.apple.com/favicon.ico',
  ];
  for (let i = 0; i < samples; i++) {
    const url = targets[i % targets.length] + '?_=' + Date.now();
    const t0 = performance.now();
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store' });
    } catch (e) {}
    times.push(performance.now() - t0);
    await sleep(80);
  }
  times.sort((a, b) => a - b);
  const trimmed = times.slice(1, -1);
  return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length);
}

async function measureDownload() {
  // Use multiple small fetches to estimate throughput
  const urls = [
    'https://speed.cloudflare.com/__down?bytes=1000000',
    'https://speed.cloudflare.com/__down?bytes=2000000',
    'https://speed.cloudflare.com/__down?bytes=5000000',
  ];
  const results = [];
  for (const url of urls) {
    const t0 = performance.now();
    try {
      const r = await fetch(url + '&t=' + Date.now(), { cache: 'no-store' });
      const buf = await r.arrayBuffer();
      const elapsed = (performance.now() - t0) / 1000;
      const bytes = buf.byteLength;
      results.push((bytes * 8) / elapsed / 1e6);
    } catch (e) {
      // fallback: measure time to fetch google
      const t1 = performance.now();
      try {
        await fetch('https://www.google.com/generate_204?_=' + Date.now(), {
          cache: 'no-store',
          mode: 'no-cors',
        });
      } catch (e2) {}
      const elapsed2 = (performance.now() - t1) / 1000;
      results.push(1 / elapsed2); // rough estimate
    }
    setProgress(
      35 + results.length * 10,
      `Downloading... ${results.length}/${urls.length}`,
    );
    await animateGaugeTo(results[results.length - 1] || 0, 400);
  }
  return parseFloat(
    (results.reduce((a, b) => a + b, 0) / results.length).toFixed(2),
  );
}

async function measureUpload() {
  const sizes = [500000, 1000000, 2000000];
  const results = [];
  for (const size of sizes) {
    const data = new Uint8Array(size).fill(65);
    const blob = new Blob([data]);
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
    const elapsed = (performance.now() - t0) / 1000;
    results.push((size * 8) / elapsed / 1e6);
    setProgress(
      75 + results.length * 7,
      `Uploading... ${results.length}/${sizes.length}`,
    );
    await animateGaugeTo(results[results.length - 1] || 0, 400);
  }
  return parseFloat(
    (results.reduce((a, b) => a + b, 0) / results.length).toFixed(2),
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getIp() {
  fetch('https://api.ipify.org?format=json')
    .then((r) => r.json())
    .then((d) => {
      document.getElementById('ipInfo').textContent = d.ip;
    })
    .catch(() => {});
}

function getRating(dl) {
  if (dl >= 50) return ['EXCELLENT', 'badge-great'];
  if (dl >= 25) return ['GOOD', 'badge-good'];
  if (dl >= 10) return ['AVERAGE', 'badge-avg'];
  return ['SLOW', 'badge-slow'];
}

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

  getIp();

  // PING
  setProgress(5, 'Measuring latency...');
  document.getElementById('phaseLabel').classList.add('pulsing');
  const ping = await measurePing();
  document.getElementById('phaseLabel').classList.remove('pulsing');
  document.getElementById('pingVal').textContent = ping;
  document.getElementById('statPing').classList.add('done');
  setProgress(25, 'Ping done ✓');
  await sleep(300);

  // DOWNLOAD
  setProgress(30, 'Testing download speed...');
  document.getElementById('phaseLabel').classList.add('pulsing');
  const dl = await measureDownload();
  document.getElementById('phaseLabel').classList.remove('pulsing');
  await animateGaugeTo(dl, 600);
  document.getElementById('dlVal').textContent = dl.toFixed(1);
  document.getElementById('statDl').classList.add('done');
  setProgress(70, 'Download done ✓');
  await sleep(300);

  // UPLOAD
  setProgress(72, 'Testing upload speed...');
  document.getElementById('phaseLabel').classList.add('pulsing');
  const ul = await measureUpload();
  document.getElementById('phaseLabel').classList.remove('pulsing');
  await animateGaugeTo(ul, 600);
  document.getElementById('ulVal').textContent = ul.toFixed(1);
  document.getElementById('statUl').classList.add('done');
  setProgress(100, 'Test complete ✓');

  await animateGaugeTo(dl, 800);

  const [ratingText, ratingClass] = getRating(dl);
  document.getElementById('resultRow').innerHTML =
    `<span class="badge ${ratingClass}">${ratingText} CONNECTION</span>`;

  btn.disabled = false;
  btn.textContent = '↺ Run Again';
}
