# 🪔 Happy Diwali Wishes

A single-page, animated Diwali wishes website with full-screen canvas fireworks, ambient drifting diyas, interactive sparklers, and personal greetings — built with pure vanilla HTML, CSS, and JavaScript (no frameworks, no build step).

---

## 📁 Repository Structure

Everything sits directly at the **project root** so Vercel, GitHub Pages, or any static host can deploy it immediately with zero configuration:

```
├── index.html              # Main website entry point
├── style.css               # Styling, deep violet/indigo gradients & responsive rules
├── script.js               # Canvas particle engine, show sequence & CONFIG
├── README.md               # Project documentation & deployment guide
└── assets/
    ├── her-photo.png       # Transparent-background cutout photo (sticker style)
    └── sounds/             # Optional audio files (boom, crackle, whistle, music)
        └── .gitkeep
```

---

## ✏️ How to Customise

### 1. Change Her Name, Your Name & Wishes

Open **`script.js`** and edit the `CONFIG` object at the very top:

```javascript
const CONFIG = {
  herName : 'Priya',             // Her name (or [HER NAME])
  myName  : 'Gagan',             // Your name (or [MY NAME])

  photoPath : 'assets/her-photo.png',

  wishLines : [
    'Happy Diwali, {name}! 🪔',
    'May your life shine brighter than a thousand diyas.',
    // ▼ Write your personal message below ▼
    'Your smile brings more warmth and joy into my world',
    'than all the festival lights combined.',
    // ▲ End of personal message ▲
    'With all my love, {from} ❤️',
  ],
  ...
};
```

- `{name}` automatically fills in `herName`.
- `{from}` automatically fills in `myName`.

### 2. URL Name Override *(optional)*

You can also send a link with a custom name via WhatsApp or message:

```
https://your-site.vercel.app/?name=Riya
```

The site will read `?name=` and display the wish specifically for her.

### 3. Replace the Photo

Place her photo (a transparent-background PNG cutout works best) at:

```
assets/her-photo.png
```

- On mobile phones, it scales responsively (max 55vw wide).
- On desktop screens, it displays at ~280px.
- It features a crisp white sticker outline, soft shadow, and an orbiting ring of golden diyas.
- If no photo is found or the image fails to load, it automatically falls back to an initial avatar with her first letter.

### 4. Firework Colors

The burst colors are configured in `script.js` under `CONFIG.fireworkColors`:

```javascript
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
```

The palette is dominated by **crimson red, magenta, and royal purple**, with **warm gold** as a glowing accent (~20%) and touches of pink and sparkle white against the deep midnight violet sky.

### 5. Sound Files *(optional)*

To enable festive sounds, place these MP3 files in `assets/sounds/`:

| File | Purpose |
|------|---------|
| `music.mp3` | Ambient background music (loops softly) |
| `boom.mp3` | Firework explosion sound |
| `crackle.mp3` | Crackle sound following the burst |
| `whistle.mp3` | Rising rocket whistle |

> **Note:** Audio files are completely optional. The website works silently and gracefully if any or all sound files are omitted.

---

## 🚀 Deploying to GitHub and Vercel

### Step 1 — Push to GitHub

From the project root:

```bash
git add .
git commit -m "Update Diwali wishes site"
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Log in to [vercel.com](https://vercel.com) with your GitHub account.
2. Click **Add New…** → **Project**.
3. Select your repository (`Diwali-wishes`).
4. In the Project Configuration:
   - **Framework Preset:** `Other` (or auto-detected as static)
   - **Root Directory:** `./`
   - **Build Command:** *(leave blank)*
   - **Output Directory:** *(leave blank)*
5. Click **Deploy**.

Your website will be live in seconds at a URL like `https://diwali-wishes.vercel.app`!

---

## 🎆 Features

- **Autoplay Safe:** Music and audio effects start only on user interaction (`Tap to open 🪔`), fully respecting browser audio policies.
- **Canvas Firework Engine:** 4 distinct burst styles (spherical round, expanding ring, romantic heart, and weeping willow).
- **Interactive Sky:**
  - Tap or click anywhere in the sky to launch a rocket at that point.
  - Drag or swipe across the screen for an interactive sparkler (*phuljhadi*) trail.
  - Floating illuminated diyas and lanterns drift upward in the night sky.
  - Corner mute/unmute button (48px easy-touch target).
  - "Light it again 🎆" button to replay the grand show anytime.
- **Mobile First:** Built using `100dvh`, `touch-action: none`, and `env(safe-area-inset-bottom)` with zero page scrolling or overflow.
- **Accessibility:** Detects `prefers-reduced-motion` and throttles particles for low-power devices.
