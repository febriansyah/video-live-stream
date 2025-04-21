# Video Live Streaming Application

A full-stack video streaming application with a React TypeScript frontend and Node.js backend.

## Features

### Frontend
- Modern React application built with TypeScript and Vite
- Video player with custom controls:
  - Play/Pause
  - Seek bar
  - Mute/Unmute
  - Fullscreen toggle
- Canvas-based video rendering
- Overlay UI with watermark and timestamp
- Loading and error states with retry functionality

### Backend
- Node.js server with Express
- Video streaming with support for byte-range requests
- Health check endpoint

## Project Structure

```
videoLiveStream/
├── frontend/           # React TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── VideoPlayer/  # Video player components
│   │   ├── App.tsx     # Main application component
│   │   └── main.tsx    # Entry point
│   └── ...
├── backend/            # Node.js backend
│   ├── src/
│   │   └── index.ts    # Server entry point
│   ├── assets/         # Video assets
│   └── ...
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies for both frontend and backend:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

1. Start the backend server:

```bash
cd backend
npm run dev
```

2. In a separate terminal, start the frontend development server:

```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## How It Works

1. The backend serves video chunks via the `/video` endpoint with support for byte-range requests
2. The frontend fetches the video stream from the backend
3. The video is rendered onto a canvas element using the HTML5 Canvas API
4. Custom controls and overlay UI are implemented for a better user experience

## Technologies Used

- **Frontend**: React, TypeScript, Vite, HTML5 Canvas
- **Backend**: Node.js, Express, TypeScript
