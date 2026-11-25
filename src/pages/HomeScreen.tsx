import { Search } from 'lucide-react';
import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { BoletoListItem } from '../components/BoletoListItem';
import { BoletoTotalBar } from '../components/BoletoTotalBar';
import type { Boleto } from '../types/boleto';
import { parseDueDateTimestamp } from '../utils/boletoParser';

interface HomeScreenProps {
  userName?: string;
  avatarUrl?: string;
  onLogout?: () => void;
  boletos: Boleto[];
  onSelectBoleto: (boleto: Boleto) => void;
}

export function HomeScreen({
  userName = 'Tiago',
  avatarUrl,
  onLogout,
  boletos,
  onSelectBoleto,
}: HomeScreenProps) {
  const [search, setSearch] = useState('');

  const unpaidBoletos = boletos
    .filter((b) => !b.paid)
    .sort(
      (a, b) =>
        parseDueDateTimestamp(a.dueDate) - parseDueDateTimestamp(b.dueDate)
    );

  const visibleBoletos = search.trim()
    ? unpaidBoletos.filter((b) =>
        b.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : unpaidBoletos;

  const canScroll = visibleBoletos.length > 4;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
      <AppHeader
        userName={userName}
        avatarUrl={avatarUrl}
        onLogout={onLogout}
      >
        {/* Overlapping Dark Summary Card */}
        <div className="absolute left-6 right-6 -bottom-9 bg-[#585666] rounded-[5px] px-5 py-4 flex items-center shadow-sm">
          {/* White Barcode Icon */}
          <div className="relative w-[56px] h-[38px] flex items-center justify-center shrink-0">
            <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t-[2px] border-l-[2px] border-white/90 rounded-tl-[1px]" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t-[2px] border-r-[2px] border-white/90 rounded-tr-[1px]" />
            <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-[2px] border-l-[2px] border-white/90 rounded-bl-[1px]" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-[2px] border-r-[2px] border-white/90 rounded-br-[1px]" />

            <svg viewBox="0 0 56 36" className="w-[78%] h-[70%]" fill="none">
              <rect x="2" y="3" width="2" height="30" fill="white" />
              <rect x="6" y="3" width="1.2" height="30" fill="white" />
              <rect x="9" y="3" width="2.8" height="30" fill="white" />
              <rect x="13.5" y="3" width="1.4" height="30" fill="white" />
              <rect x="17" y="3" width="2.2" height="30" fill="white" />
              <rect x="21" y="3" width="3" height="30" fill="white" />
              <rect x="26" y="3" width="1.4" height="30" fill="white" />
              <rect x="29" y="3" width="2.4" height="30" fill="white" />
              <rect x="33" y="3" width="1.4" height="30" fill="white" />
              <rect x="36.5" y="3" width="2.8" height="30" fill="white" />
              <rect x="41" y="3" width="1.4" height="30" fill="white" />
              <rect x="44" y="3" width="2" height="30" fill="white" />
              <rect x="48" y="3" width="2.6" height="30" fill="white" />
              <rect x="52" y="3" width="1.8" height="30" fill="white" />
            </svg>
          </div>

          <div className="w-[1px] h-8 bg-white/25 mx-5 shrink-0" />

          <p className="font-inter text-[13px] leading-[19px] text-white">
            Você tem{' '}
            <strong className="font-semibold">
              {unpaidBoletos.length}{' '}
              {unpaidBoletos.length === 1 ? 'boleto' : 'boletos'}
            </strong>
            <br />
            cadastrados para pagar
          </p>
        </div>
      </AppHeader>

      {/* Meus boletos list */}
      <main className="relative flex-1 min-h-0 flex flex-col pt-14 px-6 overflow-hidden">
        <div className="pb-3 border-b border-[#E3E3E6] shrink-0 flex items-center justify-between gap-3">
          <h2 className="font-lexend font-semibold text-[20px] text-[#585666] shrink-0">
            Meus boletos
          </h2>

          {unpaidBoletos.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FAFAFC] border border-[#E3E3E6] rounded-[5px] px-2.5 py-1 max-w-[155px]">
              <Search size={13} className="text-[#B1B0B8] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar boleto"
                className="w-full font-inter text-[12px] text-[#585666] placeholder:text-[#B1B0B8] bg-transparent outline-none"
              />
            </div>
          )}
        </div>

        {/* Soft bottom fade above total bar */}
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          <div
            className={`min-h-0 max-h-[312px] no-scrollbar pt-2 pb-6 space-y-1 ${
              canScroll ? 'flex-1 overflow-y-auto' : 'overflow-hidden'
            }`}
          >
            {visibleBoletos.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#706E7A]">
                {search.trim()
                  ? 'Nenhum boleto encontrado.'
                  : 'Nenhum boleto pendente no momento.'}
              </div>
            ) : (
              visibleBoletos.map((boleto) => (
                <BoletoListItem
                  key={boleto.id}
                  boleto={boleto}
                  onSelect={onSelectBoleto}
                />
              ))
            )}
          </div>

          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </div>

        <BoletoTotalBar label="Total a pagar" boletos={visibleBoletos} />
      </main>
    </div>
  );
}
