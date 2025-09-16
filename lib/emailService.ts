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
}
