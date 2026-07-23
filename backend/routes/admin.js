const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');

// Simple admin authentication (In production, use proper auth with JWT/sessions)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cyberelite2024';

// Middleware for simple admin auth
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');
        
        if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid authorization header'
        });
    }
};

// GET dashboard stats
router.get('/stats', requireAuth, (req, res) => {
    try {
        const stats = {
            contacts: 0,
            applications: 0,
            syllabi: 0,
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

// POST login (simple auth)
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            res.json({
                success: true,
                message: 'Login successful',
                token: Buffer.from(`${username}:${password}`).toString('base64')
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error during login',
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
            resumes: []
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
        
        if (!['syllabi', 'resumes'].includes(type)) {
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

// GET system info
router.get('/system', requireAuth, (req, res) => {
    try {
        const os = require('os');
        const packageJson = require('../../package.json');
        
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
