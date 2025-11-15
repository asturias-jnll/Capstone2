const { Resend } = require('resend');
const config = require('./config');

class EmailService {
    constructor() {
        this.resend = null;
        this.initialized = false;
    }

    // Lazy initialization - only initialize when first needed
    initialize() {
        if (this.initialized) {
            return;
        }

        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is required. Please set it in your environment variables. Email functionality will not work without this key.');
        }
        
        try {
            this.resend = new Resend(process.env.RESEND_API_KEY);
            this.initialized = true;
            console.log('✓ Resend API initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Resend API:', error);
            throw error;
        }
    }

    // Extract email address and name from config
    getFromEmailAndName() {
        const fromEmail = config.email.from.match(/<(.+)>/)?.[1] || config.email.from.split(' ').pop() || 'system@imvcmpc.org';
        const fromName = 'IMVCMPC System';
        return { fromEmail, fromName };
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
        this.initialize(); // Ensure initialized before use
        try {
            const { fromEmail, fromName } = this.getFromEmailAndName();

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
            console.error('Error sending password reset email:', error);
            throw new Error('Failed to send password reset email: ' + (error.message || 'Unknown error'));
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
        this.initialize(); // Ensure initialized before use
        try {
            const { fromEmail, fromName } = this.getFromEmailAndName();

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
            console.error('Error sending reactivation code email:', error);
            throw new Error('Failed to send reactivation code email: ' + (error.message || 'Unknown error'));
        }
    }

    // Generate HTML email template for account deactivation
    generateAccountDeactivationEmail(username) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Deactivated - IMVCMPC</title>
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
                            <h2 style="margin: 0 0 16px 0; color: #0B5E1C; font-size: 24px; font-weight: 600;">Account Deactivated</h2>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hello <strong>${username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Your IMVCMPC Finance Management System account has been deactivated by the IT Head. You will no longer be able to access the system until your account is reactivated.
                            </p>
                            
                            <!-- Important Notice -->
                            <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
                                <p style="margin: 0; color: #991B1B; font-size: 14px; line-height: 1.6;">
                                    <strong>Important:</strong> If you believe this deactivation was made in error, please contact your IT Head immediately to request account reactivation.
                                </p>
                            </div>
                            
                            <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                                To request account reactivation, you can use the reactivation request feature on the login page. You will need to verify your identity using your password and a verification code sent to your email.
                            </p>
                            
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

    // Send account deactivation email
    async sendAccountDeactivationEmail(email, username) {
        this.initialize(); // Ensure initialized before use
        try {
            const { fromEmail, fromName } = this.getFromEmailAndName();

            const { data, error } = await this.resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: [email],
                subject: 'IMVCMPC - Account Deactivated',
                html: this.generateAccountDeactivationEmail(username),
                text: `Hello ${username},\n\nYour IMVCMPC Finance Management System account has been deactivated by the IT Head. You will no longer be able to access the system until your account is reactivated.\n\nIf you believe this deactivation was made in error, please contact your IT Head immediately to request account reactivation.\n\nBest regards,\nIMVCMPC System`
            });

            if (error) {
                throw new Error(error.message || 'Failed to send email via Resend API');
            }

            console.log('Account deactivation email sent via Resend API:', data?.id);
            return {
                success: true,
                messageId: data?.id || 'resend-api'
            };
        } catch (error) {
            console.error('Error sending account deactivation email:', error);
            throw new Error('Failed to send account deactivation email: ' + (error.message || 'Unknown error'));
        }
    }

    // Generate HTML email template for account reactivation (user-requested)
    generateAccountReactivationApprovedEmail(username, notes = null) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Reactivation Approved - IMVCMPC</title>
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
                            <h2 style="margin: 0 0 16px 0; color: #0B5E1C; font-size: 24px; font-weight: 600;">Account Reactivation Approved</h2>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hello <strong>${username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Your account reactivation request has been approved by the IT Head. You can now log in to your IMVCMPC Finance Management System account.
                            </p>
                            ${notes ? `
                            <div style="background: #F0FDF4; border-left: 4px solid #22C55E; padding: 16px; border-radius: 8px; margin: 24px 0;">
                                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                                    <strong>Note from IT Head:</strong> ${notes}
                                </p>
                            </div>
                            ` : ''}
                            
                            <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                                You can now access the system using your username and password. If you have any issues logging in, please contact your IT Head.
                            </p>
                            
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

    // Send account reactivation email (user-requested)
    async sendAccountReactivationApprovedEmail(email, username, notes = null) {
        this.initialize(); // Ensure initialized before use
        try {
            const { fromEmail, fromName } = this.getFromEmailAndName();

            const { data, error } = await this.resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: [email],
                subject: 'IMVCMPC - Account Reactivation Approved',
                html: this.generateAccountReactivationApprovedEmail(username, notes),
                text: `Hello ${username},\n\nYour account reactivation request has been approved by the IT Head. You can now log in to your IMVCMPC Finance Management System account.${notes ? `\n\nNote from IT Head: ${notes}` : ''}\n\nBest regards,\nIMVCMPC System`
            });

            if (error) {
                throw new Error(error.message || 'Failed to send email via Resend API');
            }

            console.log('Account reactivation approved email sent via Resend API:', data?.id);
            return {
                success: true,
                messageId: data?.id || 'resend-api'
            };
        } catch (error) {
            console.error('Error sending account reactivation approved email:', error);
            throw new Error('Failed to send account reactivation approved email: ' + (error.message || 'Unknown error'));
        }
    }

    // Generate HTML email template for account reactivation (IT Head direct)
    generateAccountReactivationDirectEmail(username) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Reactivated - IMVCMPC</title>
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
                            <h2 style="margin: 0 0 16px 0; color: #0B5E1C; font-size: 24px; font-weight: 600;">Account Reactivated</h2>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hello <strong>${username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Your IMVCMPC Finance Management System account has been reactivated by the IT Head. You can now log in to your account and access all system features.
                            </p>
                            
                            <div style="background: #F0FDF4; border-left: 4px solid #22C55E; padding: 16px; border-radius: 8px; margin: 24px 0;">
                                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                                    <strong>Welcome back!</strong> Your account access has been restored. You can now use the system normally.
                                </p>
                            </div>
                            
                            <p style="margin: 24px 0 0 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                                If you have any questions or need assistance, please contact your IT Head.
                            </p>
                            
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

    // Send account reactivation email (IT Head direct)
    async sendAccountReactivationDirectEmail(email, username) {
        this.initialize(); // Ensure initialized before use
        try {
            const { fromEmail, fromName } = this.getFromEmailAndName();

            const { data, error } = await this.resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: [email],
                subject: 'IMVCMPC - Account Reactivated',
                html: this.generateAccountReactivationDirectEmail(username),
                text: `Hello ${username},\n\nYour IMVCMPC Finance Management System account has been reactivated by the IT Head. You can now log in to your account and access all system features.\n\nBest regards,\nIMVCMPC System`
            });

            if (error) {
                throw new Error(error.message || 'Failed to send email via Resend API');
            }

            console.log('Account reactivation direct email sent via Resend API:', data?.id);
            return {
                success: true,
                messageId: data?.id || 'resend-api'
            };
        } catch (error) {
            console.error('Error sending account reactivation direct email:', error);
            throw new Error('Failed to send account reactivation direct email: ' + (error.message || 'Unknown error'));
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
