# Cloud Gallery

A modern, dark-themed image gallery web application with Cloudinary integration.

## Features

- **Masonry Gallery** — Pinterest-style responsive layout preserving original aspect ratios
- **Infinite Scroll** — Automatic lazy loading as you scroll
- **Lightbox** — Fullscreen image viewer with keyboard navigation (←/→/Esc) and download
- **Upload System** — Drag & drop or file picker with progress bar (JPG, PNG, WEBP, GIF, AVIF)
- **Cloudinary Backend** — Secure server-side upload with optimized image delivery
- **Dark Premium UI** — Near-black background, subtle borders, red/orange accent
- **Responsive** — Desktop (5 columns) to mobile (2 columns)
- **Skeleton Loading** — Shimmer placeholders while images load
- **Error Handling** — Graceful fallbacks for failed images and API errors

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Cloudinary

Edit `.env` with your Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

### 3. Run the app

Start both the Express API server and Vite dev server:

```bash
npm run dev:all
```

Or run them separately:

```bash
# Terminal 1 — API server (port 3001)
npm run server

# Terminal 2 — Vite dev server (port 5173)
npm run dev
```

### 4. Open in browser

Visit `http://localhost:5173`

## Architecture

```
cloud/
├── server/index.js        # Express API (upload, list, delete)
├── src/
│   ├── App.jsx            # Root component
│   ├── App.css            # All styles
│   ├── main.jsx           # Entry point
│   └── components/
│       ├── Header.jsx     # Top nav bar with search + upload
│       ├── GalleryControls.jsx  # "Top Day" + Images/Videos toggle
│       ├── Gallery.jsx    # Masonry grid + infinite scroll
│       ├── Lightbox.jsx   # Fullscreen image viewer
│       └── UploadModal.jsx # Drag-drop upload interface
├── .env                   # Cloudinary credentials (not committed)
├── vite.config.js         # Vite + API proxy config
└── package.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/images` | List images (cursor-based pagination) |
| `POST` | `/api/upload` | Upload an image |
| `DELETE` | `/api/images/:publicId` | Delete an image |
