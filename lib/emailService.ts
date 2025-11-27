import emailjs from '@emailjs/browser';

// Types
interface EmailResponse {
  success: boolean;
  message?: string;
  response?: any;
  error?: string;
}

interface TemplateParams extends Record<string, unknown> {
  app_name?: string;
  user_name?: string;
  message?: string;
  otp_code?: string;
  from_name?: string;
  email?: string;
  to_email?: string;
  to_name?: string;
  user_email?: string;
}

// EmailJS configuration
const EMAILJS_PUBLIC_KEY: string = 'WSlKCCVO5JxkNDyX_';
const EMAILJS_SERVICE_ID: string = 'service_gzdhkwr';
const EMAILJS_TEMPLATE_ID: string = 'template_08f4wvf';
const EMAILJS_DISABLED_TEMPLATE_ID: string = 'template_5e53t3i';

export class EmailService {
  static async sendOTPEmail(userEmail: string, otpCode: string, userName: string = 'User'): Promise<EmailResponse> {
    try {
      // Initialize EmailJS before sending
      emailjs.init(EMAILJS_PUBLIC_KEY);
      
      console.log('📧 EmailJS Config:', {
        service: 'service_***',
        template: 'template_***',
        publicKey: '***'
      });

      const templateParams: TemplateParams = {
        app_name: 'InternshipGo',
        user_name: userName,
        message: `Your OTP code is: ${otpCode}`,
        otp_code: otpCode,
        from_name: 'InternshipGo Security Team',
        email: userEmail
      };

      // Mask sensitive data in logs
      const maskedParams: TemplateParams = { 
        app_name: templateParams.app_name,
        user_name: templateParams.user_name,
        message: 'Your OTP code is: ******',
        otp_code: '******',
        from_name: templateParams.from_name,
        email: '***@***.***'
      };
      console.log('📧 Template Params:', maskedParams);

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      console.log('📧 EmailJS Response:', response);

      return {
        success: true,
        message: 'OTP email sent successfully',
        response
      };
    } catch (error: any) {
      console.error('OTP email sending error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        status: error.status,
        text: error.text,
        stack: error.stack
      });
      return {
        success: false,
        error: error.text || error.message || 'Failed to send OTP email'
      };
    }
  }

  static async sendTestOTP(email: string): Promise<EmailResponse> {
    try {
      const templateParams: TemplateParams = {
        to_email: email,
        to_name: 'Test User',
        message: 'Your OTP code is: 123456',
        otp_code: '123456',
        user_email: email,
        user_name: 'Test User'
      };

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      return {
        success: true,
        message: 'Test OTP sent successfully',
        response
      };
    } catch (error: any) {
      console.error('Test OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send test OTP'
      };
    }
  }

  // Backward compatibility method
  static async sendPasswordResetEmail(userEmail: string, resetToken: string, userName: string = 'User'): Promise<EmailResponse> {
    // Use the resetToken (OTP) from backend instead of generating new one
    return this.sendOTPEmail(userEmail, resetToken, userName);
  }

  // Send account disabled email
  static async sendAccountDisabledEmail(
    userEmail: string, 
    userName: string = 'User',
    reason?: string
  ): Promise<EmailResponse> {
    try {
      // Validate email
      if (!userEmail || !userEmail.trim()) {
        console.error('❌ Invalid email address provided:', userEmail);
        return {
          success: false,
          error: 'Invalid email address'
        };
      }

      const recipientEmail = userEmail.trim();
      
      // Initialize EmailJS before sending
      emailjs.init(EMAILJS_PUBLIC_KEY);
      
      console.log('📧 Sending account disabled email to:', recipientEmail);
      console.log('📧 Recipient name:', userName);

      // EmailJS uses these common variable names for recipient email
      // Make sure your EmailJS template "To Email" field uses one of these:
      // - {{to_email}} (most common)
      // - {{email}}
      // - {{user_email}}
      // - {{reply_to}} (if configured)
      const templateParams: TemplateParams = {
        app_name: 'InternshipGo',
        user_name: userName,
        user_email: recipientEmail,
        to_email: recipientEmail,  // Primary recipient email variable
        to_name: userName,
        from_name: 'InternshipGo Administration',
        message: reason || 'Your account has been disabled by an administrator. Please contact support if you believe this is an error.',
        email: recipientEmail,  // Alternative recipient email variable
        reply_to: recipientEmail  // Sometimes used for reply-to
      };

      // Log actual email being sent (for debugging - remove in production)
      console.log('📧 ACTUAL RECIPIENT EMAIL:', recipientEmail);
      console.log('📧 Template Params (email values):', {
        to_email: templateParams.to_email,
        email: templateParams.email,
        user_email: templateParams.user_email,
        reply_to: templateParams.reply_to
      });

      // Mask sensitive data in logs
      const maskedParams: TemplateParams = { 
        app_name: templateParams.app_name,
        user_name: templateParams.user_name,
        user_email: '***@***.***',
        to_email: '***@***.***',
        to_name: templateParams.to_name,
        from_name: templateParams.from_name,
        message: templateParams.message,
        email: '***@***.***'
      };
      console.log('📧 Template Params (masked):', maskedParams);

      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_DISABLED_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      console.log('📧 EmailJS Response:', response);
      console.log('✅ Email sent successfully to:', recipientEmail);

      return {
        success: true,
        message: 'Account disabled email sent successfully',
        response
      };
    } catch (error: any) {
      console.error('❌ Account disabled email sending error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        status: error.status,
        text: error.text,
        stack: error.stack
      });
      return {
        success: false,
        error: error.text || error.message || 'Failed to send account disabled email'
      };
    }
  }
}
