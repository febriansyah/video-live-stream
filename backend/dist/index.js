"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const webrtc_1 = require("./webrtc");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, `../${envFile}`) });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Create HTTP server
const server = http_1.default.createServer(app);
// Parse allowed origins from env
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
// Enable CORS for all routes
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Range'],
    exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges'],
    credentials: true
}));
// Middleware
app.use(express_1.default.json());
// Video streaming route
app.get('/video', (req, res) => {
    const videoPath = path_1.default.join(__dirname, '../assets/sample.mp4');
    const stat = fs_1.default.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
        // Parse Range
        // Example: "bytes=32324-"
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs_1.default.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    }
    else {
        // No range header, send entire file
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs_1.default.createReadStream(videoPath).pipe(res);
    }
});
// Simulate multiple video streams by serving the same video with different endpoints
app.get('/video/:id', (req, res) => {
    const videoPath = path_1.default.join(__dirname, '../assets/sample.mp4');
    const stat = fs_1.default.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
        // Parse Range
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs_1.default.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    }
    else {
        // No range header, send entire file
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs_1.default.createReadStream(videoPath).pipe(res);
    }
});
// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Get available streams
app.get('/streams', (req, res) => {
    // In a real app, this would fetch from a database or other source
    const streams = [
        { id: 1, name: 'Camera 1', url: '/video/1' },
        { id: 2, name: 'Camera 2', url: '/video/2' },
        { id: 3, name: 'Camera 3', url: '/video/3' },
        { id: 4, name: 'Camera 4', url: '/video/4' }
    ];
    res.status(200).json(streams);
});
// Setup WebRTC
(0, webrtc_1.setupWebRTC)(server);
// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
