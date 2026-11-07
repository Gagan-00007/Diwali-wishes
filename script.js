/* ================================================================
   🪔  DIWALI WISHES — script.js
   Full-screen canvas firework show + particle system.
   Dominated by crimson, magenta & royal purple with gold accents.
   Everything easily configurable in the CONFIG object below.
   ================================================================ */

// ────────────────────────────────────────────────────────────────
//  CONFIG — edit names, messages, colours, and timing here
// ────────────────────────────────────────────────────────────────
const CONFIG = {
  /* ── Names ─────────────────────────────────────────────── */
  herName : '[HER NAME]',
  myName  : '[MY NAME]',

  /* ── Photo path (transparent-background cutout PNG) ────── */
  photoPath : 'assets/her-photo.png',

  /* ── Wish lines (fade in line-by-line under the photo)
       {name} is replaced by herName, {from} by myName         */
  wishLines : [
    'Happy Diwali, {name}! 🪔',
    'May your life shine brighter than a thousand diyas.',
    /* ▼ [WRITE YOUR OWN 2-3 PERSONAL LINES HERE] ▼ */
    'Your smile brings more warmth and joy into my world',
    'than all the festival lights combined.',
    /* ▲ End of personal lines ▲ */
    'With all my love, {from} ❤️',
  ],

  /* ── Firework burst colours ──────────────────────────────
       Dominated by crimson red, magenta, and royal purple.
       Gold is kept as an accent (~15-20%), with a touch of pink
       and sparkle white for variety.                               */
  fireworkColors : [
    '#e60039',   // Crimson Red
    '#ff0055',   // Vivid Crimson
    '#dc143c',   // Deep Crimson
    '#ff1493',   // Deep Pink / Magenta
    '#e0115f',   // Ruby Magenta
    '#d80073',   // Vivid Magenta
    '#9b30ff',   // Royal Purple
    '#8a2be2',   // Royal Blue-Violet
    '#7b1fa2',   // Deep Purple
    '#ffd700',   // Warm Gold (~15-20% accent)
    '#ffb700',   // Amber Gold
    '#ff69b4',   // Soft Pink
    '#ffffff',   // Sparkle White
  ],

  /* ── Timing (ms) ───────────────────────────────────────── */
  showDuration   : 7000,      // grand opening show length (~7 seconds)
  lineDelay      : 1400,      // delay between each wishing line
  photoAppearAt  : 1800,      // when sticker photo pops in

  /* ── Particle Performance Caps ─────────────────────────── */
  maxParticles        : 5000, // full, big bursts
  maxParticlesLowEnd  : 1400, // safety cap for lower-end phones
  burstRange          : [120, 200], // particles per standard burst
  burstRangeLowEnd    : [60, 95],

  /* ── Audio Settings ────────────────────────────────────── */
  musicVolume : 0.35,
  sfxVolume   : 0.55,
};

// ────────────────────────────────────────────────────────────────
//  URL parameter override:  e.g. ?name=Riya
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
//  RUNTIME STATE
// ────────────────────────────────────────────────────────────────
const STATE = {
  showRunning   : false,
  interactive   : false,
  muted         : false,
  dragging      : false,
  dragX         : 0,
  dragY         : 0,
  reducedMotion : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  lowEnd        : (navigator.hardwareConcurrency || 4) <= 2,
  ptrStartX     : 0,
  ptrStartY     : 0,
  ptrMoved      : false,
};

// ────────────────────────────────────────────────────────────────
//  DOM References
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
//  CANVAS SIZING (devicePixelRatio aware)
// ────────────────────────────────────────────────────────────────
let W = 0, H = 0, DPR = 1;

function resizeCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 2); // cap at 2 for performance
  W = window.innerWidth;
  H = window.innerHeight;
  $canvas.width  = W * DPR;
  $canvas.height = H * DPR;
  $canvas.style.width  = W + 'px';
  $canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  initStars();
  buildRangoli();
});
resizeCanvas();

