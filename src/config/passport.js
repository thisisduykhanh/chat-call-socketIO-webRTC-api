
require('dotenv').config();
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const GoogleStrategy = require('passport-google-oauth20');
const User = require('@/models/user.model');

const { verifyGoogleAccount } = require('@/controllers/auth.controller');


passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'secret'
}, async (payload, done) => {

    try {
      // Check if the user exists in the database
    const user = await User.findById(payload.id);
    if (!user) return done(null, false);
    return done(null, user);

    }
    catch (error) {
      return done(error, false);
    }
}));

passport.use(new GoogleStrategy.Strategy({
  clientID: process.env.GOOGLE_CLIENT_ID || (() => { throw new Error('GOOGLE_CLIENT_ID is not defined'); })(),
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || (() => { throw new Error('GOOGLE_CLIENT_SECRET is not defined'); })(),
  callbackURL: '/api/auth/google/callback',
  scope: ['profile', 'email'],
  state: true,
}, verifyGoogleAccount));



passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (error) {
		done(error);
	}
});