const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOtpEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const isProd = process.env.NODE_ENV === "production";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// GOOGLE LOGIN
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google token required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (user) {
      // If user exists but not a google user, link the account
      if (!user.isGoogleUser) {
        user.isGoogleUser = true;
        user.googleId = googleId;
        user.profilePicture = picture;
        user.isVerified = true; // Google users are pre-verified
        await user.save();
      }
    } else {
      // Create new Google user
      user = await User.create({
        name,
        email,
        googleId,
        profilePicture: picture,
        isGoogleUser: true,
        isVerified: true,
      });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "5hr" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const cookieName = user.role === "admin" ? "admin_token" : "user_token";

    // Do NOT clear opposite session — allow both admin and user sessions to coexist

    res.cookie(cookieName, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      path: "/",
      maxAge: 5 * 60 * 60 * 1000
    });

    // Role-specific cookie for frontend detection (allows both sessions to coexist)
    const roleCookieName = user.role === "admin" ? "admin_role" : "user_role";
    res.cookie(roleCookieName, user.role, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      path: "/",
      maxAge: 5 * 60 * 60 * 1000
    });

    res.json({
      message: "Google login successful",
      token: accessToken,
      role: user.role,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role
      }
    });

  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    res.status(500).json({ message: "Google authentication failed" });
  }
};

// REGISTER
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpires: Date.now() + 5 * 60 * 1000,
      isVerified: false,
    });


    await sendOtpEmail(email, otp);

    res.status(201).json({
      message: "Signup successful. OTP sent.",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: "Account verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET CURRENT IDENTITY
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    res.json(user);
  } catch (error) {
    console.error("GET ME ERROR:", error);
    res.status(500).json({ message: "Authentication failure" });
  }
};

// LOGIN
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked" });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your account first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "5hr" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const cookieName = user.role === "admin" ? "admin_token" : "user_token";

    // Do NOT clear opposite session — allow both admin and user sessions to coexist

    res.cookie(cookieName, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      path: "/",
      maxAge: 5 * 60 * 60 * 1000
    });

    // Role-specific cookie for frontend detection (allows both sessions to coexist)
    const roleCookieName = user.role === "admin" ? "admin_role" : "user_role";
    res.cookie(roleCookieName, user.role, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      path: "/",
    maxAge: 5 * 60 * 60 * 1000
    });

    res.json({ 
      message: "Login successful", 
      token: accessToken,
      role: user.role,
      user: {
        _id: user._id,
        role: user.role,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 5 * 60 * 1000; // 5 mins
    await user.save();

    await sendOtpEmail(email, otp);

    res.json({ message: "Reset OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
// RESEND OTP (FORGOT PASSWORD)
exports.resendForgotOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};




// RESEND OTP (Signup)
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Account already verified" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};




// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      user.resetOtp !== otp ||
      user.resetOtpExpires < Date.now()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// REFRESH ACCESS TOKEN
exports.refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const newAccessToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: "5hr" }
    );

    const cookieName = decoded.role === "admin" ? "admin_token" : "user_token";

    res.cookie(cookieName, newAccessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      path: "/",
      maxAge: 5 * 60 * 60 * 1000,
    });

    res.json({ message: "Access token refreshed" });

  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};
// LOGOUT (Context-specific: only clear the session for the current side)
exports.logoutUser = (req, res) => {
  const logoutRole = req.body.role || "user";

  if (logoutRole === "admin") {
    res.clearCookie("admin_token", { path: "/" });
    res.clearCookie("admin_role", { path: "/" });
    res.clearCookie("admin_id", { path: "/" });
  } else {
    res.clearCookie("user_token", { path: "/" });
    res.clearCookie("user_role", { path: "/" });
    res.clearCookie("user_id", { path: "/" });
  }

  // Legacy cleanup
  res.clearCookie("token", { path: "/" });
  res.clearCookie("role", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });

  res.json({ message: "Logged out successfully" });
};

