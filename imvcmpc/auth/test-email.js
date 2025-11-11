#!/usr/bin/env node

/**
 * Email Service Test Script
 * 
 * This script tests the email service configuration without running the full application.
 * Use it to quickly verify SMTP settings and troubleshoot connection issues.
 * 
 * Usage:
 *   node test-email.js
 *   
 * Or with custom email:
 *   node test-email.js your-email@example.com
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER || 'capstone.imvcmpc.system@gmail.com',
        pass: process.env.SMTP_PASS
    }
};

async function testEmailConnection() {
    console.log('🧪 Testing Email Service Configuration...\n');
    console.log('Configuration:');
    console.log(`  Host: ${config.host}`);
    console.log(`  Port: ${config.port}`);
    console.log(`  Secure (SSL/TLS): ${config.secure}`);
    console.log(`  User: ${config.auth.user}`);
    console.log(`  Password: ${config.auth.pass ? '***' + config.auth.pass.slice(-4) : 'NOT SET'}`);
    console.log('');

    // Create transporter with enhanced settings
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.auth,
        connectionTimeout: 30000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
        tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2',
            ciphers: 'HIGH:!aNULL:!MD5'
        },
        debug: true,
        logger: true
    });

    try {
        console.log('⏳ Step 1: Verifying connection...');
        const startTime = Date.now();
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection verification timeout after 30 seconds'));
            }, 30000);

            transporter.verify((error, success) => {
                clearTimeout(timeout);
                if (error) {
                    reject(error);
                } else {
                    resolve(success);
                }
            });
        });

        const connectionTime = Date.now() - startTime;
        console.log(`✅ Connection verified successfully! (${connectionTime}ms)\n`);

        // Send test email if recipient is provided
        const testEmail = process.argv[2];
        if (testEmail) {
            console.log(`⏳ Step 2: Sending test email to ${testEmail}...`);
            
            const mailOptions = {
                from: `IMVCMPC System <${config.auth.user}>`,
                to: testEmail,
                subject: 'IMVCMPC Email Service Test',
                text: 'This is a test email from the IMVCMPC Finance Management System. If you received this, the email service is working correctly!',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                            <h2 style="color: #187C19; margin-top: 0;">✅ Email Service Test Successful!</h2>
                            <p style="color: #333; line-height: 1.6;">
                                This is a test email from the <strong>IMVCMPC Finance Management System</strong>.
                            </p>
                            <p style="color: #333; line-height: 1.6;">
                                If you received this email, your SMTP configuration is working correctly! 🎉
                            </p>
                            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                            <p style="color: #666; font-size: 12px;">
                                <strong>Configuration Details:</strong><br>
                                Host: ${config.host}<br>
                                Port: ${config.port}<br>
                                Secure: ${config.secure ? 'Yes (SSL/TLS)' : 'No (STARTTLS)'}<br>
                                Sent at: ${new Date().toISOString()}
                            </p>
                        </div>
                    </div>
                `
            };

            const sendStart = Date.now();
            const info = await transporter.sendMail(mailOptions);
            const sendTime = Date.now() - sendStart;

            console.log(`✅ Test email sent successfully! (${sendTime}ms)`);
            console.log(`   Message ID: ${info.messageId}`);
            console.log(`   Accepted: ${info.accepted.join(', ')}`);
            if (info.rejected.length > 0) {
                console.log(`   Rejected: ${info.rejected.join(', ')}`);
            }
            console.log('');
        } else {
            console.log('ℹ️  Skipping test email (no recipient provided)');
            console.log('   To send a test email, run: node test-email.js your-email@example.com\n');
        }

        console.log('═════════════════════════════════════════════════');
        console.log('✅ ALL TESTS PASSED!');
        console.log('═════════════════════════════════════════════════');
        console.log('Your email service is configured correctly and ready to use.');
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Email Service Test Failed!\n');
        console.error('Error Details:');
        console.error(`  Code: ${error.code || 'N/A'}`);
        console.error(`  Message: ${error.message}`);
        console.error('');

        // Provide helpful troubleshooting tips
        console.log('🔍 Troubleshooting Tips:\n');
        
        if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            console.log('⚠️  CONNECTION TIMEOUT');
            console.log('   This usually means the SMTP port is blocked by your hosting provider.');
            console.log('');
            console.log('   Solutions:');
            console.log('   1. Try port 465 with secure:true (SSL) - Most reliable for cloud hosting');
            console.log('   2. Try port 587 with secure:false (STARTTLS)');
            console.log('   3. Try port 2525 as an alternative');
            console.log('   4. Contact your hosting provider about SMTP restrictions');
            console.log('   5. Use a dedicated email service (SendGrid, Mailgun, etc.)');
            console.log('');
            console.log('   Current settings:');
            console.log(`   SMTP_HOST=${config.host}`);
            console.log(`   SMTP_PORT=${config.port}`);
            console.log(`   SMTP_SECURE=${config.secure}`);
            console.log('');
        } else if (error.code === 'EAUTH' || error.message.includes('authentication')) {
            console.log('⚠️  AUTHENTICATION FAILED');
            console.log('   Your credentials are incorrect or invalid.');
            console.log('');
            console.log('   Solutions:');
            console.log('   1. For Gmail: Generate a new App Password');
            console.log('      → https://myaccount.google.com/apppasswords');
            console.log('   2. Ensure 2-Factor Authentication is enabled');
            console.log('   3. Verify SMTP_USER is the full email address');
            console.log('   4. Check that SMTP_PASS has no extra spaces');
            console.log('');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('⚠️  CONNECTION REFUSED');
            console.log('   The SMTP server rejected the connection.');
            console.log('');
            console.log('   Solutions:');
            console.log('   1. Verify the SMTP host is correct');
            console.log('   2. Check if the port is correct for your provider');
            console.log('   3. Ensure your IP is not blocked by the SMTP provider');
            console.log('');
        } else if (error.message.includes('CERT') || error.message.includes('TLS')) {
            console.log('⚠️  SSL/TLS CERTIFICATE ERROR');
            console.log('   There\'s an issue with the SSL/TLS certificate.');
            console.log('');
            console.log('   Solutions:');
            console.log('   1. Try setting rejectUnauthorized: false in TLS config (testing only)');
            console.log('   2. Update Node.js to the latest version');
            console.log('   3. Check system time/date is correct');
            console.log('');
        }

        console.log('═════════════════════════════════════════════════');
        console.log('📚 Additional Resources:');
        console.log('   • Gmail SMTP: https://support.google.com/mail/answer/7126229');
        console.log('   • SendGrid Setup: https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api');
        console.log('   • Nodemailer Docs: https://nodemailer.com/smtp/');
        console.log('═════════════════════════════════════════════════');
        console.log('');

        process.exit(1);
    }
}

// Check if required dependencies are installed
try {
    require.resolve('nodemailer');
} catch (e) {
    console.error('❌ Error: nodemailer is not installed!');
    console.error('   Run: npm install nodemailer');
    process.exit(1);
}

// Run the test
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('      IMVCMPC Email Service Configuration Test');
console.log('═══════════════════════════════════════════════════════');
console.log('');

testEmailConnection();


