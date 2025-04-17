const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Extend the Socket type to include userId
/**
 * @typedef {import('socket.io').Socket & { userId?: string }} AuthenticatedSocket
 */
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// WebSocket authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
            /** @type {AuthenticatedSocket} */ (socket).userId = decoded.userId;
        } else {
            return next(new Error('Authentication error'));
        }
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join project room
    socket.on('join-project', (data) => {
        const { projectName } = data;
        socket.join(projectName);
        console.log(`Client ${socket.id} joined project: ${projectName}`);
    });

    // Leave project room
    socket.on('leave-project', (data) => {
        const { projectName } = data;
        socket.leave(projectName);
        console.log(`Client ${socket.id} left project: ${projectName}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
