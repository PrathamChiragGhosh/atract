const nodemailer = require('nodemailer');

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
  ALERT_EMAIL_TO,
  // Also support utils/sendMail.js env variables for compatibility
  SMTP_HOST,
  SMTP_PORT,
  EMAIL,
  PASSWORD,
} = process.env;

// Default alert recipient if env not provided
const DEFAULT_ALERT_TO = 'rajaalahari497@gmail.com';

let transporter = null;

// Use SMTP_HOST, SMTP_PORT, EMAIL, PASSWORD configuration (from utils/sendMail.js)
if (SMTP_HOST && SMTP_PORT && EMAIL && PASSWORD) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: true, // Use secure connection (same as utils/sendMail.js)
      auth: {
        user: EMAIL,
        pass: PASSWORD,
      },
    });
    console.log('Email transporter initialized with SMTP_HOST configuration');
  } catch (error) {
    console.log('Email transporter initialization skipped:', error.message);
  }
} else if (EMAIL_HOST && EMAIL_PORT && EMAIL_USER && EMAIL_PASS) {
  // Fallback to EMAIL_HOST configuration
  try {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT),
      secure: Number(EMAIL_PORT) === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
    console.log('Email transporter initialized with EMAIL_HOST configuration');
  } catch (error) {
    console.log('Email transporter initialization skipped:', error.message);
  }
}

// Get allowed emails for blog publisher from env
const getBlogPublisherEmails = () => {
  const emailsEnv = process.env.BLOG_PUBLISHER_EMAILS;
  if (!emailsEnv) {
    return [];
  }
  return emailsEnv.split(',').map(email => email.trim()).filter(email => email.length > 0);
};

const sendAlertEmail = async ({ subject, text, html, toEmails = null }) => {
  // For blog publisher, use allowed emails from env
  let to;
  if (toEmails && Array.isArray(toEmails) && toEmails.length > 0) {
    // Use provided emails if they're in the allowed list
    const allowedEmails = getBlogPublisherEmails();
    if (allowedEmails.length > 0) {
      // Filter to only use allowed emails
      to = toEmails.filter(email => allowedEmails.includes(email)).join(', ');
      if (!to) {
        // If none match, use all allowed emails
        to = allowedEmails.join(', ');
      }
    } else {
      to = toEmails.join(', ');
    }
  } else {
    // Default behavior - use ALERT_EMAIL_TO or default
    const allowedEmails = getBlogPublisherEmails();
    if (allowedEmails.length > 0) {
      to = allowedEmails.join(', ');
    } else {
      to = ALERT_EMAIL_TO || DEFAULT_ALERT_TO;
    }
  }

  if (!transporter) {
    console.log(
      'Email transporter not configured. Skipping alert email. Subject:',
      subject
    );
    return;
  }

  try {
    // Use EMAIL from env (same as utils/sendMail.js)
    const fromEmail = EMAIL || EMAIL_FROM || EMAIL_USER;
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html,
    });
    console.log('Alert email sent to', to);
  } catch (error) {
    console.error('Failed to send alert email:', error.message);
    console.error('Email error details:', error);
  }
};

/**
 * Send alert email with custom "from" address
 * @param {Object} options - Email options
 * @param {string} options.fromEmail - Custom "from" email address
 * @param {string[]} options.toEmails - Recipient email addresses
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email content
 * @param {string} options.html - HTML email content
 */
const sendAlertEmailWithFrom = async ({ fromEmail, toEmails, subject, text, html }) => {
  if (!transporter) {
    console.log(
      'Email transporter not configured. Skipping alert email. Subject:',
      subject
    );
    return;
  }

  if (!toEmails || !Array.isArray(toEmails) || toEmails.length === 0) {
    console.log('No recipient emails provided. Skipping alert email.');
    return;
  }

  const to = toEmails.join(', ');

  try {
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html,
    });
    console.log(`Alert email sent from ${fromEmail} to ${to}`);
  } catch (error) {
    console.error('Failed to send alert email:', error.message);
    console.error('Email error details:', error);
    throw error;
  }
};

module.exports = {
  sendAlertEmail,
  sendAlertEmailWithFrom,
  getBlogPublisherEmails,
};
