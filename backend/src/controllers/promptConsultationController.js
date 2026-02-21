const { sendAlertEmailWithFrom } = require('../services/emailService');

/**
 * Handle prompt engineering consultation booking
 * Sends email from rajiv.ghoshrajiv@atract.in to HELP_EMAIL
 */
const bookConsultation = async (req, res) => {
    try {
        const { 
            name, 
            email, 
            whatsapp, 
            company, 
            consultationType, 
            companySize, 
            preferredDate, 
            preferredTime, 
            timezone, 
            projectDetails 
        } = req.body;

        // Validate required fields
        if (!name || !email || !consultationType || !preferredDate || !preferredTime || !projectDetails) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, consultation type, preferred date, preferred time, and project details are required',
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

        // Consultation type labels
        const consultationTypeLabels = {
            'ai-workflow-design': 'AI Workflow & Prompt Design',
            'project-ownership': 'AI Project Ownership',
            'ai-advisory': 'AI Advisory Retainer',
            'general-inquiry': 'General Inquiry'
        };

        const consultationTypeLabel = consultationTypeLabels[consultationType] || consultationType;

        // Format date and time for display
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        };

        // Create email content
        const emailSubject = `New Consultation Request: ${name} - ${consultationTypeLabel}`;
        const emailText = `
New Consultation Request from Prompt Engineering Website

Consultant Information:
Name: ${name}
Email: ${email}
WhatsApp: ${whatsapp || 'Not provided'}
Company: ${company || 'Not provided'}

Consultation Details:
Type: ${consultationTypeLabel}
Company Size: ${companySize || 'Not specified'}
Preferred Date: ${formatDate(preferredDate)}
Preferred Time: ${preferredTime}
Timezone: ${timezone || 'Not specified'}

Project Details:
${projectDetails}

---
This consultation request was submitted from the Prompt Engineering website.
Please respond within 24-48 hours to confirm the meeting.
        `.trim();

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Consultation Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 35px 30px; text-align: center; border-radius: 10px 10px 0 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📅 New Consultation Request</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">Prompt Engineering Website</p>
    </div>
    
    <div style="background: white; padding: 35px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
        
        <!-- Contact Information Card -->
        <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #2563eb;">
            <h2 style="margin-top: 0; color: #2563eb; font-size: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 12px; margin-bottom: 20px;">
                👤 Contact Information
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #374151; width: 140px;">Name:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #374151;">Email:</td>
                    <td style="padding: 8px 0;">
                        <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
                    </td>
                </tr>
                ${whatsapp ? `
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #374151;">WhatsApp:</td>
                    <td style="padding: 8px 0;">
                        <a href="https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}" style="color: #25d366; text-decoration: none;">${whatsapp}</a>
                    </td>
                </tr>
                ` : ''}
                ${company ? `
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #374151;">Company:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${company}</td>
                </tr>
                ` : ''}
            </table>
        </div>

        <!-- Consultation Details Card -->
        <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #0ea5e9;">
            <h2 style="margin-top: 0; color: #0ea5e9; font-size: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 12px; margin-bottom: 20px;">
                📋 Consultation Details
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #374151; width: 140px;">Type:</td>
                    <td style="padding: 8px 0;">
                        <span style="background: #0ea5e9; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 500;">${consultationTypeLabel}</span>
                    </td>
                </tr>
                ${companySize ? `
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #374151;">Company Size:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${companySize}</td>
                </tr>
                ` : ''}
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #374151;">Preferred Date:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${formatDate(preferredDate)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #374151;">Preferred Time:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 500;">${preferredTime}</td>
                </tr>
                ${timezone ? `
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #374151;">Timezone:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${timezone}</td>
                </tr>
                ` : ''}
            </table>
        </div>

        <!-- Project Details Card -->
        <div style="background: #fef3c7; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
            <h2 style="margin-top: 0; color: #f59e0b; font-size: 20px; border-bottom: 2px solid #e0e0e0; padding-bottom: 12px; margin-bottom: 20px;">
                💡 Project Details
            </h2>
            <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #e0e0e0;">
                <p style="white-space: pre-wrap; color: #1f2937; margin: 0; line-height: 1.8;">${projectDetails}</p>
            </div>
        </div>

        <!-- Action Card -->
        <div style="background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a; text-align: center;">
            <p style="margin: 0; color: #166534; font-weight: 500;">
                ⏰ <strong>Action Required:</strong> Please respond to ${name} within 24-48 hours to confirm the consultation meeting time.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 25px; border-top: 2px solid #e0e0e0; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0 0 8px;">This consultation request was submitted from the Prompt Engineering website.</p>
            <p style="margin: 0;">You can reply directly to this email to respond to ${name} at <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>
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
            message: 'Your consultation request has been received successfully. We will get back to you within 24-48 hours to confirm the meeting time.',
        });
    } catch (error) {
        console.error('Error booking consultation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to book consultation. Please try again later.',
        });
    }
};

module.exports = {
    bookConsultation,
};
