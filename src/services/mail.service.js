const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

exports.sendOtpMail = async (to, otp) => {
  await transporter.sendMail({
    from: `"Parim Pro" <${process.env.MAIL_USER}>`,
    to,
    subject: "Parim Pro OTP Verification",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Parim Pro Verification</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `
  });
};
