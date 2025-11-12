const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const config = require('./config');

class EmailService {
    constructor() {
        this.transporter = null;
        this.resend = null;
        this.useAPI = false;
        
        // Try to initialize Resend API first (preferred for cloud hosting)
        if (process.env.RESEND_API_KEY) {
            this.initializeResendAPI();
        } else {
            console.warn('RESEND_API_KEY not set, using SMTP...');
            this.initializeTransporter();
        }
    }

    initializeResendAPI() {
        try {
            this.resend = new Resend(process.env.RESEND_API_KEY);
            this.useAPI = true;
            console.log('✓ Resend API initialized successfully');
            console.log('  Using API (HTTPS) - works on all cloud providers');
        } catch (error) {
            console.error('Failed to initialize Resend API:', error);
            console.warn('Falling back to SMTP...');
            this.useAPI = false;
            this.initializeTransporter();
        }
    }

    initializeTransporter() {
        try {
            // Enhanced configuration optimized for cloud hosting (Render)
            // For Render and other cloud providers, we need more lenient settings
            const isProduction = process.env.NODE_ENV === 'production';
            
            this.transporter = nodemailer.createTransport({
                host: config.email.smtp.host,
                port: config.email.smtp.port,
                secure: config.email.smtp.secure, // true for 465, false for 587
                auth: config.email.smtp.auth,
                // Increased timeout settings for cloud environments
                connectionTimeout: 60000, // 60 seconds (increased for cloud)
                greetingTimeout: 30000, // 30 seconds
                socketTimeout: 60000, // 60 seconds
                // TLS configuration - for secure SMTP connections
                tls: {
                    rejectUnauthorized: true, // Verify SSL certificates
                    minVersion: 'TLSv1.2',
                    ciphers: 'HIGH:!aNULL:!MD5'
                },
                // Disable pooling for initial connection (can cause timeout issues)
                // Pool will be created on-demand
                pool: false,
                // Enable debugging in development
                debug: !isProduction,
                logger: !isProduction
            });

            // Verify connection asynchronously (non-blocking)
            // This allows the app to start even if SMTP verification takes time
            // Connection will be verified on first email send attempt
            const verifyTimeout = setTimeout(() => {
                console.warn('Email service verification is taking longer than expected...');
            }, 15000);

            // Verify connection asynchronously (non-blocking)
            // Wrap in try-catch to handle any synchronous errors
            try {
                this.transporter.verify((error, success) => {
                    clearTimeout(verifyTimeout);
                    if (error) {
                        console.error('SMTP configuration error:', error);
                        console.error('Note: Cloud providers often block SMTP ports.');
                        console.error('Consider setting RESEND_API_KEY to use API instead.');
                        console.error(`Current config: ${config.email.smtp.host}:${config.email.smtp.port}, secure=${config.email.smtp.secure}`);
                        // Don't throw - allow app to start, connection will be retried on send
                    } else {
                        console.log('✓ Email service is ready to send messages (SMTP)');
                        console.log(`  Host: ${config.email.smtp.host}:${config.email.smtp.port}`);
                        console.log(`  Secure: ${config.email.smtp.secure}`);
                    }
                });
            } catch (err) {
                clearTimeout(verifyTimeout);
                console.warn('Email verification setup failed, will retry on first send:', err.message);
            }
        } catch (error) {
            console.error('Failed to initialize email transporter:', error);
        }
    }

    // Generate HTML email template for password reset
    generatePasswordResetEmail(resetLink, username) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - IMVCMPC</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #E9EEF3;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #E9EEF3 0%, #B8D53D 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%; background: #FFFFFF; border-radius: 24px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0B5E1C 0%, #187C19 100%); padding: 40px 32px; text-align: center;">
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">IMVCMPC</h1>
                            <p style="margin: 8px 0 0 0; color: #B8D53D; font-size: 14px; font-weight: 500;">Ibaan Market Vendors & Community Multi-Purpose Cooperative</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="margin: 0 0 16px 0; color: #0B5E1C; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hello <strong>${username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                We received a request to reset your password for your IMVCMPC Finance Management System account. If you made this request, please click the button below to reset your password.
                            </p>
                            
                            <!-- Reset Button -->
                            <table role="presentation" style="width: 100%; margin: 32px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <a href="${resetLink}" style="display: inline-block; background: #187C19; color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(24, 124, 25, 0.3);">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 8px 0 24px 0; color: #187C19; font-size: 14px; word-break: break-all;">
                                <a href="${resetLink}" style="color: #187C19; text-decoration: underline;">${resetLink}</a>
                            </p>
                            
