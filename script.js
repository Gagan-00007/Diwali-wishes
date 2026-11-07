/* ================================================================
   🪔  DIWALI WISHES — script.js
   Canvas-based firework + particle system with festive Diwali
   effects. Everything configurable from the CONFIG object below.
   ================================================================ */

// ────────────────────────────────────────────────────────────────
//  CONFIG — edit names, messages, colours, timing here
// ────────────────────────────────────────────────────────────────
const CONFIG = {
  /* ── Names ─────────────────────────────────────────────── */
  herName : 'Someone Special',
  myName  : 'Your Name',

  /* ── Photo path (transparent-background PNG) ───────────── */
  photoPath : 'assets/her-photo.png',

  /* ── Wish lines (shown one by one under the photo)
       {name} → herName,  {from} → myName                    */
  wishLines : [
    'Happy Diwali, {name}! 🪔',
    'May your life shine brighter than a thousand diyas.',
    /* ▼ Write your own personal lines below ▼ */
    'Your warmth and your smile light up every room,',
    'just like diyas light up the darkest nights.',
    /* ▲ End of personal lines ▲ */
    'With all my love, {from} ❤️',
  ],

  /* ── Firework burst colours ────────────────────────────── */
  fireworkColors : [
    '#ff0040',   // crimson
    '#9b30ff',   // royal purple
    '#ff1493',   // magenta
    '#ffd700',   // gold
    '#ff69b4',   // pink
    '#ffffff',   // white
    '#e040fb',   // bright purple
    '#ff6f00',   // deep amber
  ],

  /* ── Timing (ms) ───────────────────────────────────────── */
  showDuration   : 6000,      // grand firework show length
  lineDelay      : 1500,      // gap between wish lines
  photoAppearAt  : 2000,      // when photo pops in

  /* ── Performance caps ──────────────────────────────────── */
  maxParticles        : 3500,
  maxParticlesLowEnd  : 900,
  burstRange          : [60, 120],
  burstRangeLowEnd    : [30, 60],

  /* ── Audio volumes ─────────────────────────────────────── */
  musicVolume : 0.3,
  sfxVolume   : 0.5,
};

// ────────────────────────────────────────────────────────────────
//  URL parameter override:  ?name=Riya
// ────────────────────────────────────────────────────────────────
(function applyURLParams() {
  try {
    const p = new URLSearchParams(window.location.search);
    const n = p.get('name');
    if (n) CONFIG.herName = decodeURIComponent(n);
  } catch (_) { /* ignore */ }
})();
document.title = `Happy Diwali, ${CONFIG.herName} 🪔`;

// ────────────────────────────────────────────────────────────────
//  STATE
// ────────────────────────────────────────────────────────────────
const STATE = {
  showRunning  : false,
  interactive  : false,
  muted        : false,
  dragging     : false,
  dragX        : 0,
  dragY        : 0,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  lowEnd       : (navigator.hardwareConcurrency || 4) <= 2,
  ptrStartX    : 0,
  ptrStartY    : 0,
  ptrMoved     : false,
};

// ────────────────────────────────────────────────────────────────
//  DOM references
// ────────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $opening   = $('#opening-screen');
const $main      = $('#main-screen');
const $canvas    = $('#fw-canvas');
const $openBtn   = $('#open-btn');
const $photoWrap = $('#photo-wrap');
const $photo     = $('#photo');
const $wishText  = $('#wish-text');
const $controls  = $('#controls');
const $replayBtn = $('#replay-btn');
const $muteBtn   = $('#mute-btn');
const $rangoli   = $('#rangoli-ring');

const ctx = $canvas.getContext('2d');

// ────────────────────────────────────────────────────────────────
//  CANVAS sizing (respects devicePixelRatio)
// ────────────────────────────────────────────────────────────────
let W, H, DPR;

function resizeCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);   // cap at 2× for perf
  W = window.innerWidth;
  H = window.innerHeight;
  $canvas.width  = W * DPR;
  $canvas.height = H * DPR;
  $canvas.style.width  = W + 'px';
  $canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', () => { resizeCanvas(); initStars(); });
resizeCanvas();

