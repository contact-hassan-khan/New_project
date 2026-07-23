require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const syllabiDir = path.join(uploadsDir, 'syllabi');
const resumesDir = path.join(uploadsDir, 'resumes');
const dataDir = path.join(__dirname, 'data');

[uploadsDir, syllabiDir, resumesDir, dataDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Import routes
const syllabusRoutes = require('./routes/syllabus');
const contactRoutes = require('./routes/contact');
const careerRoutes = require('./routes/careers');
const adminRoutes = require('./routes/admin');

// API Routes
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/admin', adminRoutes);

// Serve uploaded syllabi files
app.use('/uploads/syllabi', express.static(syllabiDir));

// Serve uploaded resumes (admin only in production)
app.use('/uploads/resumes', express.static(resumesDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve index.html for all other routes (SPA fallback)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Catch-all route must be last - use named parameter
app.get('/*path', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Cyber Elite Server running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📂 Uploads directory: ${uploadsDir}`);
    console.log(`📂 Data directory: ${dataDir}\n`);
});

module.exports = app;
