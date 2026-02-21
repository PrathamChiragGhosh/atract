const { sendAlertEmail } = require('../services/emailService');

/**
 * Handle contact form submission
 * Sends email to help/support email address
 */
const submitContactForm = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
            });
        }

        // Create email content
        const emailSubject = `Contact Form: ${subject}`;
        const emailText = `
Contact Form Submission from Atract.in

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This email was sent from the Atract.in contact form.
        `.trim();

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Form Submission</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">📧 New Contact Form Submission</h1>
    </div>
    
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 0 0 10px;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p style="margin: 0 0 10px;"><strong>Subject:</strong> ${subject}</p>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333;">Message:</h3>
            <p style="white-space: pre-wrap; color: #555;">${message}</p>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">This email was sent from the Atract.in contact form.</p>
            <p style="margin: 5px 0 0;">You can reply directly to this email to respond to ${name}.</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        // Send email using the email service
        // Send to HELP_EMAIL from .env (line 65-66)
        const HELP_EMAIL = process.env.HELP_EMAIL;
        const toEmails = HELP_EMAIL ? [HELP_EMAIL] : null;

        await sendAlertEmail({
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
            toEmails: toEmails,
        });

        res.status(200).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon.',
        });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.',
        });
    }
};

module.exports = {
    submitContactForm,
};

