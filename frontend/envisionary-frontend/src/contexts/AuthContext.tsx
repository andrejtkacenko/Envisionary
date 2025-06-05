import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGoogleConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setIsGoogleConnected: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        'http://localhost:8000/api/auth/check',
        {
          withCredentials: true,
        },
      );

      if (response.data?.isAuthenticated && response.data?.user) {
        setIsAuthenticated(true);
        setUser({
          id: response.data.user.id,
          username: response.data.user.username,
          email: response.data.user.email,
        });

        // Проверяем статус Google
        try {
          const googleStatus = await axios.get(
            'http://localhost:8000/api/google/status/',
            {
              withCredentials: true,
            },
          );
          setIsGoogleConnected(googleStatus.data?.connected || false);
        } catch (googleError) {
          console.error('Google status check failed:', googleError);
          setIsGoogleConnected(false);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsGoogleConnected(false);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      setIsGoogleConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Сначала получаем CSRF токен
      await axios.get('http://localhost:8000/api/get-csrf-token/', {
        withCredentials: true,
      });

      // Затем выполняем логин с CSRF токеном
      await axios.post(
        'http://localhost:8000/api/login/',
        { email, password },
        {
          withCredentials: true,
          headers: {
            'X-CSRFToken': getCookie('csrftoken'), // Функция для получения CSRF из cookies
          },
        },
      );

      await checkAuth(); // Проверяем аутентификацию после успешного логина
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        'http://localhost:8000/api/logout/',
        {},
        { withCredentials: true },
      );
      setIsAuthenticated(false);
      setUser(null);
      setIsGoogleConnected(false);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isGoogleConnected,
        login,
        logout,
        checkAuth,
        setIsGoogleConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};