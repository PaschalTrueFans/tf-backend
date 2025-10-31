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
}
