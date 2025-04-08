const { v4: uuidv4 } = require("uuid");
const User = require("@/models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { sendOTP, verifyOTP } = require("~/utils/otp.util");
const FederatedCredential = require("@/models/federatedCredential.model");

const { setExAsync, delAsync } = require("~/config/redis");

const admin = require("~/config/firebase-admin");

const register = async (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!email && !phone)
        return res.status(400).json({ message: "Email or phone is required" });

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser)
        return res.status(400).json({ message: "User already exists" });

    const newUser = new User({
        name,
        username: uuidv4(),
        email,
        phone,
        password,
    });

    const user = await newUser.save();
    if (!user)
        return res.status(500).json({ message: "Failed to create user" });
    
    res.json({ message: "Create Account successfully." });
};

const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.verified) return res.json({ message: "Already verified" });

        const isValid = await verifyOTP(user, otp);
        if (!isValid)
            return res.status(400).json({ message: "Invalid or expired OTP" });

        // Xác thực OTP thành công, cập nhật trạng thái verified của người dùng
        await user.updateOne({ verified: true });
        
        const payload = { id: user._id };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "15m",
        });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: "7d",
        });


        // Lưu refresh token vào Redis
        await delAsync(`refresh_token:${user._id}`); // Xóa refresh token cũ nếu có
        await delAsync(`access_token:${user._id}`); // Xóa access token cũ nếu có
        await setExAsync(
            `refresh_token:${user._id}`,
            refreshToken,
            7 * 24 * 60 * 60
        ); // Hết hạn sau 7 ngày

        return res.json({ accessToken, refreshToken });

    } catch (err) {
        console.error("Error verifying account:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};


const verifyPhone = async (req, res) => {

  const { phone, otp } = req.body; // Lấy số điện thoại và OTP từ request

  if (!phone || !otp) {
    return res.status(400).json({ message: 'Phone number and OTP are required.' });
  }

    try {

      const user = await User.findOne({ phone });

      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.verified) return res.json({ message: "Already verified" });

      const isValidOTP = await admin.auth().verifyPhoneNumber(phone, otp);

      if (!isValidOTP) {
        return res.status(400).json({ message: 'Invalid OTP.' });
      }    

    
      // Xác thực OTP thành công, cập nhật trạng thái verified của người dùng
      await user.updateOne({ verified: true });


      const payload = { id: user._id };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "15m",
        });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: "7d",
        });


        // Lưu refresh token vào Redis
        await delAsync(`refresh_token:${user._id}`); // Xóa refresh token cũ nếu có
        await delAsync(`access_token:${user._id}`); // Xóa access token cũ nếu có
        await setExAsync(
            `refresh_token:${user._id}`,
            refreshToken,
            7 * 24 * 60 * 60
        ); // Hết hạn sau 7 ngày

        return res.json({ accessToken, refreshToken });
    }
    catch (err) {
        console.error("Error verifying account:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};



const login = async (req, res, next) => {
    const { emailOrPhone, password } = req.body;

    try {
        const user = await User.findOne({
            $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
        });
        if (!user || !(await bcrypt.compare(password, user.password)))
            return res.status(400).json({ message: "Invalid credentials" });

        if (!user.verified)
        {

          if(user.email === emailOrPhone)
          {
            await sendOTP(user);

            return res.status(401).json({message: "Please check email to verify!"})
          }

          return res.status(401).json({message: "Please check sms to verify!"})

        }
            
        // if (user.isBlocked)
        //     return res.status(403).json({ message: "Account is blocked" });

        const payload = { id: user._id };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "15m",
        });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: "7d",
        });


        // Lưu refresh token vào Redis
        await delAsync(`refresh_token:${user._id}`); // Xóa refresh token cũ nếu có
        await delAsync(`access_token:${user._id}`); // Xóa access token cũ nếu có
        await setExAsync(
            `refresh_token:${user._id}`,
            refreshToken,
            7 * 24 * 60 * 60
        ); // Hết hạn sau 7 ngày


        res.cookie('refreshToken', refreshToken, {
          httpOnly: true, // Không cho phép JavaScript truy cập
          secure: true,   // Chỉ gửi qua HTTPS
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        });
        

        return res.json({ accessToken, refreshToken });
    } catch (error) {
        return next(error);
    }
};

const refreshAccessToken = async (req, res) => {
    const { refreshToken } = req.body;

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );
        const user = await User.findById(decoded.id);
        if (!user)
            return res.status(401).json({ message: "Invalid Reresh token" });

        const newAccessToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        // Lưu access token vào Redis
        await delAsync(`access_token:${user._id}`); // Xóa access token cũ nếu có
        await setExAsync(`access_token:${user._id}`, newAccessToken, 15 * 60); // Hết hạn sau 15 phút
        // Lưu refresh token vào Redis
        await delAsync(`refresh_token:${user._id}`); // Xóa refresh token cũ nếu có
        await setExAsync(`refresh_token:${user._id}`, refreshToken, 7 * 24 * 60 * 60); // Hết hạn sau 7 ngày

        return res.json({ accessToken: newAccessToken });
    } catch (error) {
        return res.status(401).json({ message: "Invalid Reresh token" });
    }
};

const verifyGoogleAccount = async (accessToken, refreshToken, profile, cb) => {
    try {
        const cred = await FederatedCredential.findOne({
            provider: "https://accounts.google.com",
            subject: profile.id,
        });

        const email = profile.emails[0].value;

        if (!cred) {
            const newUser = new User({
                name: profile.displayName,
                email: email,
                phone: profile.phone,
                password: profile.password,
                isVerified: true,
                googleId: profile.id,
            });
            const savedUser = await newUser.save();

            const newCred = new FederatedCredential({
                user_id: savedUser._id,
                provider: "https://accounts.google.com",
                subject: profile.id,
            });
            await newCred.save();

            const user = {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
            };
            return cb(null, user);
        }
        const user = await User.findById(cred.user_id);

        if (!user) {
            return cb(null, false);
        }
        return cb(null, user);
    } catch (err) {
        return cb(err);
    }
};

// export const refreshAccessToken = async (req, res) => {
//   const { refreshToken } = req.body;

//   try {
//     // Kiểm tra refresh token có hợp lệ và tồn tại trong Redis không
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
//     const userId = decoded.id;

//     // Kiểm tra token có tồn tại trong Redis hay không
//     client.get(`refresh_token:${userId}`, (err, storedRefreshToken) => {
//       if (err) {
//         return res.status(500).json({ message: 'Lỗi khi kiểm tra Redis' });
//       }

//       if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
//         return res.status(401).json({ message: 'Refresh token không hợp lệ' });
//       }

//       // Tạo access token mới
//       const newAccessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: '15m' });
//       return res.json({ accessToken: newAccessToken });
//     });
//   } catch (error) {
//     return res.status(401).json({ message: 'Refresh token không hợp lệ' });
//   }
// };

module.exports = {
    register,
    verifyEmail,
    login,
    refreshAccessToken,
    verifyGoogleAccount,
    verifyPhone,
};
