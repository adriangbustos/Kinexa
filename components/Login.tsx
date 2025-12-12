import React from 'react';
import { Button } from './Button';
import { UserProfile } from '../types';
import { loginWithGoogle } from '../services/firebaseService';

// Simple SVG Google Icon
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.766 12.2764C23.766 11.4607 23.6999 10.6406 23.5588 9.83807H12.24V14.4591H18.7217C18.4528 15.9494 17.5885 17.2678 16.323 18.1056V21.1039H20.19C22.4608 19.0139 23.766 15.9274 23.766 12.2764Z" fill="#FFFFFF" />
    <path d="M12.2401 24.0008C15.4766 24.0008 18.2059 22.9382 20.1945 21.1039L16.3275 18.1055C15.2517 18.8375 13.8627 19.252 12.2445 19.252C9.11388 19.252 6.45946 17.1399 5.50705 14.3003H1.5166V17.3912C3.55371 21.4434 7.7029 24.0008 12.2401 24.0008Z" fill="#FFFFFF" /> {/* Tinted for dark bg logic, ideally would be multi-color but for #2d3829 bg white works best visually or strict brand colors */}
    <path d="M5.50253 14.3003C5.01298 12.8099 5.01298 11.1961 5.50253 9.70575V6.61481H1.51649C-0.18551 10.0056 -0.18551 14.0004 1.51649 17.3912L5.50253 14.3003Z" fill="#FFFFFF" />
    <path d="M12.2401 4.74966C13.9509 4.7232 15.6044 5.36697 16.8434 6.54867L20.2695 3.12262C18.1004 1.0855 15.2208 -0.034466 12.2401 0.000808666C7.7029 0.000808666 3.55371 2.55822 1.5166 6.61481L5.50264 9.70575C6.45064 6.86173 9.10947 4.74966 12.2401 4.74966Z" fill="#FFFFFF" />
  </svg>
);

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await loginWithGoogle();
      onLoginSuccess(user);
    } catch (err) {
      setError("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[#f5f2f0]/90 backdrop-blur-sm p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-md border border-white/20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2d3829] text-white mb-6 shadow-lg shadow-[#2d3829]/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-[#3d382a] mb-2">Kinexa</h1>
          <p className="text-[#726951] font-medium">Your AI-powered recovery companion</p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleLogin} 
            fullWidth 
            disabled={isLoading}
            icon={<GoogleIcon />}
          >
            {isLoading ? "Connecting..." : "Continue with Google"}
          </Button>
          
          <div className="relative py-4">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
             <div className="relative flex justify-center text-sm"><span className="px-2 bg-[#f5f2f0] text-gray-500">Secure Access</span></div>
          </div>
          
          {error && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <p className="text-xs text-center text-[#8f8570] mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};