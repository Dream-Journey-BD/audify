<div align="center">
  <img src="public/logo.svg" alt="Audify Logo" width="760" />

  <p align="center">
    <strong>Studio-Grade Silence Detection, Waveform Slicing &amp; LUFS Normalization Workstation</strong>
  </p>

  <p align="center">
    <a href="#features">Features</a> •
    <a href="#quick-setup">Quick Setup</a> •
    <a href="#github-pages-deployment">Deploy</a> •
    <a href="#usage-guide">Usage Guide</a> •
    <a href="#keyboard-shortcuts">Shortcuts</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#license">License</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/React-19.0-blue?style=flat-square&logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Web_Audio_API-100%25_Client--Side-10B981?style=flat-square" alt="Web Audio API" />
    <img src="https://img.shields.io/badge/Vulnerabilities-0-brightgreen?style=flat-square" alt="Vulnerabilities: 0" />
    <img src="https://img.shields.io/badge/License-MIT-amber?style=flat-square" alt="MIT License" />
  </p>
</div>

---

## Project Overview

**Audify** is a lightweight, ultra-fast web workstation engineered for podcasters, voice actors, audiobook creators, sound editors, and developers. It automates audio editing tasks—detecting silent pauses, trimming dead air, and matching broadcast loudness standards (LUFS/EBU R128)—without requiring heavy desktop software or uploading sensitive audio to cloud servers.

Everything executes **100% client-side** inside the browser using modern Web Audio API DSP pipelines, SIMD-compatible array arithmetic, and Web Workers.

---

## Key Features

### 1. Smart Silence Detection & Dynamic Waveform Slicing
- **Adaptive Energy Thresholds:** Calibrate detection sensitivity from `-60 dB` to `-15 dB` with live threshold overlay.
- **Natural Boundary Padding:** Configure millisecond pre/post padding to preserve consonant attacks and natural breathing.
- **Short Transient Filtering:** Set minimum speech duration constraints to reject mouth clicks and background pops.
- **Dead Air Compaction:** Automatically detect and compress long pauses inside monologue phrases.
- **Interactive Multi-Zoom Canvas:** Scrub audio with minimap navigation, high-resolution sample zoom, split, duplicate, merge, and drag-boundary nudging.

### 2. Voice Leveler & Loudness Intelligence
- **ITU-R BS.1770 / EBU R128 Measurement:** Calculate Integrated Loudness (LUFS), Loudness Range (LRA in LU), RMS power, and Crest Factor.
- **True Peak Oversampling:** Measure inter-sample peaks to protect against digital distortion.
- **Target Presets:**
  - **Podcast:** `-16 LUFS`, `-1.0 dBFS` True Peak
  - **YouTube:** `-14 LUFS`, `-1.0 dBFS` True Peak
  - **Spotify:** `-14 LUFS`, `-1.0 dBFS` True Peak
  - **Clean Dialogue:** `-18 LUFS`, `-1.0 dBFS` True Peak
  - **Broadcast EBU R128:** `-23 LUFS`, `-1.0 dBFS` True Peak
  - **Peak Normalization:** Peak normalization to `-1.0 dBFS`
- **Voice Analytics:** Fundamental frequency ($F_0$) pitch detection with musical note mapping, spectral centroid brightness, and 3-band energy distribution.
- **Master Bus Chain:** High-pass rumble reduction (80 Hz), vocal warmth EQ, soft-knee leveling compressor, and brickwall limiter guard.

### 3. Batch Export
- **Dual Formats:** Export uncompressed 16-bit PCM WAV or high-efficiency MP3 (128, 192, 256, 320 kbps).
- **Packaging Modes:**
  - **ZIP Archive:** Export slices as sequentially numbered files (`voice_01.mp3`, `voice_02.mp3`) with audio metadata.
  - **Consolidated Track:** Concatenate leveled segments into a single audio file with customizable pauses.

---

## Quick Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- `npm` or `bun`

### Installation & Local Run

```bash
# 1. Clone the repository
git clone https://github.com/DreamJourneyBD/Audify.git
cd Audify

# 2. Install dependencies
npm install

# 3. Start local development server (runs on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## GitHub Pages Deployment (Manual 1-Click)

Audify is fully configured for manual deployment to GitHub Pages using the `gh-pages` branch. No automatic builds on push—deploy strictly when you are ready.

### 1. Configure GitHub Pages (One-Time Setup)
1. Go to your GitHub repository: `https://github.com/DreamJourneyBD/Audify`
2. Open **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **"Deploy from a branch"**.
4. Set Branch to **`gh-pages`** and folder to **`/(root)`**, then click **Save**.

### 2. Manual Deploy Command
Whenever you want to publish your latest changes to live:
```bash
npm run deploy
```
This builds the production bundle and pushes it to the `gh-pages` branch. Your app will be live at:
**`https://dreamjourneybd.github.io/Audify/`**

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause active playback |
| `J` / `←` | Jump backward 1.0 second |
| `L` / `→` | Jump forward 1.0 second |
| `K` | Stop playback and return playhead to start |
| `+` / `=` | Zoom in on waveform |
| `-` / `_` | Zoom out on waveform |
| `0` | Reset zoom to fit full duration |
| `S` | Split active segment at playhead |
| `D` | Duplicate currently selected segment |
| `Delete` / `Backspace` | Remove selected segment |
| `Ctrl + Z` / `Cmd + Z` | Undo last edit action |
| `Ctrl + Shift + Z` | Redo last edit action |
| `?` | Open keyboard shortcuts modal |

---

## Architecture

```
Audify/
├── public/
│   ├── favicon.svg          # Vector brand favicon
│   ├── logo.svg             # Project banner logo
│   ├── icon-192.svg         # Square app icon (192px)
│   └── icon-512.svg         # Square app icon (512px)
├── src/
│   ├── components/
│   │   ├── intelligence/    # Voice Leveler & LUFS analysis components
│   │   ├── segments/        # Segment cards and actions
│   │   ├── silence/         # Silence detection parameters & metrics
│   │   ├── waveform/        # High-resolution waveform canvas
│   │   ├── export/          # Export dialogs and format options
│   │   └── Header.tsx       # Top navigation bar
│   ├── utils/
│   │   ├── analytics/       # ITU-R BS.1770 K-weighting, True Peak & F0 pitch
│   │   ├── audio/           # Web Audio context, MP3/WAV encoders, segment slicing
│   │   ├── normalization/   # Dynamic LUFS gain matching & batch audio processors
│   │   └── asyncScheduler.ts# UI non-blocking event-loop yielding helpers
│   ├── types.ts             # TypeScript domain interfaces
│   ├── App.tsx              # Main workstation coordinator
│   └── main.tsx             # React entry point
├── package.json             # Dependencies and build/deploy scripts
└── vite.config.ts           # Vite + Tailwind configuration with base path
```

---

## Privacy

- **Zero Server Uploads:** Audio never leaves your device.
- **Zero Telemetry Tracking:** No third-party tracking scripts or remote analytics.
- **Zero Network Ingress:** All processing occurs in local sandbox memory.

---

## License

This project is licensed under the [MIT License](LICENSE).