// ────────────────────────────────────────────────────────────────
//  SOUND MANAGER — safe audio with pools, graceful if missing
// ────────────────────────────────────────────────────────────────
const Sound = {
  _pools : {},
  _music : null,

  /** Create a pool of N Audio clones for an SFX */
  _pool(name, src, n) {
    if (typeof Audio === 'undefined') return;
    const arr = [];
    for (let i = 0; i < n; i++) {
      try {
        const a = new Audio();
        a.preload = 'auto';
        a.volume  = CONFIG.sfxVolume;
        a.src     = src;
        a.addEventListener('error', () => {});   // suppress console noise
        arr.push(a);
      } catch (_) { /* skip */ }
    }
    this._pools[name] = arr;
  },

  init() {
    this._pool('boom',    'assets/sounds/boom.mp3',    5);
    this._pool('crackle', 'assets/sounds/crackle.mp3', 5);
    this._pool('whistle', 'assets/sounds/whistle.mp3', 4);
    // Background music
    try {
      this._music = new Audio();
      this._music.src     = 'assets/sounds/music.mp3';
      this._music.loop    = true;
      this._music.volume  = CONFIG.musicVolume;
      this._music.preload = 'auto';
      this._music.addEventListener('error', () => {});
    } catch (_) { this._music = null; }
  },

  /** Play an SFX from its pool */
  play(name) {
    if (STATE.muted) return;
    const pool = this._pools[name];
    if (!pool || pool.length === 0) return;
    // Find a free (paused/ended) element
    for (const a of pool) {
      if (a.paused || a.ended) {
        try { a.currentTime = 0; a.play().catch(() => {}); } catch (_) {}
        return;
      }
    }
    // All busy — reuse first
    try { pool[0].currentTime = 0; pool[0].play().catch(() => {}); } catch (_) {}
  },

  startMusic() {
    if (STATE.muted || !this._music) return;
    try { this._music.play().catch(() => {}); } catch (_) {}
  },

  stopMusic() {
    if (!this._music) return;
    try { this._music.pause(); this._music.currentTime = 0; } catch (_) {}
  },

  toggleMute() {
    STATE.muted = !STATE.muted;
    if (this._music) this._music.muted = STATE.muted;
    return STATE.muted;
  },
};

// ────────────────────────────────────────────────────────────────
//  PARTICLE ARRAYS
// ────────────────────────────────────────────────────────────────
const stars     = [];   // background twinkling stars
const rockets   = [];   // rising firework rockets
const particles = [];   // burst particles
const sparkles  = [];   // sparkler (phuljhadi) particles
const floaters  = [];   // floating diyas & lanterns

// ────────────────────────────────────────────────────────────────
//  STARS
// ────────────────────────────────────────────────────────────────
function initStars(count) {
  count = count || (STATE.lowEnd ? 80 : 150);
  stars.length = 0;
  for (let i = 0; i < count; i++) {
    stars.push({
      x : Math.random() * W,
      y : Math.random() * H,
      r : 0.4 + Math.random() * 1.6,
      speed  : 0.005 + Math.random() * 0.02,
      offset : Math.random() * Math.PI * 2,
    });
  }
}

function drawStars(t) {
  for (const s of stars) {
    const a = 0.25 + 0.75 * Math.abs(Math.sin(t * s.speed + s.offset));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fffff0';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ────────────────────────────────────────────────────────────────
//  ROCKETS (rising phase)
// ────────────────────────────────────────────────────────────────
function launchRocket(targetX, targetY) {
  const startX = targetX + (Math.random() - 0.5) * 80;
  const dist   = H - targetY;
  const speed  = 5 + Math.random() * 3;
  const angle  = Math.atan2(targetY - H, targetX - startX);

  rockets.push({
    x : startX,  y : H + 10,
    vx : Math.cos(angle) * speed,
    vy : Math.sin(angle) * speed,
    targetY,
    trail : [],
    style : ['round', 'ring', 'heart', 'willow'][Math.floor(Math.random() * 4)],
    color : CONFIG.fireworkColors[Math.floor(Math.random() * CONFIG.fireworkColors.length)],
  });

  Sound.play('whistle');
}

function updateRockets() {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.x += r.vx;
    r.y += r.vy;

    // trail
    r.trail.push({ x: r.x, y: r.y, a: 1 });
    if (r.trail.length > 18) r.trail.shift();
    for (const tp of r.trail) tp.a *= 0.88;

    // draw trail
    for (const tp of r.trail) {
      ctx.globalAlpha = tp.a * 0.7;
      ctx.fillStyle = '#ffcc66';
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // rocket head
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // reached target?
    if (r.y <= r.targetY) {
      createBurst(r.x, r.y, r.style, r.color);
      Sound.play('boom');
      setTimeout(() => Sound.play('crackle'), 80 + Math.random() * 200);
      rockets.splice(i, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// ────────────────────────────────────────────────────────────────
//  BURSTS
// ────────────────────────────────────────────────────────────────
function maxP()  { return STATE.lowEnd ? CONFIG.maxParticlesLowEnd : CONFIG.maxParticles; }
function range() { return STATE.lowEnd ? CONFIG.burstRangeLowEnd   : CONFIG.burstRange; }

function createBurst(x, y, style, color) {
  const [lo, hi] = range();
  let count = lo + Math.floor(Math.random() * (hi - lo));
  if (STATE.reducedMotion) count = Math.floor(count * 0.4);
  count = Math.min(count, maxP() - particles.length);
  if (count <= 0) return;

  switch (style) {
    case 'round': burstRound(x, y, count, color); break;
    case 'ring':  burstRing(x, y, count, color);  break;
    case 'heart': burstHeart(x, y, count, color);  break;
    case 'willow':burstWillow(x, y, count, color); break;
    default:      burstRound(x, y, count, color);
  }
}

function addP(x, y, vx, vy, color, decay, gravity) {
  particles.push({
    x, y, vx, vy, color,
    alpha    : 1,
    decay    : decay + Math.random() * 0.004,
    size     : 1.2 + Math.random() * 1.6,
    gravity  : gravity,
    friction : 0.98,
  });
}

function burstRound(x, y, n, c) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 4.5;
    addP(x, y, Math.cos(a)*s, Math.sin(a)*s, c, 0.012, 0.028);
  }
}

function burstRing(x, y, n, c) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = 3.5 + Math.random() * 0.6;
    addP(x, y, Math.cos(a)*s, Math.sin(a)*s, c, 0.013, 0.025);
  }
}

function burstHeart(x, y, n, c) {
  for (let i = 0; i < n; i++) {
    const t  = (i / n) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t));
    const sc = (2.8 + Math.random() * 0.5) / 16;
    addP(x, y, hx*sc, hy*sc, c, 0.01, 0.018);
  }
}

