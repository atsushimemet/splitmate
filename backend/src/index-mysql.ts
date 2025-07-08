import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { initializeDatabase, testConnection } from './database/connection-mysql';
import allocationRatioRoutes from './routes/allocationRatioRoutes-mysql';
import expenseRoutes from './routes/expenseRoutes-mysql';
import settlementRoutes from './routes/settlementRoutes-mysql';

declare global {
  namespace Express {
    interface User {
      // 必要に応じて型を拡張
      id?: string;
      displayName?: string;
      emails?: { value: string }[];
      photos?: { value: string }[];
      [key: string]: any;
    }
    interface Request {
      user?: User;
      isAuthenticated?: () => boolean;
      logout?: (callback: (err?: any) => void) => void;
    }
  }
}

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://splitmate-alb-906594043.ap-northeast-1.elb.amazonaws.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // 本番はtrue+HTTPS推奨
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
    service: 'SplitMate Backend API (MySQL)'
  });
});

// API ルート
app.use('/api/expenses', expenseRoutes);
app.use('/api/allocation-ratio', allocationRatioRoutes);
app.use('/api/settlements', settlementRoutes);

// Google認証関連のルート
passport.serializeUser((user: any, done) => {
  done(null, user);
});
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// 開発環境かどうかを判定
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const frontendUrl = isDevelopment ? 'http://localhost:3000' : 'http://splitmate-alb-906594043.ap-northeast-1.elb.amazonaws.com';
const backendUrl = isDevelopment ? 'http://localhost:3001' : 'http://splitmate-alb-906594043.ap-northeast-1.elb.amazonaws.com';

console.log('OAuth Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  isDevelopment,
  frontendUrl,
  backendUrl,
  callbackURL: `${backendUrl}/auth/google/callback`
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${backendUrl}/auth/google/callback`,
},
(accessToken, refreshToken, profile, done) => {
  console.log('OAuth callback received for user:', profile.displayName);
  return done(null, profile);
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
    // 認証成功時のリダイレクト先
    res.redirect(`${frontendUrl}/auth/callback`);
  }
);

// 認証状態確認
app.get('/auth/status', (req, res) => {
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
      console.log(`🚀 SplitMate Backend API (MySQL) is running on port ${PORT}`);
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