                            <!-- Security Notice -->
                            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 24px 0;">
                                <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
                                    <strong>Security Notice:</strong> This link will expire in 1 hour. If you did not request a password reset, please ignore this email or contact your IT Head immediately.
                                </p>
                            </div>
                            
                            <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                                Best regards,<br>
                                <strong style="color: #0B5E1C;">IMVCMPC System</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px;">
                                This is an automated message. Please do not reply to this email.
                            </p>
                            <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                                © ${new Date().getFullYear()} IMVCMPC. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    // Send password reset email with retry logic
    async sendPasswordResetEmail(email, username, resetLink, retries = 2) {
        // Use Resend API if available (preferred for cloud hosting)
        if (this.useAPI && this.resend) {
            return this.sendPasswordResetEmailViaAPI(email, username, resetLink);
        }
        
        // Fall back to SMTP
        return this.sendPasswordResetEmailViaSMTP(email, username, resetLink, retries);
    }

    // Send password reset email via Resend API
    async sendPasswordResetEmailViaAPI(email, username, resetLink) {
        try {
            // Extract email address from EMAIL_FROM (handles both formats)
            const fromEmail = config.email.from.match(/<(.+)>/)?.[1] || config.email.from.split(' ').pop() || 'noreply@imvcmpc.org';
            const fromName = config.email.from.match(/(.+?)\s*</)?.[1]?.trim() || 'IMVCMPC System';

            const { data, error } = await this.resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: [email],
                subject: 'IMVCMPC - Password Reset Request',
                html: this.generatePasswordResetEmail(resetLink, username),
                text: `Hello ${username},\n\nWe received a request to reset your password. Please click the following link to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour. If you did not request this, please ignore this email.\n\nBest regards,\nIMVCMPC System`
            });

            if (error) {
                throw new Error(error.message || 'Failed to send email via Resend API');
            }

