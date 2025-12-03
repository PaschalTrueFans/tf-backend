import { SMTP } from './env';
import * as fs from 'fs';
import { Logger } from './logger';
import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    Logger.info('EmailService initialized...');

    // Create SMTP transporter with cPanel email credentials
    this.transporter = nodemailer.createTransport({
      host: SMTP.HOST,
      port: SMTP.PORT,
      secure: SMTP.SECURE, // true for 465, false for other ports
      auth: {
        user: SMTP.USER,
        pass: SMTP.PASSWORD,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        Logger.error('SMTP connection error:', error);
      } else {
        Logger.info('SMTP server is ready to take our messages');
      }
    });
  }

  async SendMail(email: string, otp: string): Promise<void> {
    try {
      // Read the email template
      const htmlTemplate = fs.readFileSync('src/emailTemplates/otpVerification.html', 'utf-8');

      // Replace placeholders in template
      const modifiedHtml = htmlTemplate
        .replace('{{DATE}}', new Date().toLocaleDateString())
        .replace('{{otp}}', otp);

      Logger.info('Sending mail to:', email);

      // Send email using nodemailer
      const info = await this.transporter.sendMail({
        from: `"${SMTP.FROM_NAME}" <${SMTP.FROM_EMAIL}>`,
        to: email,
        subject: 'OTP Verification',
        html: modifiedHtml,
      });

      Logger.info('Email sent successfully:', info.messageId);
    } catch (error) {
      Logger.error('Error sending email:', error);
      throw error;
    }
  }

  async SendVerificationEmail(email: string, verificationLink: string): Promise<void> {
    try {
      // Read the email template
      const htmlTemplate = fs.readFileSync('src/emailTemplates/emailVerification.html', 'utf-8');

      // Replace placeholders in template
      const modifiedHtml = htmlTemplate
        .replace('{{DATE}}', new Date().toLocaleDateString())
        .replace(/{{VERIFICATION_LINK}}/g, verificationLink);

      Logger.info('Sending verification email to:', email);

      // Send email using nodemailer
      const info = await this.transporter.sendMail({
        from: `"${SMTP.FROM_NAME}" <${SMTP.FROM_EMAIL}>`,
        to: email,
        subject: 'Verify Your Email Address - TRU-FANS',
        html: modifiedHtml,
      });

      Logger.info('Verification email sent successfully:', info.messageId);
    } catch (error) {
      Logger.error('Error sending verification email:', error);
      throw error;
    }
  }

  async SendPlainEmail(email: string, subject: string, message: string): Promise<void> {
    try {
      Logger.info('Sending plain email', { email, subject });

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; padding: 16px;">
          <h2 style="margin-bottom: 12px;">${subject}</h2>
          <p style="white-space: pre-wrap; line-height: 1.5;">${message}</p>
          <p style="margin-top: 24px; color: #888; font-size: 12px;">Sent on ${new Date().toLocaleString()}</p>
        </div>
      `;

      const info = await this.transporter.sendMail({
        from: `"${SMTP.FROM_NAME}" <${SMTP.FROM_EMAIL}>`,
        to: email,
        subject,
        text: message,
        html: htmlBody,
      });

      Logger.info('Plain email sent successfully:', info.messageId);
    } catch (error) {
      Logger.error('Error sending plain email:', error);
      throw error;
    }
  }

  async SendWelcomeEmail(email: string, userName: string, platformUrl: string): Promise<void> {
    try {
      // Read the email template
      const htmlTemplate = fs.readFileSync('src/emailTemplates/welcomeEmail.html', 'utf-8');

      // Replace placeholders in template
      const modifiedHtml = htmlTemplate
        .replace('{{DATE}}', new Date().toLocaleDateString())
        .replace('{{NAME}}', userName)
        .replace(/{{PLATFORM_URL}}/g, platformUrl);

      Logger.info('Sending welcome email to:', email);

      // Send email using nodemailer
      const info = await this.transporter.sendMail({
        from: `"${SMTP.FROM_NAME}" <${SMTP.FROM_EMAIL}>`,
        to: email,
        subject: 'Welcome to TRU-FANS! 🎉',
        html: modifiedHtml,
      });

      Logger.info('Welcome email sent successfully:', info.messageId);
    } catch (error) {
      Logger.error('Error sending welcome email:', error);
      // Don't throw - welcome email failures shouldn't block registration
    }
  }

  async SendPasswordChangedEmail(email: string, ipAddress = 'Unknown', supportUrl: string): Promise<void> {
    try {
      // Read the email template
      const htmlTemplate = fs.readFileSync('src/emailTemplates/passwordChanged.html', 'utf-8');

      // Replace placeholders in template
      const currentDate = new Date().toLocaleString();
      const modifiedHtml = htmlTemplate
        .replace(/{{DATE}}/g, currentDate)
        .replace('{{EMAIL}}', email)
        .replace('{{IP_ADDRESS}}', ipAddress)
        .replace(/{{SUPPORT_URL}}/g, supportUrl);

      Logger.info('Sending password changed email to:', email);

      // Send email using nodemailer
      const info = await this.transporter.sendMail({
        from: `"${SMTP.FROM_NAME}" <${SMTP.FROM_EMAIL}>`,
        to: email,
        subject: 'Your Password Has Been Changed - TRU-FANS',
        html: modifiedHtml,
      });

      Logger.info('Password changed email sent successfully:', info.messageId);
    } catch (error) {
      Logger.error('Error sending password changed email:', error);
      // Don't throw - notification email failures shouldn't block password change
    }
  }
}

