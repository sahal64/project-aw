const nodemailer = require("nodemailer");

const sendOtpEmail = async (toEmail, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"AeroWatch" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "AeroWatch OTP Verification",
      html: `
        <h2>Your OTP Code</h2>
        <p>Your verification code is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for 5 minutes.</p>
      `
    });

    console.log("OTP email sent to:", toEmail);
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    throw error; // 🔥 VERY IMPORTANT
  }
};

module.exports = sendOtpEmail;