            console.log('Password reset email sent via Resend API:', data?.id);
            return {
                success: true,
                messageId: data?.id || 'resend-api'
            };
        } catch (error) {
            console.error('Error sending password reset email via API:', error);
            throw new Error('Failed to send password reset email: ' + (error.message || 'Unknown error'));
        }
    }

    // Send password reset email via SMTP
    async sendPasswordResetEmailViaSMTP(email, username, resetLink, retries = 2) {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            const mailOptions = {
                from: config.email.from,
                to: email,
                subject: 'IMVCMPC - Password Reset Request',
                html: this.generatePasswordResetEmail(resetLink, username),
                text: `Hello ${username},\n\nWe received a request to reset your password. Please click the following link to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour. If you did not request this, please ignore this email.\n\nBest regards,\nIMVCMPC System`
            };

            try {
                const info = await this.transporter.sendMail(mailOptions);
                console.log('Password reset email sent via SMTP:', info.messageId);
                return {
                    success: true,
                    messageId: info.messageId
                };
            } catch (sendError) {
                // Retry on timeout or connection errors
                if (retries > 0 && (sendError.code === 'ETIMEDOUT' || sendError.code === 'ECONNRESET' || sendError.code === 'ESOCKET')) {
                    console.warn(`Email send failed, retrying... (${retries} attempts left)`, sendError.message);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                    return this.sendPasswordResetEmailViaSMTP(email, username, resetLink, retries - 1);
                }
                throw sendError;
            }
        } catch (error) {
            console.error('Error sending password reset email via SMTP:', error);
            // Provide more helpful error message
            if (error.code === 'ETIMEDOUT') {
                throw new Error('Email service connection timeout. Cloud provider may be blocking SMTP. Consider using RESEND_API_KEY.');
            } else if (error.code === 'EAUTH') {
                throw new Error('Email authentication failed. Please verify SMTP_USER and SMTP_PASS are correct.');
            }
            throw new Error('Failed to send password reset email: ' + error.message);
        }
    }

    // Generate HTML email template for reactivation verification code
    generateReactivationCodeEmail(code, username) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Reactivation Code - IMVCMPC</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #E9EEF3;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #E9EEF3 0%, #B8D53D 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" style="max-width: 600px; width: 100%; background: #FFFFFF; border-radius: 24px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0B5E1C 0%, #187C19 100%); padding: 40px 32px; text-align: center;">
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">IMVCMPC</h1>
                            <p style="margin: 8px 0 0 0; color: #B8D53D; font-size: 14px; font-weight: 500;">Ibaan Market Vendors & Community Multi-Purpose Cooperative</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="margin: 0 0 16px 0; color: #0B5E1C; font-size: 24px; font-weight: 600;">Account Reactivation Verification</h2>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hello <strong>${username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                You have requested to reactivate your IMVCMPC Finance Management System account. Please use the verification code below to complete your reactivation request.
                            </p>
                            
                            <!-- Verification Code Box -->
                            <table role="presentation" style="width: 100%; margin: 32px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <div style="background: linear-gradient(135deg, #187C19 0%, #69B41E 100%); padding: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(24, 124, 25, 0.3);">
                                            <p style="margin: 0 0 12px 0; color: #FFFFFF; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                                            <p style="margin: 0; color: #FFFFFF; font-size: 48px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                                Enter this code in the reactivation request form to verify your identity and submit your request.
                            </p>
                            
                            <!-- Security Notice -->
                            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 8px; margin: 24px 0;">
                                <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">
                                    <strong>Security Notice:</strong> This code will expire in 15 minutes. If you did not request account reactivation, please ignore this email or contact your IT Head immediately.
                                </p>
                            </div>
                            
                            <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                                Best regards,<br>
                                <strong style="color: #0B5E1C;">IMVCMPC System</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #F9FAFB; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px;">
                                This is an automated message. Please do not reply to this email.
                            </p>
                            <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                                © ${new Date().getFullYear()} IMVCMPC. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    // Send reactivation verification code email with retry logic
    async sendReactivationCodeEmail(email, username, code, retries = 2) {
        // Use Resend API if available (preferred for cloud hosting)
        if (this.useAPI && this.resend) {
            return this.sendReactivationCodeEmailViaAPI(email, username, code);
        }
        
        // Fall back to SMTP
        return this.sendReactivationCodeEmailViaSMTP(email, username, code, retries);
    }

    // Send reactivation code email via Resend API
    async sendReactivationCodeEmailViaAPI(email, username, code) {
        try {
            // Extract email address from EMAIL_FROM (handles both formats)
            const fromEmail = config.email.from.match(/<(.+)>/)?.[1] || config.email.from.split(' ').pop() || 'noreply@imvcmpc.org';
            const fromName = config.email.from.match(/(.+?)\s*</)?.[1]?.trim() || 'IMVCMPC System';

            const { data, error } = await this.resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: [email],
                subject: 'IMVCMPC - Account Reactivation Verification Code',
                html: this.generateReactivationCodeEmail(code, username),
                text: `Hello ${username},\n\nYou have requested to reactivate your IMVCMPC Finance Management System account. Please use the verification code below to complete your reactivation request:\n\nVerification Code: ${code}\n\nThis code will expire in 15 minutes. If you did not request account reactivation, please ignore this email.\n\nBest regards,\nIMVCMPC System`
            });

            if (error) {
                throw new Error(error.message || 'Failed to send email via Resend API');
            }

            console.log('Reactivation code email sent via Resend API:', data?.id);
            return {
                success: true,
                messageId: data?.id || 'resend-api'
            };
        } catch (error) {
            console.error('Error sending reactivation code email via API:', error);
            throw new Error('Failed to send reactivation code email: ' + (error.message || 'Unknown error'));
        }
    }

    // Send reactivation code email via SMTP
    async sendReactivationCodeEmailViaSMTP(email, username, code, retries = 2) {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            const mailOptions = {
                from: config.email.from,
                to: email,
                subject: 'IMVCMPC - Account Reactivation Verification Code',
                html: this.generateReactivationCodeEmail(code, username),
                text: `Hello ${username},\n\nYou have requested to reactivate your IMVCMPC Finance Management System account. Please use the verification code below to complete your reactivation request:\n\nVerification Code: ${code}\n\nThis code will expire in 15 minutes. If you did not request account reactivation, please ignore this email.\n\nBest regards,\nIMVCMPC System`
            };

            try {
                const info = await this.transporter.sendMail(mailOptions);
                console.log('Reactivation code email sent via SMTP:', info.messageId);
                return {
                    success: true,
                    messageId: info.messageId
                };
            } catch (sendError) {
                // Retry on timeout or connection errors
                if (retries > 0 && (sendError.code === 'ETIMEDOUT' || sendError.code === 'ECONNRESET' || sendError.code === 'ESOCKET')) {
                    console.warn(`Email send failed, retrying... (${retries} attempts left)`, sendError.message);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                    return this.sendReactivationCodeEmailViaSMTP(email, username, code, retries - 1);
                }
                throw sendError;
            }
        } catch (error) {
            console.error('Error sending reactivation code email via SMTP:', error);
            // Provide more helpful error message
            if (error.code === 'ETIMEDOUT') {
                throw new Error('Email service connection timeout. Cloud provider may be blocking SMTP. Consider using RESEND_API_KEY.');
            } else if (error.code === 'EAUTH') {
                throw new Error('Email authentication failed. Please verify SMTP_USER and SMTP_PASS are correct.');
            }
            throw new Error('Failed to send reactivation code email: ' + error.message);
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
