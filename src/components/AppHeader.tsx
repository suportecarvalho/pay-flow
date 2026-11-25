import { useState, type ReactNode } from 'react';

interface AppHeaderProps {
  userName?: string;
  avatarUrl?: string;
  onLogout?: () => void;
  children?: ReactNode;
}

export function AppHeader({
  userName = 'Tiago',
  avatarUrl,
  onLogout,
  children,
}: AppHeaderProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <header
      className={`relative bg-gradient-to-b from-[#FF941A] to-[#FFA436] pt-11 px-6 shrink-0 ${
        children ? 'pb-16' : 'pb-7'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-lexend text-[20px] leading-tight text-white font-normal">
            Olá, <span className="font-semibold">{userName}</span>
          </h1>
          <p className="mt-1 font-inter text-[13px] text-white/90">
            Mantenha suas contas em dia
          </p>
        </div>

        {/* User Avatar (click to sign out) */}
        <button
          type="button"
          onClick={onLogout}
          title={onLogout ? 'Sair da conta' : userName}
          className="w-12 h-12 rounded-full ring-2 ring-white/25 bg-[#585666] overflow-hidden shrink-0 shadow-sm flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
        >
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={userName}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg viewBox="0 0 48 48" className="w-full h-full" aria-label={userName}>
              <rect width="48" height="48" fill="#3D3B48" />
              <circle cx="24" cy="19" r="8" fill="#E5C1A1" />
              <path
                d="M15 17C15 11.5 19 8 24 8C29 8 33 11.5 33 17H15Z"
                fill="#6B7280"
              />
              <path
                d="M11 44C11 35.5 16.8 30 24 30C31.2 30 37 35.5 37 44H11Z"
                fill="#1F2937"
              />
            </svg>
          )}
        </button>
      </div>

      {children}
    </header>
  );
}
