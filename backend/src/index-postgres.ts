import pgSession from 'connect-pg-simple';
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
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET',
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  PORT: process.env.PORT || 'NOT SET'
});

// Additional debugging for production
if (process.env.NODE_ENV === 'production') {
  console.log('🔍 PRODUCTION DEBUG INFO:');
  console.log('- Frontend URL:', process.env.FRONTEND_URL);
  console.log('- Backend URL:', process.env.BACKEND_URL);
  console.log('- Google Client ID (first 10 chars):', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) || 'NOT SET');
  console.log('- Session Secret (first 10 chars):', process.env.SESSION_SECRET?.substring(0, 10) || 'NOT SET');
}

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
const corsOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  frontendUrl
];

// 本番環境では、Netlifyのドメインを明示的に追加
if (process.env.NODE_ENV === 'production') {
  corsOrigins.push('https://soft-malabi-2005f0.netlify.app');
}

console.log('🔧 CORS CONFIGURATION:');
console.log('- Origins:', corsOrigins);
console.log('- Credentials:', true);

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
const PgSession = pgSession(session);

// セッションストアの設定
const sessionStore = new PgSession({
  pool: pool,
  tableName: 'user_sessions',
  createTableIfMissing: true
});

console.log('🔧 SESSION STORE CONFIGURATION:');
console.log('- Store type:', process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'Memory');
console.log('- Database URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

const sessionConfig = {
  store: process.env.NODE_ENV === 'production' ? sessionStore : undefined,
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' | 'strict', // Cross-site for production
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser handle domain
  },
  name: 'connect.sid'
};

console.log('🔧 SESSION CONFIGURATION:');
console.log('- Store:', sessionConfig.store ? 'PostgreSQL' : 'Memory');
console.log('- Secure:', sessionConfig.cookie.secure);
console.log('- HttpOnly:', sessionConfig.cookie.httpOnly);
console.log('- SameSite:', sessionConfig.cookie.sameSite);
console.log('- MaxAge:', sessionConfig.cookie.maxAge);

app.use(session(sessionConfig));

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
  console.log('🔧 GOOGLE OAUTH STRATEGY SETUP:');
  console.log('- Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...');
  console.log('- Callback URL:', `${backendUrl}/auth/google/callback`);
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${backendUrl}/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🎯 Google OAuth callback received:', {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value
      });
      
      // ユーザー情報をデータベースに保存
      const userResult = await UserService.upsertGoogleUser(profile);
      if (userResult.success) {
        console.log('✅ User saved to database:', userResult.data?.name);
        return done(null, profile);
      } else {
        console.error('❌ Failed to save user to database:', userResult.error);
        return done(null, profile); // 認証は成功として扱う
      }
    } catch (error) {
      console.error('💥 Error in Google OAuth callback:', error);
      return done(error, null);
    }
  }));
} else {
  console.error('❌ GOOGLE OAUTH NOT CONFIGURED - Missing CLIENT_ID or CLIENT_SECRET');
}

// Passport serialization
passport.serializeUser((user: any, done) => {
  console.log('🔐 SERIALIZE USER - Saving user to session:', user?.displayName);
  console.log('🔐 SERIALIZE USER - User ID:', user?.id);
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  console.log('🔓 DESERIALIZE USER - Loading user from session:', user?.displayName);
  console.log('🔓 DESERIALIZE USER - User ID:', user?.id);
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

app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${frontendUrl}/login`,
    session: true
  }),
  (req: any, res) => {
    console.log('🎯 AUTH CALLBACK - Authentication successful');
    console.log('🎯 AUTH CALLBACK - Session ID:', req.sessionID);
    console.log('🎯 AUTH CALLBACK - Is authenticated:', req.isAuthenticated ? req.isAuthenticated() : 'N/A');
    console.log('🎯 AUTH CALLBACK - User in session:', req.user?.displayName);
    console.log('🎯 AUTH CALLBACK - User ID:', req.user?.id);
    console.log('🎯 AUTH CALLBACK - Session data:', req.session);
    console.log('🎯 AUTH CALLBACK - Session store type:', req.session.store ? 'PostgreSQL' : 'Memory');
    console.log('🎯 AUTH CALLBACK - Cookie settings:', req.session.cookie);
    console.log('🎯 AUTH CALLBACK - Redirect URL will be:', `${frontendUrl}/auth/callback`);
    
    // セッションを明示的に保存
    req.session.save((err: any) => {
      if (err) {
        console.error('❌ Session save error:', err);
      } else {
        console.log('✅ Session saved successfully');
      }
      res.redirect(`${frontendUrl}/auth/callback`);
    });
  }
);

app.post('/auth/logout', (req: any, res) => {
  req.logout((err: any) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Session destroy failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

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
