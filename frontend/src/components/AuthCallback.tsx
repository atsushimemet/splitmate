import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AuthCallback = () => {
  const { checkAuthStatus, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('AuthCallback: コンポーネントがマウントされました');
    console.log('AuthCallback: 現在のURL:', location.pathname + location.search);
    
    const handleCallback = async () => {
      console.log('AuthCallback: 認証処理を開始します');
      try {
        // AuthContextの状態を更新
        await checkAuthStatus();
        
        // 状態更新を少し待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // デバッグ: 認証状態を確認
        console.log('AuthCallback: 認証状態チェック後 - isAuthenticated:', isAuthenticated);
        
        // 認証状態を更新後、トップページにリダイレクト
        console.log('AuthCallback: トップページにリダイレクトします');
        navigate('/', { replace: true });
      } catch (error) {
        console.error('AuthCallback: 認証エラー:', error);
        // エラー時もトップページにリダイレクト
        console.log('AuthCallback: エラー発生のためトップページにリダイレクトします');
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [checkAuthStatus, navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">認証処理中...</p>
      </div>
    </div>
  );
}; 
