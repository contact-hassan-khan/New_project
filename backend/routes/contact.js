const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const contactsDir = path.join(dataDir, 'contacts.json');
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
        if (logs.length > 1000) logs.splice(1000);
        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

const { sendContactEmail, sendContactAutoReply } = require('../utils/email');

const readContacts = () => {
    if (!fs.existsSync(contactsDir)) return [];
    return JSON.parse(fs.readFileSync(contactsDir, 'utf8'));
};

const writeContacts = (contacts) => {
    const dir = path.dirname(contactsDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(contactsDir, JSON.stringify(contacts, null, 2));
};

router.post('/', async (req, res) => {
    try {
        const { name, email, phone, company, serviceType, message, inquiryType } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        const contacts = readContacts();
        const newContact = {
            id: `contact_${Date.now()}`,
            name, email, phone: phone || '', company: company || '',
            serviceType: serviceType || '', message: message || '',
            inquiryType: inquiryType || 'general', status: 'new',
            createdAt: new Date().toISOString()
        };

        contacts.push(newContact);
        writeContacts(contacts);

        logActivity('CONTACT_SUBMISSION', { username: email, role: 'visitor' }, {
            name, email, inquiryType, ip: req.ip
        });

        // Send emails asynchronously (don't wait for them)
        sendContactEmail({ name, email, phone, message, inquiryType }).catch(err => console.error('Email send failed:', err));
        sendContactAutoReply({ name, email }).catch(err => console.error('Auto-reply failed:', err));

        console.log(`📧 New contact inquiry from ${name} (${email})`);

        res.status(201).json({
            success: true,
            message: 'Thank you for your inquiry! We will get back to you soon.',
            data: newContact
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting contact form', error: error.message });
    }
});

router.get('/', (req, res) => {
    try {
        const contacts = readContacts();
        contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ success: true, count: contacts.length, data: contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching contacts', error: error.message });
    }
});

router.get('/:id', (req, res) => {
    try {
        const contacts = readContacts();
        const contact = contacts.find(c => c.id === req.params.id);
        if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
        res.json({ success: true, data: contact });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching contact', error: error.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const { status, notes } = req.body;
        const contacts = readContacts();
        const index = contacts.findIndex(c => c.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: 'Contact not found' });

        if (status) contacts[index].status = status;
        if (notes) contacts[index].notes = notes;
        contacts[index].updatedAt = new Date().toISOString();

        writeContacts(contacts);
        res.json({ success: true, message: 'Contact updated', data: contacts[index] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating contact', error: error.message });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const contacts = readContacts();
        const index = contacts.findIndex(c => c.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: 'Contact not found' });

        contacts.splice(index, 1);
        writeContacts(contacts);
        res.json({ success: true, message: 'Contact deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting contact', error: error.message });
    }
});

module.exports = router;