// ────────────────────────────────────────────────────────────────
//  SOUND MANAGER — Graceful fallback if files are missing
// ────────────────────────────────────────────────────────────────
const Sound = {
  _pools : {},
  _music : null,

  _createPool(name, src, size) {
    if (typeof Audio === 'undefined') return;
    const pool = [];
    for (let i = 0; i < size; i++) {
      try {
        const a = new Audio();
        a.preload = 'auto';
        a.volume  = CONFIG.sfxVolume;
        a.src     = src;
        a.addEventListener('error', () => {}); // silence 404 console noise
        pool.push(a);
      } catch (_) {}
    }
    this._pools[name] = pool;
  },

  init() {
    this._createPool('boom',    'assets/sounds/boom.mp3',    6);
    this._createPool('crackle', 'assets/sounds/crackle.mp3', 6);
    this._createPool('whistle', 'assets/sounds/whistle.mp3', 4);

    try {
      this._music = new Audio();
      this._music.src     = 'assets/sounds/music.mp3';
      this._music.loop    = true;
      this._music.volume  = CONFIG.musicVolume;
      this._music.preload = 'auto';
      this._music.addEventListener('error', () => {});
    } catch (_) {
      this._music = null;
    }
  },

  play(name) {
    if (STATE.muted) return;
    const pool = this._pools[name];
    if (!pool || pool.length === 0) return;
    for (const a of pool) {
      if (a.paused || a.ended) {
        try { a.currentTime = 0; a.play().catch(() => {}); } catch (_) {}
        return;
      }
    }
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
const stars     = []; // background twinkling stars
const rockets   = []; // rising rockets
const particles = []; // burst particles
const sparkles  = []; // sparkler (phuljhadi) particles
const floaters  = []; // floating diyas & lanterns

// ────────────────────────────────────────────────────────────────
//  STARS (Background night sky)
// ────────────────────────────────────────────────────────────────
function initStars(count) {
  count = count || (STATE.lowEnd ? 75 : 140);
  stars.length = 0;
  for (let i = 0; i < count; i++) {
    stars.push({
      x      : Math.random() * W,
      y      : Math.random() * H,
      r      : 0.4 + Math.random() * 1.5,
      speed  : 0.005 + Math.random() * 0.02,
      offset : Math.random() * Math.PI * 2,
    });
  }
}

function drawStars(t) {
  for (const s of stars) {
    const a = 0.2 + 0.8 * Math.abs(Math.sin(t * s.speed + s.offset));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fffff5';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ────────────────────────────────────────────────────────────────
//  ROCKETS (Rising phase)
// ────────────────────────────────────────────────────────────────
function launchRocket(targetX, targetY, forcedColor) {
  const startX = targetX + (Math.random() - 0.5) * 60;
  const speed  = 6.5 + Math.random() * 3.0;
  const angle  = Math.atan2(targetY - H, targetX - startX);

  const color = forcedColor || CONFIG.fireworkColors[Math.floor(Math.random() * CONFIG.fireworkColors.length)];
  const style = ['round', 'ring', 'heart', 'willow'][Math.floor(Math.random() * 4)];

  rockets.push({
    x: startX,
    y: H + 12,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    targetY,
    trail: [],
    style,
    color,
  });

  Sound.play('whistle');
}

function updateRockets() {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.x += r.vx;
    r.y += r.vy;

    // rocket smoke trail
    r.trail.push({ x: r.x, y: r.y, a: 1.0 });
    if (r.trail.length > 20) r.trail.shift();
    for (const tp of r.trail) tp.a *= 0.88;

    for (const tp of r.trail) {
      ctx.globalAlpha = tp.a * 0.65;
      ctx.fillStyle = '#ffcc77';
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rocket head
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r.x, r.y, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Reached burst height
    if (r.y <= r.targetY) {
      createBurst(r.x, r.y, r.style, r.color);
      Sound.play('boom');
      setTimeout(() => Sound.play('crackle'), 70 + Math.random() * 180);
      rockets.splice(i, 1);
    }
  }
  ctx.globalAlpha = 1;
}

// ────────────────────────────────────────────────────────────────
//  BURSTS (Fuller, bigger, crimson/magenta/purple dominant)
// ────────────────────────────────────────────────────────────────
function getMaxP()  { return STATE.lowEnd ? CONFIG.maxParticlesLowEnd : CONFIG.maxParticles; }
function getRange() { return STATE.lowEnd ? CONFIG.burstRangeLowEnd   : CONFIG.burstRange; }

function createBurst(x, y, style, color) {
  const [lo, hi] = getRange();
  let count = lo + Math.floor(Math.random() * (hi - lo));
  if (STATE.reducedMotion) count = Math.floor(count * 0.4);

  // Safety cap so browser never lags
  count = Math.min(count, getMaxP() - particles.length);
  if (count <= 0) return;

  switch (style) {
    case 'round':  burstRound(x, y, count, color);  break;
    case 'ring':   burstRing(x, y, count, color);   break;
    case 'heart':  burstHeart(x, y, count, color);  break;
    case 'willow': burstWillow(x, y, count, color); break;
    default:       burstRound(x, y, count, color);
  }
}

function addParticle(x, y, vx, vy, color, decay, gravity, size) {
  particles.push({
    x, y, vx, vy, color,
    alpha    : 1,
    decay    : decay + Math.random() * 0.003,
    size     : (size || 1.6) + Math.random() * 1.6,
    gravity  : gravity,
    friction : 0.98,
  });
}

/* 1. Classic round sphere burst — bigger spread */
function burstRound(x, y, n, c) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.8 + Math.random() * 5.8;
    addParticle(x, y, Math.cos(a)*s, Math.sin(a)*s, c, 0.009, 0.026);
  }
}

/* 2. Expanding Ring burst */
function burstRing(x, y, n, c) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = 4.6 + Math.random() * 1.0;
    addParticle(x, y, Math.cos(a)*s, Math.sin(a)*s, c, 0.010, 0.022);
  }
}

