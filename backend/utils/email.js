const nodemailer = require('nodemailer');

// Create transporter based on environment
const createTransporter = () => {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    
    // Default to console transport for development
    return {
        sendMail: async (mailOptions) => {
            console.log('📧 Email would be sent (development mode):');
            console.log(`   To: ${mailOptions.to}`);
            console.log(`   Subject: ${mailOptions.subject}`);
            console.log(`   Body: ${mailOptions.html || mailOptions.text}`);
            return { messageId: 'dev-mode-' + Date.now() };
        }
    };
};

const transporter = createTransporter();

// Send contact form notification
const sendContactEmail = async ({ name, email, phone, message, inquiryType }) => {
    const mailOptions = {
        from: `"Cyber Elite Contact Form" <${process.env.FROM_EMAIL || 'noreply@cyberelite.com'}>`,
        to: process.env.CONTACT_EMAIL || 'contact@cyberelite.com',
        subject: `New Contact Inquiry: ${inquiryType || 'General'}`,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Inquiry Type:</strong> ${inquiryType || 'General'}</p>
            <p><strong>Message:</strong></p>
            <blockquote>${message || 'No message provided'}</blockquote>
            <hr>
            <p><small>Submitted via Cyber Elite website contact form</small></p>
        `
    };
    
    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Contact email sent: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Error sending contact email:', error.message);
        return { success: false, error: error.message };
    }
};

// Send job application notification
const sendApplicationEmail = async ({ name, email, position, phone }) => {
    const mailOptions = {
        from: `"Cyber Elite Careers" <${process.env.FROM_EMAIL || 'noreply@cyberelite.com'}>`,
        to: process.env.HR_EMAIL || 'careers@cyberelite.com',
        cc: email, // Send confirmation to applicant
        subject: `New Job Application: ${position} - ${name}`,
        html: `
            <h2>New Job Application Received</h2>
            <p><strong>Position:</strong> ${position}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <hr>
            <p><small>Application submitted via Cyber Elite careers page</small></p>
        `
    };
    
    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Application email sent: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Error sending application email:', error.message);
        return { success: false, error: error.message };
    }
};

// Send auto-reply to contact form submitter
const sendContactAutoReply = async ({ name, email }) => {
    const mailOptions = {
        from: `"Cyber Elite" <${process.env.FROM_EMAIL || 'noreply@cyberelite.com'}>`,
        to: email,
        subject: 'Thank you for contacting Cyber Elite',
        html: `
            <h2>Thank you for reaching out!</h2>
            <p>Dear ${name},</p>
            <p>Thank you for contacting Cyber Elite. We have received your inquiry and will get back to you within 24-48 hours.</p>
            <p>If this is urgent, please call us at <strong>+91-9890467034</strong>.</p>
            <br>
            <p>Best regards,<br>Cyber Elite Team</p>
            <hr>
            <p><small>Cyber Elite - Excellence in Technology & Education</small></p>
        `
    };
    
    try {
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Auto-reply sent to ${email}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('❌ Error sending auto-reply:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendContactEmail,
    sendApplicationEmail,
    sendContactAutoReply,
    transporter
};
