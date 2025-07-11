import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool, { seedInitialData } from './database/connection-postgres';
import allocationRatioRoutes from './routes/allocationRatioRoutes-postgres';
import expenseRoutes from './routes/expenseRoutes-postgres';
import settlementRoutes from './routes/settlementRoutes-postgres';
import { UserService } from './services/userService-postgres';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables with validation
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Debug environment variables
console.log('==================== ENVIRONMENT DEBUG ====================');
console.log('Environment Variables:', {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL,
  BACKEND_URL: process.env.BACKEND_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
});

const isDevelopment = process.env.NODE_ENV === 'development';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

console.log('Computed Values:', {
  isDevelopment,
  frontendUrl,
  backendUrl,
  callbackURL: `${backendUrl}/auth/google/callback`
});
console.log('==========================================================');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", backendUrl],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth strategy
console.log('=== GOOGLE STRATEGY CONFIGURATION ===');
console.log('ClientID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('ClientSecret:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('CallbackURL:', `${backendUrl}/auth/google/callback`);
console.log('======================================');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${backendUrl}/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth callback received:', {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value
      });
      
      // ユーザー情報をデータベースに保存
      const userResult = await UserService.upsertGoogleUser(profile);
      if (userResult.success) {
        console.log('User saved to database:', userResult.data?.name);
        return done(null, profile);
      } else {
        console.error('Failed to save user to database:', userResult.error);
        return done(null, profile); // 認証は成功として扱う
      }
    } catch (error) {
      console.error('Error in Google OAuth callback:', error);
      return done(error, null);
    }
  }));
}

// Passport serialization
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/expenses', expenseRoutes);
app.use('/api/allocation-ratio', allocationRatioRoutes);
app.use('/api/settlements', settlementRoutes);

// Auth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google認証コールバック
app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${frontendUrl}/`,
    session: true
  }),
  (req: any, res) => {
    console.log('🎯 AUTH CALLBACK - Authentication successful');
    console.log('🎯 AUTH CALLBACK - Session ID:', req.sessionID);
    console.log('🎯 AUTH CALLBACK - Is authenticated:', req.isAuthenticated ? req.isAuthenticated() : 'N/A');
    console.log('🎯 AUTH CALLBACK - User in session:', req.user?.displayName);
    console.log('🎯 AUTH CALLBACK - FRONTEND_URL env var:', process.env.FRONTEND_URL);
    console.log('🎯 AUTH CALLBACK - Computed frontendUrl:', frontendUrl);
    console.log('🎯 AUTH CALLBACK - Redirect URL will be:', `${frontendUrl}/auth/callback`);
    
    // 認証成功時のリダイレクト先
    res.redirect(`${frontendUrl}/auth/callback`);
  }
);

// 認証状態確認
app.get('/auth/status', (req: any, res) => {
  console.log('AUTH STATUS CHECK:');
  console.log('- Session ID:', req.sessionID);
  console.log('- Session data:', req.session);
  console.log('- isAuthenticated function exists:', typeof req.isAuthenticated);
  console.log('- isAuthenticated result:', req.isAuthenticated ? req.isAuthenticated() : 'function not available');
  console.log('- User data:', req.user);
  console.log('- Cookie header:', req.headers.cookie);
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

// ログアウト
app.get('/auth/logout', (req: any, res) => {
  if (req.logout) {
    req.logout(() => {
      res.json({ success: true });
    });
  } else {
    res.json({ success: true });
  }
});

// Start server
async function startServer() {
  try {
    // Seed initial data
    await seedInitialData();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${frontendUrl}`);
      console.log(`🔧 Backend URL: ${backendUrl}`);
      console.log(`🔍 Health check: ${backendUrl}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

startServer(); 
