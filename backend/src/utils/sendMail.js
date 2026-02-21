// utils/sendMail.js
const nodemailer = require("nodemailer");

const sendMail = async (toEmail, subject, htmlContent, attachments = []) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: toEmail,
            subject,
            html: htmlContent,
            attachments: Array.isArray(attachments) && attachments.length ? attachments : undefined
        };

        await transporter.sendMail(mailOptions);

        return { success: true };
    } catch (error) {
        console.error("Error sending email:", error);
        return { success: false, error };
    }
};

module.exports = sendMail;
