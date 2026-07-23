require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // limit each IP to 5 login attempts per 15 minutes
    message: { success: false, message: 'Too many login attempts, please try again later.' }
});

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const syllabiDir = path.join(uploadsDir, 'syllabi');
const resumesDir = path.join(uploadsDir, 'resumes');
const logosDir = path.join(uploadsDir, 'logos');
const dataDir = path.join(__dirname, 'data');

[uploadsDir, syllabiDir, resumesDir, logosDir, dataDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Import routes
const syllabusRoutes = require('./routes/syllabus');
const contactRoutes = require('./routes/contact');
const careerRoutes = require('./routes/careers');
const adminRoutes = require('./routes/admin');
const logoRoutes = require('./routes/logo');

// API Routes
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/logo', logoRoutes);

// Serve uploaded files
app.use('/uploads/syllabi', express.static(syllabiDir));
app.use('/uploads/resumes', express.static(resumesDir));
app.use('/uploads/logos', express.static(logosDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

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
    console.log(`🔒 Security: Helmet + Rate Limiting enabled`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📂 Uploads directory: ${uploadsDir}`);
    console.log(`📂 Data directory: ${dataDir}\n`);
});

module.exports = app;
