const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const syllabiDir = path.join(dataDir, 'syllabi.json');
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

const { uploadSyllabus } = require('../middleware/upload');

// Helper function to read syllabi data
const readSyllabi = () => {
    if (!fs.existsSync(syllabiDir)) {
        return [];
    }
    const data = fs.readFileSync(syllabiDir, 'utf8');
    return JSON.parse(data);
};

// Helper function to write syllabi data
const writeSyllabi = (syllabi) => {
    const dir = path.dirname(syllabiDir);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(syllabiDir, JSON.stringify(syllabi, null, 2));
};

// GET all syllabi
router.get('/', (req, res) => {
    try {
        const syllabi = readSyllabi();
        res.json({
            success: true,
            count: syllabi.length,
            data: syllabi
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching syllabi',
            error: error.message
        });
    }
});

// GET single syllabus by ID
router.get('/:id', (req, res) => {
    try {
        const syllabi = readSyllabi();
        const syllabus = syllabi.find(s => s.id === req.params.id);
        
        if (!syllabus) {
            return res.status(404).json({
                success: false,
                message: 'Syllabus not found'
            });
        }
        
        res.json({
            success: true,
            data: syllabus
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching syllabus',
            error: error.message
        });
    }
});

// POST new syllabus (Admin/Instructor only - with file upload)
router.post('/', uploadSyllabus.single('file'), (req, res) => {
    try {
        const { title, courseId, description, category, googleDocsLink, uploadedBy } = req.body;
        
        if (!title || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Title and courseId are required'
            });
        }
        
        const syllabi = readSyllabi();
        const newSyllabus = {
            id: `syllabus_${Date.now()}`,
            title,
            courseId,
            description: description || '',
            category: category || 'general',
            googleDocsLink: googleDocsLink || null,
            fileName: req.file ? req.file.filename : null,
            filePath: req.file ? `/uploads/syllabi/${req.file.filename}` : null,
            fileSize: req.file ? req.file.size : null,
            uploadedAt: new Date().toISOString(),
            uploadedBy: uploadedBy || 'admin',
            downloadCount: 0
        };
        
        syllabi.push(newSyllabus);
        writeSyllabi(syllabi);
        
        // Log the action
        logActivity('SYLLABUS_UPLOAD', req.user, {
            title,
            courseId,
            fileName: req.file?.originalname,
            ip: req.ip
        });
        
        res.status(201).json({
            success: true,
            message: 'Syllabus uploaded successfully',
            data: newSyllabus
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error uploading syllabus',
            error: error.message
        });
    }
});

// PUT update syllabus (Admin/Instructor only)
router.put('/:id', uploadSyllabus.single('file'), (req, res) => {
    try {
        const { title, description, category, googleDocsLink, uploadedBy } = req.body;
        const syllabi = readSyllabi();
        const index = syllabi.findIndex(s => s.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Syllabus not found'
            });
        }
        
        if (title) syllabi[index].title = title;
        if (description) syllabi[index].description = description;
        if (category) syllabi[index].category = category;
        if (googleDocsLink !== undefined) syllabi[index].googleDocsLink = googleDocsLink;
        
        if (req.file) {
            // Delete old file if exists
            if (syllabi[index].fileName) {
                const oldFilePath = path.join(__dirname, '..', 'uploads', 'syllabi', syllabi[index].fileName);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
            syllabi[index].fileName = req.file.filename;
            syllabi[index].filePath = `/uploads/syllabi/${req.file.filename}`;
            syllabi[index].fileSize = req.file.size;
        }
        
        syllabi[index].updatedAt = new Date().toISOString();
        syllabi[index].updatedBy = uploadedBy || 'admin';
        writeSyllabi(syllabi);
        
        // Log the action
        logActivity('SYLLABUS_UPDATE', req.user, {
            id: req.params.id,
            title: syllabi[index].title,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: 'Syllabus updated successfully',
            data: syllabi[index]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating syllabus',
            error: error.message
        });
    }
});

// DELETE syllabus (Admin only)
router.delete('/:id', (req, res) => {
    try {
        const syllabi = readSyllabi();
        const index = syllabi.findIndex(s => s.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Syllabus not found'
            });
        }
        
        const deletedSyllabus = syllabi[index];
        
        // Delete file if exists
        if (syllabi[index].fileName) {
            const filePath = path.join(__dirname, '..', 'uploads', 'syllabi', syllabi[index].fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        syllabi.splice(index, 1);
        writeSyllabi(syllabi);
        
        // Log the action
        logActivity('SYLLABUS_DELETE', req.user, {
            id: req.params.id,
            title: deletedSyllabus.title,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: 'Syllabus deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting syllabus',
            error: error.message
        });
    }
});

// Track syllabus download
router.post('/:id/download', (req, res) => {
    try {
        const { userInfo } = req.body; // name, email, phone, careerStatus
        const syllabi = readSyllabi();
        const index = syllabi.findIndex(s => s.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Syllabus not found'
            });
        }
        
        // Increment download count
        syllabi[index].downloadCount = (syllabi[index].downloadCount || 0) + 1;
        syllabi[index].lastDownloadedAt = new Date().toISOString();
        
        // Store downloader info (optional analytics)
        if (!syllabi[index].downloads) {
            syllabi[index].downloads = [];
        }
        syllabi[index].downloads.push({
            ...userInfo,
            downloadedAt: new Date().toISOString()
        });
        
        // Keep only last 100 downloads
        if (syllabi[index].downloads.length > 100) {
            syllabi[index].downloads = syllabi[index].downloads.slice(-100);
        }
        
        writeSyllabi(syllabi);
        
        // Log the action
        logActivity('SYLLABUS_DOWNLOAD', { username: userInfo?.email || 'student', role: 'student' }, {
            id: req.params.id,
            title: syllabi[index].title,
            user: userInfo?.email,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: 'Download tracked',
            data: {
                filePath: syllabi[index].filePath,
                googleDocsLink: syllabi[index].googleDocsLink,
                fileName: syllabi[index].fileName
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error tracking download',
            error: error.message
        });
    }
});

module.exports = router;
