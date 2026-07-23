const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const logsPath = path.join(dataDir, 'activity_logs.json');

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

// Multer configuration for logos
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const logosDir = path.join(__dirname, '../uploads/logos');
        if (!fs.existsSync(logosDir)) {
            fs.mkdirSync(logosDir, { recursive: true });
        }
        cb(null, logosDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `logo_${Date.now()}_${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const logoUpload = multer({
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|svg|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (PNG, JPG, SVG, WEBP) are allowed'));
        }
    }
});

// Get current logo
router.get('/current', (req, res) => {
    try {
        const logoConfigFile = path.join(dataDir, 'logo_config.json');
        let config = { currentLogo: null, versions: [] };
        
        if (fs.existsSync(logoConfigFile)) {
            config = JSON.parse(fs.readFileSync(logoConfigFile, 'utf8'));
        }
        
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Upload new logo (Admin/Staff only)
router.post('/upload', logoUpload.single('logo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        
        const logoConfigFile = path.join(dataDir, 'logo_config.json');
        let config = { currentLogo: null, versions: [] };
        
        if (fs.existsSync(logoConfigFile)) {
            config = JSON.parse(fs.readFileSync(logoConfigFile, 'utf8'));
        }
        
        const newLogo = {
            id: `logo_${Date.now()}`,
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: `/uploads/logos/${req.file.filename}`,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.body.uploadedBy || 'admin'
        };
        
        // Add to versions
        config.versions.unshift(newLogo);
        
        // Keep only last 20 versions
        if (config.versions.length > 20) {
            config.versions = config.versions.slice(0, 20);
        }
        
        // Set as current
        config.currentLogo = newLogo;
        config.updatedAt = new Date().toISOString();
        
        fs.writeFileSync(logoConfigFile, JSON.stringify(config, null, 2));
        
        // Log the action
        logActivity('LOGO_UPLOAD', req.user, {
            filename: req.file.originalname,
            size: req.file.size,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: 'Logo uploaded successfully',
            data: newLogo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Set a specific logo version as current
router.put('/set-current/:id', (req, res) => {
    try {
        const logoConfigFile = path.join(dataDir, 'logo_config.json');
        let config = { currentLogo: null, versions: [] };
        
        if (fs.existsSync(logoConfigFile)) {
            config = JSON.parse(fs.readFileSync(logoConfigFile, 'utf8'));
        }
        
        const logoVersion = config.versions.find(v => v.id === req.params.id);
        
        if (!logoVersion) {
            return res.status(404).json({
                success: false,
                message: 'Logo version not found'
            });
        }
        
        config.currentLogo = logoVersion;
        config.updatedAt = new Date().toISOString();
        
        fs.writeFileSync(logoConfigFile, JSON.stringify(config, null, 2));
        
        // Log the action
        logActivity('LOGO_VERSION_CHANGE', req.user, {
            logoId: req.params.id,
            filename: logoVersion.filename,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: 'Logo version updated successfully',
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get all logo versions
router.get('/versions', (req, res) => {
    try {
        const logoConfigFile = path.join(dataDir, 'logo_config.json');
        let config = { currentLogo: null, versions: [] };
        
        if (fs.existsSync(logoConfigFile)) {
            config = JSON.parse(fs.readFileSync(logoConfigFile, 'utf8'));
        }
        
        res.json({
            success: true,
            data: config.versions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete a logo version
router.delete('/:id', (req, res) => {
    try {
        const logoConfigFile = path.join(dataDir, 'logo_config.json');
        let config = { currentLogo: null, versions: [] };
        
        if (fs.existsSync(logoConfigFile)) {
            config = JSON.parse(fs.readFileSync(logoConfigFile, 'utf8'));
        }
        
        const logoIndex = config.versions.findIndex(v => v.id === req.params.id);
        
        if (logoIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Logo version not found'
            });
        }
        
        const deletedLogo = config.versions[logoIndex];
        
        // Remove from versions
        config.versions.splice(logoIndex, 1);
        
        // If deleted logo was current, set first available as current
        if (config.currentLogo && config.currentLogo.id === req.params.id) {
            config.currentLogo = config.versions.length > 0 ? config.versions[0] : null;
        }
        
        config.updatedAt = new Date().toISOString();
        
        fs.writeFileSync(logoConfigFile, JSON.stringify(config, null, 2));
        
        // Optionally delete the file
        // fs.unlink(path.join(__dirname, '../uploads/logos/', deletedLogo.filename), (err) => {});
        
        // Log the action
        logActivity('LOGO_DELETE', req.user, {
            logoId: req.params.id,
            filename: deletedLogo.filename,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: 'Logo version deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
