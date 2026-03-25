const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes placeholders
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to SevaSetu API' });
});

// Import and use routes
const authRoutes = require('./routes/auth.routes');
const locationRoutes = require('./routes/location.routes');
const taskRoutes = require('./routes/task.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const adminRoutes = require('./routes/admin.routes');
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
