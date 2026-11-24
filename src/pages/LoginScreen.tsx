import { useState } from 'react';
import { PayFlowBarcodeIcon } from '../components/PayFlowLogo';
import { signInWithGoogle } from '../services/googleAuth';
import type { AuthUser } from '../types/user';

interface LoginScreenProps {
  onLogin: (user: AuthUser) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onLogin(user);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao entrar com Google.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Top Orange Header + Person */}
      <div className="relative w-full h-[41%] bg-gradient-to-b from-[#FF941A] to-[#FFA436] flex items-end justify-center overflow-visible">
        {/* Hero Person Image */}
        {!imgError ? (
          <img
            src="/login-person.jpg"
            alt="Usuária organizando boletos no celular"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover object-top select-none pointer-events-none"
          />
        ) : (
          <div className="w-40 h-56 rounded-t-full bg-white/15 mb-0" />
        )}

        {/* White bottom fade so the person blends smoothly into the white body */}
        <div className="pointer-events-none absolute -bottom-[72px] inset-x-0 h-[96px] bg-gradient-to-t from-white via-white/95 to-transparent z-10" />

        {/* Left Floating Badge: [+] */}
        <div
          className="absolute left-[18%] -bottom-5 z-20 w-11 h-11 rounded-[5px] bg-[#585666] flex items-center justify-center shadow-md"
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect
              x="3.5"
              y="3.5"
              width="17"
              height="17"
              rx="2.5"
              stroke="white"
              strokeWidth="1.8"
            />
            <path
              d="M12 8.5V15.5M8.5 12H15.5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Right Floating Badge: [Document] */}
        <div
          className="absolute right-[13%] top-[56%] z-20 w-11 h-11 rounded-[5px] bg-[#585666] flex items-center justify-center shadow-md"
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect
              x="4.5"
              y="3.5"
              width="15"
              height="17"
              rx="2"
              stroke="white"
              strokeWidth="1.8"
            />
            <path
              d="M8.5 8.5H15.5M8.5 12H15.5M8.5 15.5H12.5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Bottom White Content */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-between pt-16 pb-10 px-10">
        <div className="flex flex-col items-center">
          <PayFlowBarcodeIcon size="md" />

          <h1 className="mt-6 font-lexend font-semibold text-[32px] leading-[40px] text-[#585666] text-center tracking-tight">
            Organize seus
            <br />
            boletos em um
            <br />
            só lugar
          </h1>
        </div>

        <div className="w-full flex flex-col items-center">
          {error && (
            <p className="mb-3 text-center font-inter text-[12px] leading-[17px] text-[#E83F5B]">
              {error}
            </p>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full h-14 bg-[#FAFAFC] hover:bg-[#F2F2F7] active:scale-[0.99] disabled:opacity-60 transition-all border border-[#E3E3E6] rounded-[5px] flex items-center cursor-pointer"
          >
            <div className="w-14 h-full flex items-center justify-center border-r border-[#E3E3E6]">
              {/* Google G Logo */}
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            </div>
            <span className="flex-1 text-center font-inter text-[15px] font-normal text-[#666666]">
              {loading ? 'Conectando...' : 'Entrar com Google'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
