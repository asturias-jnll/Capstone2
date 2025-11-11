const nodemailer = require('nodemailer');
const config = require('./config');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            // Enhanced configuration with timeout and connection settings
            this.transporter = nodemailer.createTransport({
                host: config.email.smtp.host,
                port: config.email.smtp.port,
                secure: config.email.smtp.secure, // true for 465, false for 587
                auth: config.email.smtp.auth,
                // Connection timeout settings
                connectionTimeout: 30000, // 30 seconds
                greetingTimeout: 20000, // 20 seconds
                socketTimeout: 30000, // 30 seconds
                // TLS configuration
                tls: {
                    rejectUnauthorized: true,
                    minVersion: 'TLSv1.2',
                    ciphers: 'HIGH:!aNULL:!MD5'
                },
                // Pool configuration for better connection management
                pool: true,
                maxConnections: 5,
                maxMessages: 10,
                // Enable debugging in development
                debug: process.env.NODE_ENV !== 'production',
                logger: process.env.NODE_ENV !== 'production'
            });

            // Verify connection configuration with timeout
            const verifyTimeout = setTimeout(() => {
                console.warn('Email service verification is taking longer than expected...');
            }, 10000);

            this.transporter.verify((error, success) => {
                clearTimeout(verifyTimeout);
                if (error) {
                    console.error('Email service configuration error:', error);
                    console.error('Please check your SMTP settings and ensure:');
                    console.error('1. SMTP host and port are correct');
                    console.error('2. For Gmail: Use port 465 with secure:true (recommended for cloud hosting)');
                    console.error('3. App password is valid and 2FA is enabled');
                    console.error('4. Your hosting provider allows outbound SMTP connections');
                } else {
                    console.log('✓ Email service is ready to send messages');
                    console.log(`  Host: ${config.email.smtp.host}:${config.email.smtp.port}`);
                    console.log(`  Secure: ${config.email.smtp.secure}`);
                }
            });
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

    // Send password reset email
    async sendPasswordResetEmail(email, username, resetLink) {
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

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent:', info.messageId);
            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
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

    // Send reactivation verification code email
    async sendReactivationCodeEmail(email, username, code) {
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

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Reactivation code email sent:', info.messageId);
            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            console.error('Error sending reactivation code email:', error);
            throw new Error('Failed to send reactivation code email');
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;