function burstWillow(x, y, n, c) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 0.8 + Math.random() * 3;
    addP(x, y, Math.cos(a)*s, Math.sin(a)*s - 0.5, c, 0.005, 0.055);
  }
}

// ────────────────────────────────────────────────────────────────
//  UPDATE & DRAW particles
// ────────────────────────────────────────────────────────────────
function updateParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const doGlow = !STATE.lowEnd;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vx *= p.friction;
    p.vy *= p.friction;
    p.vy += p.gravity;
    p.x  += p.vx;
    p.y  += p.vy;
    p.alpha -= p.decay;

    if (p.alpha <= 0) { particles.splice(i, 1); continue; }

    // glow ring (larger, faint)
    if (doGlow) {
      ctx.globalAlpha = p.alpha * 0.25;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // core dot
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  FLOATING DIYAS & LANTERNS
// ────────────────────────────────────────────────────────────────
let floaterTimer = null;

function spawnFloater() {
  if (floaters.length > (STATE.lowEnd ? 6 : 14)) return;
  floaters.push({
    x  : Math.random() * W,
    y  : H + 20,
    vy : -(0.25 + Math.random() * 0.45),
    vx : (Math.random() - 0.5) * 0.25,
    sz : 7 + Math.random() * 7,
    a  : 0.5 + Math.random() * 0.4,
    kind    : Math.random() > 0.5 ? 'diya' : 'lantern',
    wobble  : Math.random() * Math.PI * 2,
    wobbleS : 0.008 + Math.random() * 0.015,
  });
}

function startFloaters() {
  if (floaterTimer) return;
  (function tick() {
    spawnFloater();
    floaterTimer = setTimeout(tick, 1800 + Math.random() * 2500);
  })();
}
function stopFloaters() { clearTimeout(floaterTimer); floaterTimer = null; }

function updateFloaters(t) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.y += f.vy;
    f.x += f.vx + Math.sin(t * f.wobbleS + f.wobble) * 0.15;
    if (f.y < -30) { floaters.splice(i, 1); continue; }

    if (f.kind === 'diya')    drawCanvasDiya(f.x, f.y, f.sz, f.a);
    else                      drawCanvasLantern(f.x, f.y, f.sz, f.a);
  }
}

