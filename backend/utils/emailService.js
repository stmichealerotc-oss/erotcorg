const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false // Allow self-signed certificates
            },
            debug: process.env.NODE_ENV === 'development', // Enable debug in development
            logger: process.env.NODE_ENV === 'development' // Enable logging in development
        });
        
        // Verify transporter configuration
        this.verifyConnection();
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Email service connection verified successfully');
        } catch (error) {
            console.error('❌ Email service connection failed:', error.message);
            console.error('📧 SMTP Configuration:', {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER,
                hasPassword: !!process.env.SMTP_PASS
            });
        }
    }

    // Generate secure random password
    generateOneTimePassword() {
        // Generate a more secure 12-character password with mixed case, numbers, and symbols
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*';
        
        let password = '';
        
        // Ensure at least one character from each category
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        
        // Fill the rest randomly
        const allChars = uppercase + lowercase + numbers + symbols;
        for (let i = 4; i < 12; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    // Generate reset token
    generateResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Get the correct production URL
    getProductionUrl() {
        // Always use the production URL for emails
        return process.env.FRONTEND_URL || 'https://church-management-vjfw.onrender.com';
    }

    // Send welcome email with one-time password
    async sendWelcomeEmail(user, oneTimePassword) {
        console.log('📧 Attempting to send welcome email to:', user.email);
        
        const mailOptions = {
            from: `"St. Michael Eritrean Orthodox Tewahedo Church" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Welcome to Church Management System - Your Account is Ready',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
                            🏛️  St. Michael Eritrean Orthodox Tewahedo Church
                        </h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Church Management System</p>
                    </div>
                    
                    <div style="padding: 40px 30px; background: white;">
                        <h2 style="color: #2d3748; margin-bottom: 20px; font-size: 24px;">Welcome, ${user.name}!</h2>
                        
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            Your account has been created by the system administrator. You now have access to the Church Management System with the following credentials:
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #f7fafc, #edf2f7); padding: 25px; border-radius: 12px; border-left: 5px solid #667eea; margin: 25px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: 600; color: #4a5568; width: 120px;">Username:</td>
                                    <td style="padding: 8px 0; font-family: 'Courier New', monospace; font-size: 16px; color: #2d3748;">${user.username}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: 600; color: #4a5568;">Email:</td>
                                    <td style="padding: 8px 0; color: #2d3748;">${user.email}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: 600; color: #4a5568;">Role:</td>
                                    <td style="padding: 8px 0; color: #2d3748; text-transform: capitalize;">${user.role.replace('-', ' ')}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0 8px 0; font-weight: 600; color: #4a5568;">Temporary Password:</td>
                                    <td style="padding: 15px 0 8px 0;">
                                        <code style="background: #667eea; color: white; padding: 8px 12px; border-radius: 6px; font-size: 18px; font-weight: bold; letter-spacing: 1px;">${oneTimePassword}</code>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: linear-gradient(135deg, #fff3cd, #ffeaa7); padding: 20px; border-radius: 10px; border: 1px solid #f6ad55; margin: 25px 0;">
                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                <span style="color: #d69e2e; font-size: 20px;">⚠️</span>
                                <div>
                                    <p style="margin: 0 0 10px 0; color: #744210; font-weight: 600;">Important Security Notice:</p>
                                    <ul style="margin: 0; padding-left: 20px; color: #744210;">
                                        <li>This temporary password expires in <strong>24 hours</strong></li>
                                        <li>You will be required to change it on your first login</li>
                                        <li>After login, you must verify your email address for security</li>
                                        <li>Choose a strong password with at least 8 characters</li>
                                        <li>Include uppercase, lowercase, numbers, and special characters</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${this.getProductionUrl()}" 
                               style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                🔐 Login to Church Management System
                            </a>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
                            <h3 style="color: #4a5568; margin: 0 0 15px 0; font-size: 18px;">Need Help?</h3>
                            <p style="color: #718096; margin: 0; font-size: 14px;">
                                If you have any questions or need assistance, please contact the system administrator at 
                                <a href="mailto:stmichaelerotc@gmail.com" style="color: #667eea;">stmichaelerotc@gmail.com</a>
                            </p>
                        </div>
                    </div>
                    
                    <div style="background: #2d3748; color: white; padding: 20px; text-align: center; font-size: 14px; border-radius: 0 0 10px 10px;">
                        <p style="margin: 0;">
                            <strong>St. Michael Eritrean Orthodox Tewahedo Church</strong><br>
                            60 Osborne Street, Joondanna, WA 6060<br>
                            ABN: 80798549161 | Email: stmichaelerotc@gmail.com<br>
                            <a href="https://erotc.org" style="color: #90cdf4;">erotc.org</a>
                        </p>
                        <p style="margin: 15px 0 0 0; color: #a0aec0;">
                            Church Management System © ${new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            `
        };

        try {
            console.log('📧 Email configuration:', {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                user: process.env.SMTP_USER,
                hasPassword: !!process.env.SMTP_PASS,
                to: user.email
            });
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Welcome email sent successfully to:', user.email);
            console.log('📧 Message ID:', info.messageId);
            console.log('📧 Response:', info.response);
            
            // Additional verification
            if (info.accepted && info.accepted.length > 0) {
                console.log('✅ Email accepted by server for:', info.accepted);
            }
            if (info.rejected && info.rejected.length > 0) {
                console.log('❌ Email rejected by server for:', info.rejected);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to send welcome email to:', user.email);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error response:', error.response);
            console.error('❌ Full error:', error);
            
            // Provide specific error guidance
            if (error.code === 'EAUTH') {
                console.error('🔐 Authentication failed. Check SMTP credentials.');
            } else if (error.code === 'ECONNECTION') {
                console.error('🌐 Connection failed. Check SMTP host and port.');
            } else if (error.code === 'EMESSAGE') {
                console.error('📧 Message rejected. Check email content and recipient.');
            }
            
            return false;
        }
    }

    // Send password reset email
    async sendPasswordResetEmail(user, resetToken) {
        console.log('📧 Attempting to send password reset email to:', user.email);
        
        const resetUrl = `${this.getProductionUrl()}/reset-password.html?token=${resetToken}`;
        
        const mailOptions = {
            from: `"St. Michael Eritrean Orthodox Tewahedo Church"" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Password Reset Request - Church Management System',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                    <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
                            🔐 Password Reset
                        </h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">St. Michael Eritrean Orthodox Tewahedo Church</p>                    </div>
                    
                    <div style="padding: 40px 30px; background: white;">
                        <h2 style="color: #2d3748; margin-bottom: 20px; font-size: 24px;">Hello ${user.name},</h2>
                        
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            We received a request to reset your password for the Church Management System. If you made this request, click the button below to set a new password:
                        </p>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${resetUrl}" 
                               style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);">
                                🔑 Reset My Password
                            </a>
                        </div>
                        
                        <div style="background: linear-gradient(135deg, #fff3cd, #ffeaa7); padding: 20px; border-radius: 10px; border: 1px solid #f6ad55; margin: 25px 0;">
                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                <span style="color: #d69e2e; font-size: 20px;">⚠️</span>
                                <div>
                                    <p style="margin: 0 0 10px 0; color: #744210; font-weight: 600;">Security Notice:</p>
                                    <ul style="margin: 0; padding-left: 20px; color: #744210;">
                                        <li>This reset link expires in <strong>1 hour</strong></li>
                                        <li>If you didn't request this reset, please ignore this email</li>
                                        <li>Your password will remain unchanged until you create a new one</li>
                                        <li>For security, this link can only be used once</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
                            <h3 style="color: #4a5568; margin: 0 0 15px 0; font-size: 16px;">Having trouble with the button?</h3>
                            <p style="color: #718096; margin: 0 0 10px 0; font-size: 14px;">
                                Copy and paste this link into your browser:
                            </p>
                            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 12px; color: #4a5568; margin: 0;">
                                ${resetUrl}
                            </p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
                            <h3 style="color: #4a5568; margin: 0 0 15px 0; font-size: 16px;">Need Help?</h3>
                            <p style="color: #718096; margin: 0; font-size: 14px;">
                                If you continue to have problems, please contact the system administrator at 
                                <a href="mailto:stmichaelerotc@gmail.com" style="color: #dc3545;">stmichaelerotc@gmail.com</a>
                            </p>
                        </div>
                    </div>
                    
                    <div style="background: #2d3748; color: white; padding: 20px; text-align: center; font-size: 14px; border-radius: 0 0 10px 10px;">
                        <p style="margin: 0;">
                            <strong>St. Michael Eritrean Orthodox Tewahedo Church</strong><br>
                            60 Osborne Street, Joondanna, WA 6060<br>
                            ABN: 80798549161 | Email: stmichaelerotc@gmail.com<br>
                            <a href="https://erotc.org" style="color: #90cdf4;">erotc.org</a>
                        </p>
                        <p style="margin: 15px 0 0 0; color: #a0aec0;">
                            Church Management System © ${new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent successfully to:', user.email);
            console.log('📧 Message ID:', info.messageId);
            console.log('📧 Response:', info.response);
            
            // Additional verification
            if (info.accepted && info.accepted.length > 0) {
                console.log('✅ Email accepted by server for:', info.accepted);
            }
            if (info.rejected && info.rejected.length > 0) {
                console.log('❌ Email rejected by server for:', info.rejected);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to send password reset email to:', user.email);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error response:', error.response);
            
            // Provide specific error guidance
            if (error.code === 'EAUTH') {
                console.error('🔐 Authentication failed. Check SMTP credentials.');
            } else if (error.code === 'ECONNECTION') {
                console.error('🌐 Connection failed. Check SMTP host and port.');
            } else if (error.code === 'EMESSAGE') {
                console.error('📧 Message rejected. Check email content and recipient.');
            }
            
            return false;
        }
    }

    // Send role change notification
    async sendRoleChangeNotification(user, oldRole, newRole, changedBy) {
        console.log('📧 Attempting to send role change notification to:', user.email);
        
        const mailOptions = {
            from: `"Church Management System" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Account Role Updated - Church Management System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🏛️ Church Management System</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #333;">Account Role Updated</h2>
                        
                        <p>Hello ${user.name},</p>
                        
                        <p>Your account role has been updated by ${changedBy}.</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                            <p><strong>Previous Role:</strong> ${oldRole}</p>
                            <p><strong>New Role:</strong> ${newRole}</p>
                            <p><strong>Updated By:</strong> ${changedBy}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                        
                        <p>Your access permissions may have changed. Please log in to see your updated access level.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${this.getProductionUrl()}" 
                               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Login to System
                            </a>
                        </div>
                    </div>
                    
                    <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
                        <p style="margin: 0;">Church Management System © ${new Date().getFullYear()}</p>
                    </div>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Role change notification sent successfully to:', user.email);
            console.log('📧 Message ID:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Failed to send role change notification to:', user.email);
            console.error('❌ Error details:', error.message);
            return false;
        }
    }

    // Generate 6-digit verification code
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Send email verification code
    async sendEmailVerificationCode(user, verificationCode) {
        console.log('📧 Attempting to send email verification code to:', user.email);
        
        const mailOptions = {
            from: `"St. Michael Eritrean Orthodox Tewahedo Church" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: 'Email Verification Code - Church Management System',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa;">
                    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
                            ✉️ Email Verification
                        </h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">St. Michael Eritrean Orthodox Tewahedo Church</p>
                    </div>
                    
                    <div style="padding: 40px 30px; background: white;">
                        <h2 style="color: #2d3748; margin-bottom: 20px; font-size: 24px;">Hello ${user.name},</h2>
                        
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                            To complete your account setup and ensure security, please verify your email address using the verification code below:
                        </p>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <div style="background: linear-gradient(135deg, #f7fafc, #edf2f7); padding: 25px; border-radius: 12px; border: 3px solid #28a745; display: inline-block;">
                                <p style="margin: 0 0 10px 0; color: #4a5568; font-size: 14px; font-weight: 600;">VERIFICATION CODE</p>
                                <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 8px; margin: 0;">
                                    ${verificationCode}
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: linear-gradient(135deg, #fff3cd, #ffeaa7); padding: 20px; border-radius: 10px; border: 1px solid #f6ad55; margin: 25px 0;">
                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                <span style="color: #d69e2e; font-size: 20px;">⚠️</span>
                                <div>
                                    <p style="margin: 0 0 10px 0; color: #744210; font-weight: 600;">Important:</p>
                                    <ul style="margin: 0; padding-left: 20px; color: #744210;">
                                        <li>This verification code expires in <strong>15 minutes</strong></li>
                                        <li>Enter this code in the Church Management System</li>
                                        <li>Do not share this code with anyone</li>
                                        <li>If you didn't request this, please contact support</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
                            <h3 style="color: #4a5568; margin: 0 0 15px 0; font-size: 16px;">Need Help?</h3>
                            <p style="color: #718096; margin: 0; font-size: 14px;">
                                If you're having trouble with email verification, please contact the system administrator at 
                                <a href="mailto:stmichaelerotc@gmail.com" style="color: #28a745;">stmichaelerotc@gmail.com</a>
                            </p>
                        </div>
                    </div>
                    
                    <div style="background: #2d3748; color: white; padding: 20px; text-align: center; font-size: 14px; border-radius: 0 0 10px 10px;">
                        <p style="margin: 0;">
                            <strong>St. Michael Eritrean Orthodox Tewahedo Church</strong><br>
                            60 Osborne Street, Joondanna, WA 6060<br>
                            ABN: 80798549161 | Email: stmichaelerotc@gmail.com<br>
                            <a href="https://erotc.org" style="color: #90cdf4;">erotc.org</a>
                        </p>
                        <p style="margin: 15px 0 0 0; color: #a0aec0;">
                            Church Management System © ${new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email verification code sent successfully to:', user.email);
            console.log('📧 Message ID:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Failed to send email verification code to:', user.email);
            console.error('❌ Error details:', error.message);
            return false;
        }
    }

    // Test email functionality
    async sendTestEmail(toEmail = 'debesay304@gmail.com') {
        console.log('🧪 Sending test email to:', toEmail);
        
        const mailOptions = {
            from: `"Church Management System Test" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: 'Test Email - Church Management System',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4361ee;">🧪 Email Test Successful!</h2>
                    <p>This is a test email from the Church Management System.</p>
                    <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>From:</strong> ${process.env.SMTP_USER}</p>
                    <p><strong>To:</strong> ${toEmail}</p>
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #0369a1;">
                            ✅ If you received this email, the email service is working correctly!
                        </p>
                    </div>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Test email sent successfully');
            console.log('📧 Message ID:', info.messageId);
            console.log('📧 Response:', info.response);
            console.log('📧 Accepted:', info.accepted);
            console.log('📧 Rejected:', info.rejected);
            
            return {
                success: true,
                messageId: info.messageId,
                response: info.response,
                accepted: info.accepted,
                rejected: info.rejected
            };
        } catch (error) {
            console.error('❌ Test email failed');
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error response:', error.response);
            
            return {
                success: false,
                error: error.message,
                code: error.code,
                response: error.response
            };
        }
    }
    async sendEmail({ to, subject, html, text = null, attachments = null }) {
        console.log('📧 Attempting to send email to:', to);
        
        try {
            const mailOptions = {
                from: `"St. Michael Eritrean Orthodox Tewahedo Church" <${process.env.SMTP_USER}>`,
                to: to,
                subject: subject,
                html: html
            };

            if (text) {
                mailOptions.text = text;
            }

            // Add attachments if provided
            if (attachments && Array.isArray(attachments)) {
                mailOptions.attachments = attachments;
                console.log(`📎 Adding ${attachments.length} attachment(s) to email`);
            }

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully:', info.messageId);
            return info;
            
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();