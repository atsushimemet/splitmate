import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { initializeDatabase, testConnection } from './database/connection-postgres';
import allocationRatioRoutes from './routes/allocationRatioRoutes-postgres';
import expenseRoutes from './routes/expenseRoutes-postgres';
import settlementRoutes from './routes/settlementRoutes-postgres';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(helmet());
// 開発環境かどうかを判定
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const frontendUrl = process.env.FRONTEND_URL || (isDevelopment ? 'http://localhost:3000' : 'http://splitmate-alb-111394655.ap-northeast-1.elb.amazonaws.com');
const backendUrl = process.env.BACKEND_URL || (isDevelopment ? 'http://localhost:3001' : 'http://splitmate-alb-111394655.ap-northeast-1.elb.amazonaws.com');

const corsOrigins = isDevelopment 
  ? ['http://localhost:3000', 'http://localhost:5173']
  : [frontendUrl];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200 // レガシーブラウザ対応
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // 開発環境では false に設定
    httpOnly: true, // XSS攻撃を防ぐためにhttpOnlyを明示的に設定
    sameSite: 'lax', // 開発環境では lax に設定
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// リクエストログ
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SplitMate Backend API (PostgreSQL)'
  });
});

// API ルート
app.use('/api/expenses', expenseRoutes);
app.use('/api/allocation-ratio', allocationRatioRoutes);
app.use('/api/settlements', settlementRoutes);

// Google認証関連のルート
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

console.log('==================== ENVIRONMENT DEBUG ====================');
console.log('Environment Variables:', {
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL,
  BACKEND_URL: process.env.BACKEND_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET',
  SESSION_SECRET: process.env.SESSION_SECRET ? 'SET' : 'NOT SET'
});
console.log('Computed Values:', {
  isDevelopment,
  frontendUrl,
  backendUrl,
  callbackURL: `${backendUrl}/auth/google/callback`
});
console.log('==========================================================');

console.log('=== GOOGLE STRATEGY CONFIGURATION ===');
console.log('ClientID:', process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'NOT SET');
console.log('ClientSecret:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('CallbackURL:', `${backendUrl}/auth/google/callback`);
console.log('======================================');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${backendUrl}/auth/google/callback`,
},
(accessToken, refreshToken, profile, done) => {
  console.log('OAuth callback received for user:', profile.displayName);
  console.log('OAuth scopes granted:', profile);
  console.log('Access token available:', !!accessToken);
  
  // アクセストークンとリフレッシュトークンをプロフィールに追加
  const userWithTokens = {
    ...profile,
    accessToken,
    refreshToken
  };
  
  return done(null, userWithTokens);
}
));

// Google認証開始
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// Google認証コールバック
app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${frontendUrl}/`,
    session: true
  }),
  (req, res) => {
    console.log('🎯 AUTH CALLBACK - Authentication successful');
    console.log('🎯 AUTH CALLBACK - Session ID:', (req as any).sessionID);
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
app.get('/auth/status', (req, res) => {
  console.log('AUTH STATUS CHECK:');
  console.log('- Session ID:', (req as any).sessionID);
  console.log('- Session data:', (req as any).session);
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
app.get('/auth/logout', (req, res) => {
  if (req.logout) {
    req.logout(() => {
      res.json({ success: true });
    });
  } else {
    res.json({ success: false, error: 'Logout not supported' });
  }
});

// 404 ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// エラーハンドラー
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// サーバー起動
async function startServer() {
  try {
    // データベース接続テスト
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    // データベース初期化
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 SplitMate Backend API (PostgreSQL) is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`💰 Expense API: http://localhost:${PORT}/api/expenses`);
      console.log(`⚖️  Allocation Ratio API: http://localhost:${PORT}/api/allocation-ratio`);
      console.log(`💳 Settlement API: http://localhost:${PORT}/api/settlements`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 