/* 3. Romantic Heart burst */
function burstHeart(x, y, n, c) {
  const sc = (3.8 + Math.random() * 0.7) / 16;
  for (let i = 0; i < n; i++) {
    const t  = (i / n) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t));
    addParticle(x, y, hx*sc, hy*sc, c, 0.009, 0.018);
  }
}

/* 4. Weeping Willow cascade — sparks linger and drift down gracefully */
function burstWillow(x, y, n, c) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.0 + Math.random() * 3.8;
    addParticle(x, y, Math.cos(a)*s, Math.sin(a)*s - 0.4, c, 0.005, 0.048, 1.8);
  }
}

// ────────────────────────────────────────────────────────────────
//  UPDATE & DRAW PARTICLES
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

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // Outer faint glow halo
    if (doGlow) {
      ctx.globalAlpha = p.alpha * 0.28;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core spark
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  FLOATING DIYAS & LANTERNS (Gentle ambient drift after show)
// ────────────────────────────────────────────────────────────────
let floaterTimer = null;

function spawnFloater() {
  if (floaters.length > (STATE.lowEnd ? 6 : 14)) return;
  floaters.push({
    x       : Math.random() * W,
    y       : H + 25,
    vy      : -(0.28 + Math.random() * 0.45),
    vx      : (Math.random() - 0.5) * 0.25,
    sz      : 8 + Math.random() * 8,
    a       : 0.55 + Math.random() * 0.4,
    kind    : Math.random() > 0.45 ? 'diya' : 'lantern',
    wobble  : Math.random() * Math.PI * 2,
    wobbleS : 0.008 + Math.random() * 0.015,
  });
}

function startFloaters() {
  if (floaterTimer) return;
  (function tick() {
    spawnFloater();
    floaterTimer = setTimeout(tick, 1600 + Math.random() * 2200);
  })();
}

function stopFloaters() {
  clearTimeout(floaterTimer);
  floaterTimer = null;
}

function updateFloaters(t) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.y += f.vy;
    f.x += f.vx + Math.sin(t * f.wobbleS + f.wobble) * 0.18;
    if (f.y < -35) {
      floaters.splice(i, 1);
      continue;
    }
    if (f.kind === 'diya') drawCanvasDiya(f.x, f.y, f.sz, f.a);
    else                   drawCanvasLantern(f.x, f.y, f.sz, f.a);
  }
}

