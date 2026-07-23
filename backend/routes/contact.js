const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const contactsDir = path.join(__dirname, '..', 'data', 'contacts.json');
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

// Helper function to read contacts data
const readContacts = () => {
    if (!fs.existsSync(contactsDir)) {
        return [];
    }
    const data = fs.readFileSync(contactsDir, 'utf8');
    return JSON.parse(data);
};

// Helper function to write contacts data
const writeContacts = (contacts) => {
    const dir = path.dirname(contactsDir);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(contactsDir, JSON.stringify(contacts, null, 2));
};

// POST new contact inquiry
router.post('/', (req, res) => {
    try {
        const { 
            name, 
            email, 
            phone, 
            company, 
            serviceType, 
            message,
            inquiryType 
        } = req.body;
        
        // Validation
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
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
        
        const contacts = readContacts();
        const newContact = {
            id: uuidv4(),
            name,
            email,
            phone: phone || '',
            company: company || '',
            serviceType: serviceType || '',
            message: message || '',
            inquiryType: inquiryType || 'general',
            status: 'new',
            createdAt: new Date().toISOString()
        };
        
        contacts.push(newContact);
        writeContacts(contacts);
        
        // Log the action
        logAction('CONTACT_SUBMISSION', {
            name,
            email,
            inquiryType
        }, 'visitor');
        
        // In production, you would send an email notification here
        console.log(`📧 New contact inquiry from ${name} (${email})`);
        
        res.status(201).json({
            success: true,
            message: 'Thank you for your inquiry! We will get back to you soon.',
            data: newContact
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting contact form',
            error: error.message
        });
    }
});

// GET all contacts (Admin only)
router.get('/', (req, res) => {
    try {
        const contacts = readContacts();
        
        // Sort by date, newest first
        contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({
            success: true,
            count: contacts.length,
            data: contacts
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching contacts',
            error: error.message
        });
    }
});

// GET single contact by ID
router.get('/:id', (req, res) => {
    try {
        const contacts = readContacts();
        const contact = contacts.find(c => c.id === req.params.id);
        
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }
        
        res.json({
            success: true,
            data: contact
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching contact',
            error: error.message
        });
    }
});

// PUT update contact status
router.put('/:id', (req, res) => {
    try {
        const { status, notes } = req.body;
        const contacts = readContacts();
        const index = contacts.findIndex(c => c.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }
        
        if (status) contacts[index].status = status;
        if (notes) contacts[index].notes = notes;
        contacts[index].updatedAt = new Date().toISOString();
        
        writeContacts(contacts);
        
        res.json({
            success: true,
            message: 'Contact updated successfully',
            data: contacts[index]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating contact',
            error: error.message
        });
    }
});

// DELETE contact
router.delete('/:id', (req, res) => {
    try {
        const contacts = readContacts();
        const index = contacts.findIndex(c => c.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }
        
        contacts.splice(index, 1);
        writeContacts(contacts);
        
        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting contact',
            error: error.message
        });
    }
});

module.exports = router;
