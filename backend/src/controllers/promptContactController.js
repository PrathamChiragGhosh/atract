const { sendAlertEmailWithFrom } = require('../services/emailService');

/**
 * Handle prompt engineering contact form submission
 * Sends email from rajiv.ghoshrajiv@atract.in to HELP_EMAIL
 */
const submitPromptContactForm = async (req, res) => {
    try {
        const { name, email, whatsapp, company, requirement } = req.body;

        // Validate required fields
        if (!name || !email || !requirement) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and requirement are required',
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

        // Get HELP_EMAIL from .env (lines 70-71 as mentioned)
        const HELP_EMAIL = process.env.HELP_EMAIL;

        if (!HELP_EMAIL) {
            console.error('HELP_EMAIL not configured in .env');
            return res.status(500).json({
                success: false,
                message: 'Email configuration error. Please contact support.',
            });
        }

        // Create email content
        const emailSubject = `Prompt Engineering Contact: ${name}`;
        const emailText = `
Prompt Engineering Contact Form Submission

Name: ${name}
Email: ${email}
WhatsApp: ${whatsapp || 'Not provided'}
Company: ${company || 'Not provided'}

Requirement/Message:
${requirement}

---
This email was sent from the Prompt Engineering contact form.
        `.trim();

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prompt Engineering Contact Form Submission</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">🤖 Prompt Engineering Contact Form</h1>
    </div>
    
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #2563eb; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Contact Information</h2>
            <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></p>
            ${whatsapp ? `<p style="margin: 10px 0;"><strong>WhatsApp:</strong> <a href="https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}" style="color: #25d366; text-decoration: none;">${whatsapp}</a></p>` : ''}
            ${company ? `<p style="margin: 10px 0;"><strong>Company:</strong> ${company}</p>` : ''}
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">Requirement / Message:</h3>
            <p style="white-space: pre-wrap; color: #555; background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #2563eb;">${requirement}</p>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">This email was sent from the Prompt Engineering contact form.</p>
            <p style="margin: 5px 0 0;">You can reply directly to this email to respond to ${name}.</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        // Send email using the email service
        // FROM: rajiv.ghoshrajiv@atract.in
        // TO: HELP_EMAIL from .env
        await sendAlertEmailWithFrom({
            fromEmail: 'rajiv.ghoshrajiv@atract.in',
            toEmails: [HELP_EMAIL],
            subject: emailSubject,
            text: emailText,
            html: emailHtml,
        });

        res.status(200).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon.',
        });
    } catch (error) {
        console.error('Error submitting prompt contact form:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.',
        });
    }
};

module.exports = {
    submitPromptContactForm,
};