function drawCanvasDiya(x, y, sz, a) {
  ctx.save();
  // warm glow
  ctx.globalAlpha = a * 0.25;
  const g = ctx.createRadialGradient(x, y - sz*0.3, 0, x, y - sz*0.3, sz);
  g.addColorStop(0, 'rgba(255,200,50,0.7)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - sz*0.3, sz, 0, Math.PI * 2);
  ctx.fill();
  // flame
  ctx.globalAlpha = a;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.ellipse(x, y - sz*0.5, sz*0.15, sz*0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // bowl
  ctx.fillStyle = '#cd853f';
  ctx.beginPath();
  ctx.ellipse(x, y + sz*0.05, sz*0.35, sz*0.15, 0, 0, Math.PI);
  ctx.fill();
  ctx.restore();
}

function drawCanvasLantern(x, y, sz, a) {
  ctx.save();
  // outer glow
  ctx.globalAlpha = a * 0.18;
  const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 1.2);
  g.addColorStop(0, 'rgba(255,140,40,0.6)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, sz * 1.2, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.globalAlpha = a * 0.65;
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.ellipse(x, y, sz*0.4, sz*0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // inner bright
  ctx.globalAlpha = a * 0.45;
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.ellipse(x, y, sz*0.22, sz*0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  SPARKLER (PHULJHADI) — follows finger/mouse while dragging
// ────────────────────────────────────────────────────────────────
function emitSparkler() {
  if (!STATE.dragging || STATE.reducedMotion) return;
  const count = STATE.lowEnd ? 2 : 4;
  for (let i = 0; i < count; i++) {
    sparkles.push({
      x  : STATE.dragX + (Math.random()-0.5)*5,
      y  : STATE.dragY + (Math.random()-0.5)*5,
      vx : (Math.random()-0.5)*3.5,
      vy : (Math.random()-0.5)*3.5 - 1,
      sz : 0.8 + Math.random()*1.5,
      alpha : 1,
      decay : 0.03 + Math.random()*0.02,
      color : Math.random() > 0.3 ? '#ffd700' : '#ffffff',
      gravity : 0.04,
    });
  }
}

function updateSparkler() {
  emitSparkler();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.x  += s.vx;
    s.y  += s.vy;
    s.vy += s.gravity;
    s.alpha -= s.decay;
    if (s.alpha <= 0) { sparkles.splice(i, 1); continue; }

    ctx.globalAlpha = s.alpha;
    ctx.fillStyle   = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  ANIMATION LOOP
// ────────────────────────────────────────────────────────────────
function animate(ts) {
  const t = ts || 0;
  ctx.clearRect(0, 0, W, H);

  drawStars(t * 0.001);
  updateRockets();
  updateParticles();

  if (STATE.interactive) {
    updateFloaters(t * 0.001);
  }
  updateSparkler();

  requestAnimationFrame(animate);
}

// ────────────────────────────────────────────────────────────────
//  RANGOLI ring (small 🪔 emojis orbiting the photo)
// ────────────────────────────────────────────────────────────────
function buildRangoli() {
  $rangoli.innerHTML = '';
  const n = 10;
  const radius = 110;   // px from centre
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 360;
    const dot = document.createElement('span');
    dot.className = 'r-dot';
    dot.textContent = (i % 2 === 0) ? '🪔' : '✦';
    dot.style.color = '#ffd700';
    dot.style.transform =
      `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)`;
    $rangoli.appendChild(dot);
  }
}

// ────────────────────────────────────────────────────────────────
//  PHOTO error → placeholder with first letter
// ────────────────────────────────────────────────────────────────
$photo.addEventListener('error', () => {
  $photo.style.display = 'none';
  if ($photoWrap.querySelector('.photo-placeholder')) return;
  const ph = document.createElement('div');
  ph.className = 'photo-placeholder';
  ph.textContent = CONFIG.herName.charAt(0) || '✨';
  $photoWrap.insertBefore(ph, $photo);
});

// ────────────────────────────────────────────────────────────────
//  SHOW SEQUENCE
// ────────────────────────────────────────────────────────────────
let showTimeouts = [];

function startShow() {
  STATE.showRunning = true;
  STATE.interactive = false;

  Sound.startMusic();

  // Schedule fireworks
  const total = STATE.reducedMotion ? 4 : 12;
  for (let i = 0; i < total; i++) {
    const delay = (i / total) * CONFIG.showDuration * 0.85;
    const id = setTimeout(() => {
      const x = W * 0.15 + Math.random() * W * 0.7;
      const y = H * 0.08 + Math.random() * H * 0.35;
      launchRocket(x, y);
    }, delay);
    showTimeouts.push(id);
  }

  // Photo pop-in
  const pid = setTimeout(() => {
    $photoWrap.classList.remove('hidden');
    $photoWrap.classList.add('show');
  }, CONFIG.photoAppearAt);
  showTimeouts.push(pid);

  // Wish lines
  const lines = CONFIG.wishLines.map(l =>
    l.replace(/\{name\}/g, CONFIG.herName).replace(/\{from\}/g, CONFIG.myName)
  );
  lines.forEach((text, idx) => {
    const id2 = setTimeout(() => {
      const p = document.createElement('p');
      p.className = 'wish-line';
      p.textContent = text;
      $wishText.appendChild(p);
      requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('visible')));
    }, CONFIG.photoAppearAt + 600 + idx * CONFIG.lineDelay);
    showTimeouts.push(id2);
  });

  // End of show → interactive
  const endId = setTimeout(() => {
    STATE.showRunning = false;
    STATE.interactive = true;
    $controls.classList.remove('hidden');
    startFloaters();
  }, CONFIG.showDuration + 1500);
  showTimeouts.push(endId);
}

function replayShow() {
  // Cancel pending timers
  showTimeouts.forEach(clearTimeout);
  showTimeouts = [];

  // Clear arrays
  particles.length = 0;
  rockets.length   = 0;
  sparkles.length  = 0;
  floaters.length  = 0;
  stopFloaters();

  // Reset DOM
  $photoWrap.classList.add('hidden');
  $photoWrap.classList.remove('show');
  $wishText.innerHTML = '';
  $controls.classList.add('hidden');
  STATE.interactive = false;

  // Re-run
  startShow();
}

// ────────────────────────────────────────────────────────────────
//  OPENING-SCREEN STARS (CSS dots)
// ────────────────────────────────────────────────────────────────
function generateOpeningStars() {
  const container = document.getElementById('opening-stars');
  const count = 90;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = 1 + Math.random() * 2.5;
    s.style.width  = sz + 'px';
    s.style.height = sz + 'px';
    s.style.left = Math.random() * 100 + '%';
    s.style.top  = Math.random() * 100 + '%';
    s.style.setProperty('--dur', (2 + Math.random() * 3).toFixed(1) + 's');
    s.style.animationDelay = (Math.random() * 4).toFixed(1) + 's';
    container.appendChild(s);
  }
}

// ────────────────────────────────────────────────────────────────
//  EVENT LISTENERS
// ────────────────────────────────────────────────────────────────

/* ── Open button ─────────────────────────────────────────────── */
$openBtn.addEventListener('click', () => {
  $opening.classList.add('fade-out');
  // After fade-out transition completes, switch screens
  setTimeout(() => {
    $opening.style.display = 'none';
    $main.classList.remove('hidden');
    resizeCanvas();
    initStars();
    startShow();
  }, 900);
});

/* ── Pointer events (unified mouse + touch) ──────────────────── */
function canvasCoords(e) {
  const r = $canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

$canvas.addEventListener('pointerdown', (e) => {
  if (!STATE.interactive) return;
  const { x, y } = canvasCoords(e);
  STATE.ptrStartX = x;
  STATE.ptrStartY = y;
  STATE.ptrMoved  = false;
  STATE.dragging   = true;
  STATE.dragX = x;
  STATE.dragY = y;
  try { $canvas.setPointerCapture(e.pointerId); } catch (_) {}
});

$canvas.addEventListener('pointermove', (e) => {
  if (!STATE.dragging) return;
  const { x, y } = canvasCoords(e);
  STATE.dragX = x;
  STATE.dragY = y;
  const dx = x - STATE.ptrStartX;
  const dy = y - STATE.ptrStartY;
  if (dx*dx + dy*dy > 120) STATE.ptrMoved = true;
});

$canvas.addEventListener('pointerup', (e) => {
  if (!STATE.interactive) return;
  STATE.dragging = false;
  if (!STATE.ptrMoved) {
    // Tap → launch a firework at that point
    const { x, y } = canvasCoords(e);
    launchRocket(x, y);
  }
});

$canvas.addEventListener('pointercancel', () => { STATE.dragging = false; });

/* ── Replay button ───────────────────────────────────────────── */
$replayBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  replayShow();
});

/* ── Mute / unmute ───────────────────────────────────────────── */
$muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const muted = Sound.toggleMute();
  $muteBtn.textContent = muted ? '🔇' : '🔊';
  // If un-muting and music should be playing
  if (!muted && (STATE.showRunning || STATE.interactive)) {
    Sound.startMusic();
  }
});

// ────────────────────────────────────────────────────────────────
//  INIT
// ────────────────────────────────────────────────────────────────
function init() {
  Sound.init();
  generateOpeningStars();
  buildRangoli();
  // Photo src from config (in case changed)
  $photo.src = CONFIG.photoPath;
  // Start render loop (runs even before show, keeps canvas clear)
  requestAnimationFrame(animate);
}

init();

