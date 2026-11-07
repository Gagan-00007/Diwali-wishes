# 🪔 Happy Diwali Wishes

A single-page animated Diwali wishes website with canvas fireworks, interactive effects, and a personal message — built with plain HTML, CSS, and vanilla JavaScript (no frameworks, no build step).

---

## ✏️ How to Customise

### 1. Replace the Photo

Drop a **transparent-background PNG** (sticker/cutout style works best) into:

```
assets/her-photo.png
```

If you skip this step the page will show a placeholder with the person's initial — nothing breaks.

### 2. Add Sound Files *(optional)*

Place these MP3s in `assets/sounds/`:

| File            | What it's used for               |
|-----------------|----------------------------------|
| `music.mp3`     | Background music (loops)         |
| `boom.mp3`      | Firework explosion               |
| `crackle.mp3`   | Crackle after the boom           |
| `whistle.mp3`   | Rocket rising whistle            |

All sounds are optional. The page works silently if any or all are missing.

### 3. Edit the Message

Open **`script.js`** and find the `CONFIG` object at the very top:

```js
const CONFIG = {
  herName : 'Someone Special',   // ← her name
  myName  : 'Your Name',         // ← your name

  wishLines : [
    'Happy Diwali, {name}! 🪔',
    'May your life shine brighter than a thousand diyas.',
    // ▼ Write your personal lines here ▼
    'Your warmth and your smile light up every room,',
    'just like diyas light up the darkest nights.',
    // ▲ End of personal lines ▲
    'With all my love, {from} ❤️',
  ],
  ...
};
```

- `{name}` is replaced with `herName`, `{from}` with `myName`.
- Add, remove, or rewrite lines freely.

### 4. Name from URL *(optional)*

Append `?name=Riya` to the URL to override the default name:

```
https://your-site.vercel.app/?name=Riya
```

### 5. Tweak Colours

All colours live in CSS variables at the top of **`style.css`**:

```css
:root {
  --sky-top:    #12002b;
  --sky-bottom: #2a0845;
  --gold:       #ffd700;
  /* … */
}
```

Firework burst colours are in the `CONFIG.fireworkColors` array in `script.js`.

---

## 🚀 Deploy on GitHub + Vercel

### Step 1 — Push to GitHub

```bash
cd wish                        # project root
git init
git add .
git commit -m "🪔 Diwali wishes"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/diwali-wish.git
git push -u origin main
```

### Step 2 — Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Click **Import** next to your `diwali-wish` repo.
3. Configure the project:
   - **Framework Preset:** `Other`
   - **Build Command:** *(leave empty)*
   - **Output Directory:** `.` (the root)
4. Click **Deploy**.

Your site will be live at `https://diwali-wish.vercel.app` (or your custom domain) within seconds.

> **Tip:** Every `git push` to `main` will auto-deploy the latest version.

---

## 📂 File Structure

```
wish/
├── index.html          Main page
├── style.css           All styles + CSS variables
├── script.js           All JS logic + CONFIG
├── README.md           This file
└── assets/
    ├── her-photo.png   Sticker photo (transparent PNG)
    └── sounds/
        ├── boom.mp3
        ├── crackle.mp3
        ├── whistle.mp3
        └── music.mp3
```

---

## 🎆 Features

- Canvas-based particle firework system with four burst styles (round, ring, heart, willow)
- Tap/click anywhere in the sky to launch a firework
- Drag/swipe for a sparkler (phuljhadi) trail
- Floating diyas and lanterns after the show
- Sticker-style photo with CSS drop-shadow outline
- Rotating rangoli ring
- Line-by-line animated wish text
- Background music + SFX with mute toggle
- Mobile-first (`100dvh`, touch events, no overflow)
- `devicePixelRatio`-aware canvas
- `prefers-reduced-motion` support
- Performance caps for low-end devices
- Graceful audio fallback (works with or without sound files)

---

Built with ❤️ and 🪔

