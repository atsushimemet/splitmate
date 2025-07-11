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