function drawCanvasDiya(x, y, sz, a) {
  ctx.save();
  // Warm aura
  ctx.globalAlpha = a * 0.26;
  const g = ctx.createRadialGradient(x, y - sz*0.3, 0, x, y - sz*0.3, sz * 1.1);
  g.addColorStop(0, 'rgba(255,190,40,0.75)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - sz*0.3, sz * 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Golden flame
  ctx.globalAlpha = a;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.ellipse(x, y - sz*0.5, sz*0.16, sz*0.36, 0, 0, Math.PI * 2);
  ctx.fill();

  // Clay bowl
  ctx.fillStyle = '#cd853f';
  ctx.beginPath();
  ctx.ellipse(x, y + sz*0.05, sz*0.38, sz*0.16, 0, 0, Math.PI);
  ctx.fill();
  ctx.restore();
}

function drawCanvasLantern(x, y, sz, a) {
  ctx.save();
  // Violet-magenta/amber glow
  ctx.globalAlpha = a * 0.20;
  const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 1.3);
  g.addColorStop(0, 'rgba(255,100,50,0.7)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, sz * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Lantern body
  ctx.globalAlpha = a * 0.7;
  ctx.fillStyle = '#ff3366';
  ctx.beginPath();
  ctx.ellipse(x, y, sz*0.42, sz*0.58, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner flame light
  ctx.globalAlpha = a * 0.55;
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.ellipse(x, y, sz*0.22, sz*0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  SPARKLER (PHULJHADI) — Follows finger or mouse while dragging
// ────────────────────────────────────────────────────────────────
function emitSparkler() {
  if (!STATE.dragging || STATE.reducedMotion) return;
  const count = STATE.lowEnd ? 2 : 4;
  for (let i = 0; i < count; i++) {
    const colors = ['#ffd700', '#ff0055', '#ff1493', '#ffffff', '#e0115f'];
    sparkles.push({
      x     : STATE.dragX + (Math.random() - 0.5) * 6,
      y     : STATE.dragY + (Math.random() - 0.5) * 6,
      vx    : (Math.random() - 0.5) * 4.0,
      vy    : (Math.random() - 0.5) * 4.0 - 1.2,
      sz    : 0.9 + Math.random() * 1.8,
      alpha : 1,
      decay : 0.028 + Math.random() * 0.02,
      color : colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.045,
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

    if (s.alpha <= 0) {
      sparkles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = s.alpha;
    ctx.fillStyle   = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  MAIN ANIMATION LOOP
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
//  RESPONSIVE RANGOLI RING (Never overflows 360px screen)
// ────────────────────────────────────────────────────────────────
function buildRangoli() {
  $rangoli.innerHTML = '';
  // Measure photo wrap or fallback
  const rect = $photoWrap.getBoundingClientRect();
  const wrapW = rect.width || (window.innerWidth < 768 ? Math.min(window.innerWidth * 0.65, 240) : 320);

  // Safety constraint: keep ring at least 22px from the screen edge on mobile
  const maxSafeRadius = (window.innerWidth / 2) - 22;
  const desiredRadius = (wrapW / 2) + 14;
  const radius = Math.min(desiredRadius, maxSafeRadius);

  const n = 12;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * 360;
    const dot = document.createElement('span');
    dot.className = 'r-dot';
    dot.textContent = (i % 2 === 0) ? '🪔' : '✦';
    dot.style.color = (i % 2 === 0) ? '#ffd700' : '#ff1493';
    dot.style.transform = `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)`;
    $rangoli.appendChild(dot);
  }
}

// ────────────────────────────────────────────────────────────────
//  PHOTO FALLBACK
// ────────────────────────────────────────────────────────────────
$photo.addEventListener('error', () => {
  $photo.style.display = 'none';
  if ($photoWrap.querySelector('.photo-placeholder')) return;
  const ph = document.createElement('div');
  ph.className = 'photo-placeholder';
  ph.textContent = CONFIG.herName.charAt(0) || '🪔';
  $photoWrap.insertBefore(ph, $photo);
});

// ────────────────────────────────────────────────────────────────
//  GRAND SHOW SEQUENCE (6-8 seconds, fast cadence, whole sky)
// ────────────────────────────────────────────────────────────────
let showTimeouts = [];

function startShow() {
  STATE.showRunning = true;
  STATE.interactive = false;

  Sound.startMusic();

  // Wide spread coverage across the entire sky (8% to 92% of screen width)
  // 16 rockets total with dual/triple bursts for a grand festive climax
  const schedule = STATE.reducedMotion ? [
    { t: 200,  x: 0.30, y: 0.18 },
    { t: 1800, x: 0.70, y: 0.22 },
    { t: 3600, x: 0.45, y: 0.15 },
    { t: 5400, x: 0.60, y: 0.20 },
  ] : [
    { t: 100,  x: 0.20, y: 0.22 }, // Left opening
    { t: 450,  x: 0.80, y: 0.18 }, // Right opening
    { t: 900,  x: 0.50, y: 0.12 }, // High center
    { t: 1400, x: 0.12, y: 0.28 }, // Far left
    { t: 1750, x: 0.88, y: 0.25 }, // Far right
    { t: 2200, x: 0.35, y: 0.16 }, // Center left
    { t: 2500, x: 0.68, y: 0.14 }, // Center right (dual burst feel)
    { t: 3100, x: 0.18, y: 0.20 },
    { t: 3500, x: 0.52, y: 0.10 }, // Big high burst
    { t: 4000, x: 0.82, y: 0.22 },
    { t: 4500, x: 0.28, y: 0.18 },
    { t: 4900, x: 0.72, y: 0.16 },
    { t: 5400, x: 0.42, y: 0.12 },
    { t: 5800, x: 0.15, y: 0.24 }, // Pre-finale spread
    { t: 6300, x: 0.85, y: 0.20 },
    { t: 6700, x: 0.50, y: 0.14 }, // Grand finale burst
  ];

  schedule.forEach((item) => {
    const id = setTimeout(() => {
      const targetX = item.x * W;
      const targetY = item.y * H;
      launchRocket(targetX, targetY);
    }, item.t);
    showTimeouts.push(id);
  });

  // Photo pop-in during early show
  const photoId = setTimeout(() => {
    $photoWrap.classList.remove('hidden');
    $photoWrap.classList.add('show');
    buildRangoli();
  }, CONFIG.photoAppearAt);
  showTimeouts.push(photoId);

  // Line-by-line wishing text
  const lines = CONFIG.wishLines.map(l =>
    l.replace(/\{name\}/g, CONFIG.herName).replace(/\{from\}/g, CONFIG.myName)
  );

  lines.forEach((text, idx) => {
    const textId = setTimeout(() => {
      const p = document.createElement('p');
      p.className = 'wish-line';
      p.textContent = text;
      $wishText.appendChild(p);
      requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('visible')));
    }, CONFIG.photoAppearAt + 600 + idx * CONFIG.lineDelay);
    showTimeouts.push(textId);
  });

  // Transition smoothly into interactive mode
  const totalShowTime = Math.max(CONFIG.showDuration, CONFIG.photoAppearAt + 600 + lines.length * CONFIG.lineDelay);
  const endId = setTimeout(() => {
    STATE.showRunning = false;
    STATE.interactive = true;
    $controls.classList.remove('hidden');
    startFloaters();
  }, totalShowTime + 800);
  showTimeouts.push(endId);
}

function replayShow() {
  // Cancel any running show timers
  showTimeouts.forEach(clearTimeout);
  showTimeouts = [];

  // Clear canvas particle arrays
  particles.length = 0;
  rockets.length   = 0;
  sparkles.length  = 0;
  floaters.length  = 0;
  stopFloaters();

  // Reset DOM elements
  $photoWrap.classList.add('hidden');
  $photoWrap.classList.remove('show');
  $wishText.innerHTML = '';
  $controls.classList.add('hidden');
  STATE.interactive = false;

  // Restart sequence
  startShow();
}

// ────────────────────────────────────────────────────────────────
//  OPENING SCREEN STARS
// ────────────────────────────────────────────────────────────────
function generateOpeningStars() {
  const container = document.getElementById('opening-stars');
  if (!container) return;
  container.innerHTML = '';
  const count = 90;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = 1 + Math.random() * 2.4;
    s.style.width  = sz + 'px';
    s.style.height = sz + 'px';
    s.style.left   = Math.random() * 100 + '%';
    s.style.top    = Math.random() * 100 + '%';
    s.style.setProperty('--dur', (2 + Math.random() * 3).toFixed(1) + 's');
    s.style.animationDelay = (Math.random() * 4).toFixed(1) + 's';
    container.appendChild(s);
  }
}

// ────────────────────────────────────────────────────────────────
//  EVENT LISTENERS
// ────────────────────────────────────────────────────────────────

/* ── Tap to open ─────────────────────────────────────────────── */
$openBtn.addEventListener('click', () => {
  $opening.classList.add('fade-out');
  setTimeout(() => {
    $opening.style.display = 'none';
    $main.classList.remove('hidden');
    resizeCanvas();
    initStars();
    buildRangoli();
    startShow();
  }, 850);
});

/* ── Interactive Pointer Events (Canvas clicks and drag-sparkler) */
function getCanvasCoords(e) {
  const r = $canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

$canvas.addEventListener('pointerdown', (e) => {
  if (!STATE.interactive) return;
  const { x, y } = getCanvasCoords(e);
  STATE.ptrStartX = x;
  STATE.ptrStartY = y;
  STATE.ptrMoved  = false;
  STATE.dragging  = true;
  STATE.dragX     = x;
  STATE.dragY     = y;
  try { $canvas.setPointerCapture(e.pointerId); } catch (_) {}
});

$canvas.addEventListener('pointermove', (e) => {
  if (!STATE.dragging) return;
  const { x, y } = getCanvasCoords(e);
  STATE.dragX = x;
  STATE.dragY = y;
  const dx = x - STATE.ptrStartX;
  const dy = y - STATE.ptrStartY;
  if (dx*dx + dy*dy > 100) {
    STATE.ptrMoved = true;
  }
});

$canvas.addEventListener('pointerup', (e) => {
  if (!STATE.interactive) return;
  STATE.dragging = false;
  if (!STATE.ptrMoved) {
    // Tap → launch a burst at that exact point
    const { x, y } = getCanvasCoords(e);
    launchRocket(x, y);
  }
});

$canvas.addEventListener('pointercancel', () => {
  STATE.dragging = false;
});

/* ── Light it again replay button ────────────────────────────── */
$replayBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  replayShow();
});

/* ── Mute / Unmute audio button ──────────────────────────────── */
$muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isMuted = Sound.toggleMute();
  $muteBtn.textContent = isMuted ? '🔇' : '🔊';
  if (!isMuted && (STATE.showRunning || STATE.interactive)) {
    Sound.startMusic();
  }
});

// ────────────────────────────────────────────────────────────────
//  INITIALISATION
// ────────────────────────────────────────────────────────────────
function init() {
  Sound.init();
  generateOpeningStars();
  buildRangoli();
  $photo.src = CONFIG.photoPath;
  requestAnimationFrame(animate);
}

init();
