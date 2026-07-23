const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { uploadResume } = require('../middleware/upload');

const applicationsDir = path.join(__dirname, '..', 'data', 'applications.json');
const logsFile = path.join(__dirname, '../data/logs.json');

// Logging middleware
const logAction = (action, details, user) => {
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
        const { 
            name, 
            email, 
            phone, 
            position,
            experience,
            skills,
            coverLetter 
        } = req.body;
        
        // Validation
        if (!name || !email || !position) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and position are required'
            });
        }
        
        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Resume file is required'
            });
        }
        
        const applications = readApplications();
        const newApplication = {
            id: uuidv4(),
            name,
            email,
            phone: phone || '',
            position,
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
        
        // Log the action
        logAction('JOB_APPLICATION', {
            name,
            email,
            position
        }, 'applicant');
        
        console.log(`💼 New job application from ${name} for ${position}`);
        
        res.status(201).json({
            success: true,
            message: 'Your application has been submitted successfully! We will review it and get back to you.',
            data: newApplication
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting application',
            error: error.message
        });
    }
});

// GET all applications (Admin only)
router.get('/', (req, res) => {
    try {
        const applications = readApplications();
        
        // Sort by date, newest first
        applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        
        res.json({
            success: true,
            count: applications.length,
            data: applications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching applications',
            error: error.message
        });
    }
});

// GET single application by ID
router.get('/:id', (req, res) => {
    try {
        const applications = readApplications();
        const application = applications.find(a => a.id === req.params.id);
        
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        res.json({
            success: true,
            data: application
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching application',
            error: error.message
        });
    }
});

// PUT update application status
router.put('/:id', (req, res) => {
    try {
        const { status, notes, rating } = req.body;
        const applications = readApplications();
        const index = applications.findIndex(a => a.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        if (status) applications[index].status = status;
        if (notes) applications[index].notes = notes;
        if (rating) applications[index].rating = rating;
        applications[index].updatedAt = new Date().toISOString();
        
        writeApplications(applications);
        
        res.json({
            success: true,
            message: 'Application updated successfully',
            data: applications[index]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating application',
            error: error.message
        });
    }
});

// DELETE application
router.delete('/:id', (req, res) => {
    try {
        const applications = readApplications();
        const index = applications.findIndex(a => a.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        
        // Delete resume file
        if (applications[index].resumeFileName) {
            const filePath = path.join(__dirname, '..', 'uploads', 'resumes', applications[index].resumeFileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        applications.splice(index, 1);
        writeApplications(applications);
        
        res.json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting application',
            error: error.message
        });
    }
});

module.exports = router;
