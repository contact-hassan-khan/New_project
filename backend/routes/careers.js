const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const applicationsDir = path.join(dataDir, 'applications.json');
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

const { uploadResume } = require('../middleware/upload');

// Helper function to read applications data
const readApplications = () => {
    if (!fs.existsSync(applicationsDir)) {
        return [];
    }
    const data = fs.readFileSync(applicationsDir, 'utf8');
    return JSON.parse(data);
};

// Helper function to write applications data
const writeApplications = (applications) => {
    const dir = path.dirname(applicationsDir);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(applicationsDir, JSON.stringify(applications, null, 2));
};

// POST new job application
router.post('/', uploadResume.single('resume'), (req, res) => {
    try {
        const { name, email, phone, position, experience, skills, coverLetter } = req.body;

        if (!name || !email || !position) {
            return res.status(400).json({ success: false, message: 'Name, email, and position are required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Resume file is required' });
        }

        const applications = readApplications();
        const newApplication = {
            id: `application_${Date.now()}`,
            name, email, phone: phone || '', position,
            experience: experience || '',
            skills: skills ? skills.split(',').map(s => s.trim()) : [],
            coverLetter: coverLetter || '',
            resumeFileName: req.file.filename,
            resumeFilePath: `/uploads/resumes/${req.file.filename}`,
            resumeFileSize: req.file.size,
            status: 'pending',
            appliedAt: new Date().toISOString()
        };

        applications.push(newApplication);
        writeApplications(applications);

        logActivity('JOB_APPLICATION', { username: email, role: 'applicant' }, { name, email, position, ip: req.ip });
        console.log(`💼 New job application from ${name} for ${position}`);

        res.status(201).json({ success: true, message: 'Your application has been submitted successfully!', data: newApplication });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting application', error: error.message });
    }
});

// GET all applications
router.get('/', (req, res) => {
    try {
        const applications = readApplications();
        applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        res.json({ success: true, count: applications.length, data: applications });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching applications', error: error.message });
    }
});

// GET single application
router.get('/:id', (req, res) => {
    try {
        const applications = readApplications();
        const application = applications.find(a => a.id === req.params.id);
        if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
        res.json({ success: true, data: application });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching application', error: error.message });
    }
});

// PUT update application
router.put('/:id', (req, res) => {
    try {
        const { status, notes, rating } = req.body;
        const applications = readApplications();
        const index = applications.findIndex(a => a.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: 'Application not found' });

        if (status) applications[index].status = status;
        if (notes) applications[index].notes = notes;
        if (rating) applications[index].rating = rating;
        applications[index].updatedAt = new Date().toISOString();

        writeApplications(applications);
        res.json({ success: true, message: 'Application updated', data: applications[index] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating application', error: error.message });
    }
});

// DELETE application
router.delete('/:id', (req, res) => {
    try {
        const applications = readApplications();
        const index = applications.findIndex(a => a.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: 'Application not found' });

        if (applications[index].resumeFileName) {
            const filePath = path.join(__dirname, '..', 'uploads', 'resumes', applications[index].resumeFileName);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        applications.splice(index, 1);
        writeApplications(applications);
        res.json({ success: true, message: 'Application deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting application', error: error.message });
    }
});

module.exports = router;
