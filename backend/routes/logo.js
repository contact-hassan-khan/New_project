const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Logging middleware
const logAction = (action, details, user) => {
    const logsFile = path.join(__dirname, '../data/logs.json');
    let logs = [];
    if (fs.existsSync(logsFile)) {
        logs = JSON.parse(fs.readFileSync(logsFile, 'utf8'));
    }
    
    logs.unshift({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        action,
        details,
        user: user || 'system',
        ip: 'localhost'
    });
    
    // Keep only last 1000 logs
    if (logs.length > 1000) logs = logs.slice(0, 1000);
    
    fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2));
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
        const uniqueName = `logo_${Date.now()}_${uuidv4()}${path.extname(file.originalname)}`;
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
        const logoConfigFile = path.join(__dirname, '../data/logo_config.json');
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
        
        const logoConfigFile = path.join(__dirname, '../data/logo_config.json');
        let config = { currentLogo: null, versions: [] };
        
        if (fs.existsSync(logoConfigFile)) {
            config = JSON.parse(fs.readFileSync(logoConfigFile, 'utf8'));
        }
        
        const newLogo = {
            id: uuidv4(),
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
        logAction('LOGO_UPLOAD', {
            filename: req.file.originalname,
            size: req.file.size
        }, req.body.uploadedBy);
        
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
        const logoConfigFile = path.join(__dirname, '../data/logo_config.json');
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
        logAction('LOGO_VERSION_CHANGE', {
            logoId: req.params.id,
            filename: logoVersion.filename
        }, req.body.uploadedBy);
        
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
        const logoConfigFile = path.join(__dirname, '../data/logo_config.json');
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
        const logoConfigFile = path.join(__dirname, '../data/logo_config.json');
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
        logAction('LOGO_DELETE', {
            logoId: req.params.id,
            filename: deletedLogo.filename
        }, req.body.uploadedBy);
        
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
