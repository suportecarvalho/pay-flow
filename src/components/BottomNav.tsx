export type ActiveTab = 'home' | 'extract';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onAddBoleto: () => void;
}

export function BottomNav({ activeTab, onChangeTab, onAddBoleto }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="relative z-30 h-[72px] bg-white flex items-center justify-around px-8 shrink-0"
    >
      {/* Home Tab */}
      <button
        type="button"
        onClick={() => onChangeTab('home')}
        aria-label="Meus boletos"
        className="w-12 h-12 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 10.25L12 3L21 10.25V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V10.25Z"
            fill={activeTab === 'home' ? '#FF941A' : 'none'}
            stroke={activeTab === 'home' ? '#FF941A' : '#706E7A'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 21V14.5H14.5V21"
            stroke={activeTab === 'home' ? '#FFFFFF' : '#706E7A'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Center Add Button */}
      <button
        type="button"
        onClick={onAddBoleto}
        aria-label="Cadastrar boleto"
        className="w-14 h-14 rounded-[5px] bg-[#FF941A] hover:bg-[#e88414] active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
      </button>

      {/* Extract Tab */}
      <button
        type="button"
        onClick={() => onChangeTab('extract')}
        aria-label="Meus extratos"
        className="w-12 h-12 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect
            x="4.5"
            y="3.5"
            width="15"
            height="17"
            rx="2"
            fill={activeTab === 'extract' ? '#FF941A' : 'none'}
            stroke={activeTab === 'extract' ? '#FF941A' : '#585666'}
            strokeWidth="1.8"
          />
          <path
            d="M8.5 8.5H15.5M8.5 12H15.5M8.5 15.5H12.5"
            stroke={activeTab === 'extract' ? '#FFFFFF' : '#585666'}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </nav>
  );
}
