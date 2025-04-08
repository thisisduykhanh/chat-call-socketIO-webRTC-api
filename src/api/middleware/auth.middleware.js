// import passport from 'passport';
const passport = require('passport');
const protect = passport.authenticate('jwt', { session: false });

const admin = require('~/config/firebase-admin');


const verifyFirebaseToken = async (req, res, next) => {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) return res.status(401).json({ message: "Missing Firebase ID Token" });
  
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      req.firebaseUser = decoded;
      next();
    } catch {
      return res.status(403).json({ message: "Invalid Firebase ID Token" });
    }
  };


module.exports = {
    protect,
    verifyFirebaseToken,
};