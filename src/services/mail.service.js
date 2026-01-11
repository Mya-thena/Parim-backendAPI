const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const getFromEmail = () => {
  return process.env.MAIL_FROM || 'devkraft.xyz@gmail.com'; // Fallback if env is missing
};

exports.sendOtpMail = async (to, otp) => {
  const msg = {
    to,
    from: getFromEmail(),
    subject: "Parim Pro OTP Verification",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px 0; color: #333;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #2c3e50; padding: 20px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Parim Pro</h1>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: #2c3e50; margin-bottom: 10px;">Verification Code</h2>
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">Please use the following one-time password to verify your account.</p>
            <div style="background-color: #f8f9fa; border: 1px dashed #dee2e6; border-radius: 4px; padding: 15px; display: inline-block; margin-bottom: 30px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2c3e50;">${otp}</span>
            </div>
            <p style="font-size: 14px; color: #999;">This code is valid for <strong>10 minutes</strong>.</p>
          </div>
          <div style="background-color: #fdfdfd; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #aaa; margin: 0;">If you did not request this code, please ignore this email or contact support if you have concerns.</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('SendGrid Error (OTP):', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error; // Re-throw to be caught by controller
  }
};

exports.sendPasswordResetMail = async (to, otp) => {
  const msg = {
    to,
    from: getFromEmail(),
    subject: "Parim Pro Password Reset",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px 0; color: #333;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #e74c3c; padding: 20px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Password Reset</h1>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: #2c3e50; margin-bottom: 10px;">Reset Code</h2>
            <p style="font-size: 16px; color: #666; margin-bottom: 30px;">You requested a password reset. Use the code below to reset your password.</p>
            <div style="background-color: #fdf2f1; border: 1px dashed #e74c3c; border-radius: 4px; padding: 15px; display: inline-block; margin-bottom: 30px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #c0392b;">${otp}</span>
            </div>
            <p style="font-size: 14px; color: #999;">This code is valid for <strong>10 minutes</strong>.</p>
          </div>
          <div style="background-color: #fdfdfd; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #aaa; margin: 0;">If you did not request this, please secure your account immediately.</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent to ${to}`);
  } catch (error) {
    console.error('SendGrid Error (Reset):', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error; // Re-throw for controller handling
  }
};
