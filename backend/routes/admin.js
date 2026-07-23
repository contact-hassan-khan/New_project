const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const dataDir = path.join(__dirname, '..', 'data');
const logsPath = path.join(dataDir, 'activity_logs.json');

// JWT Secret (In production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'cyberelite-secret-key-2024-change-in-production';
const JWT_EXPIRY = '8h';

// Admin credentials with hashed passwords
const ADMIN_USERS = {
    admin: {
        username: 'admin',
        passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'cyberelite2024', 10),
        name: 'Admin User',
        email: 'admin@cyberelite.com',
        role: 'admin'
    },
    instructor: {
        username: 'instructor',
        passwordHash: bcrypt.hashSync('instructor2024', 10),
        name: 'Course Instructor',
        email: 'instructor@cyberelite.com',
        role: 'instructor'
    }
};

// Initialize activity logs
if (!fs.existsSync(logsPath)) {
    fs.writeFileSync(logsPath, JSON.stringify([]));
}

// Activity logging function
const logActivity = (action, user, details = {}) => {
    try {
        const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        logs.unshift({
            timestamp: new Date().toISOString(),
            action,
            user: user ? user.username : 'anonymous',
            role: user ? user.role : 'unknown',
            ip: details.ip || 'unknown',
            details
        });
        // Keep only last 1000 logs
        if (logs.length > 1000) logs.splice(1000);
        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

// Middleware for JWT authentication
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (!ADMIN_USERS[decoded.username]) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        req.user = ADMIN_USERS[decoded.username];
        req.user.username = decoded.username; // Attach username to request
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// POST login with secure password handling
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress;

        if (!username || !password) {
            logActivity('LOGIN_FAILED', null, { reason: 'Missing credentials', ip: clientIp });
            return res.status(400).json({
                success: false,
                message: 'Username and password required'
            });
        }

        const user = ADMIN_USERS[username];
        
        if (!user) {
            logActivity('LOGIN_FAILED', null, { reason: 'User not found', ip: clientIp });
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Compare hashed password
        const isValid = bcrypt.compareSync(password, user.passwordHash);
        
        if (!isValid) {
            logActivity('LOGIN_FAILED', { username }, { reason: 'Invalid password', ip: clientIp });
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
        
        logActivity('LOGIN_SUCCESS', user, { ip: clientIp });
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
});

// GET dashboard stats
router.get('/stats', requireAuth, (req, res) => {
    try {
        const stats = {
            contacts: 0,
            applications: 0,
            syllabi: 0,
            logos: 0,
            recentContacts: [],
            recentApplications: []
        };
        
        // Read contacts
        const contactsPath = path.join(dataDir, 'contacts.json');
        if (fs.existsSync(contactsPath)) {
            const contacts = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
            stats.contacts = contacts.length;
            stats.recentContacts = contacts.slice(0, 5);
        }
        
        // Read applications
        const applicationsPath = path.join(dataDir, 'applications.json');
        if (fs.existsSync(applicationsPath)) {
            const applications = JSON.parse(fs.readFileSync(applicationsPath, 'utf8'));
            stats.applications = applications.length;
            stats.recentApplications = applications.slice(0, 5);
        }
        
        // Read syllabi
        const syllabiPath = path.join(dataDir, 'syllabi.json');
        if (fs.existsSync(syllabiPath)) {
            const syllabi = JSON.parse(fs.readFileSync(syllabiPath, 'utf8'));
            stats.syllabi = syllabi.length;
        }
        
        // Read logos
        const logosPath = path.join(dataDir, 'logos.json');
        if (fs.existsSync(logosPath)) {
            const logos = JSON.parse(fs.readFileSync(logosPath, 'utf8'));
            stats.logos = logos.length;
        }
        
        logActivity('VIEW_STATS', req.user);
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching stats',
            error: error.message
        });
    }
});

// GET all files in uploads directory
router.get('/files', requireAuth, (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const files = {
            syllabi: [],
            resumes: [],
            logos: []
        };
        
        const syllabiDir = path.join(uploadsDir, 'syllabi');
        if (fs.existsSync(syllabiDir)) {
            files.syllabi = fs.readdirSync(syllabiDir).map(file => {
                const stats = fs.statSync(path.join(syllabiDir, file));
                return {
                    name: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    path: `/uploads/syllabi/${file}`
                };
            });
        }
        
        const resumesDir = path.join(uploadsDir, 'resumes');
        if (fs.existsSync(resumesDir)) {
            files.resumes = fs.readdirSync(resumesDir).map(file => {
                const stats = fs.statSync(path.join(resumesDir, file));
                return {
                    name: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    path: `/uploads/resumes/${file}`
                };
            });
        }
        
        const logosDir = path.join(uploadsDir, 'logos');
        if (fs.existsSync(logosDir)) {
            files.logos = fs.readdirSync(logosDir).map(file => {
                const stats = fs.statSync(path.join(logosDir, file));
                return {
                    name: file,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    path: `/uploads/logos/${file}`
                };
            });
        }
        
        logActivity('VIEW_FILES', req.user);
        
        res.json({
            success: true,
            data: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching files',
            error: error.message
        });
    }
});

// DELETE file
router.delete('/files/:type/:filename', requireAuth, (req, res) => {
    try {
        const { type, filename } = req.params;
        
        if (!['syllabi', 'resumes', 'logos'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file type'
            });
        }
        
        const filePath = path.join(__dirname, '..', 'uploads', type, filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
        
        fs.unlinkSync(filePath);
        
        logActivity('DELETE_FILE', req.user, { type, filename });
        
        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting file',
            error: error.message
        });
    }
});

// GET activity logs
router.get('/logs', requireAuth, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = fs.existsSync(logsPath) 
            ? JSON.parse(fs.readFileSync(logsPath, 'utf8'))
            : [];
        
        logActivity('VIEW_LOGS', req.user, { limit });
        
        res.json({
            success: true,
            data: logs.slice(0, limit)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching logs',
            error: error.message
        });
    }
});

// GET system info
router.get('/system', requireAuth, (req, res) => {
    try {
        const os = require('os');
        const packageJson = require('../../package.json');
        
        logActivity('VIEW_SYSTEM', req.user);
        
        res.json({
            success: true,
            data: {
                nodeVersion: process.version,
                platform: os.platform(),
                arch: os.arch(),
                totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
                freeMemory: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
                uptime: `${Math.round(os.uptime() / 3600)} hours`,
                appVersion: packageJson.version || '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching system info',
            error: error.message
        });
    }
});

module.exports = router;
