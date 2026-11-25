import { AppHeader } from '../components/AppHeader';
import { BoletoListItem } from '../components/BoletoListItem';
import { BoletoTotalBar } from '../components/BoletoTotalBar';
import type { Boleto } from '../types/boleto';

interface ExtractScreenProps {
  userName?: string;
  avatarUrl?: string;
  onLogout?: () => void;
  boletos: Boleto[];
  onSelectBoleto: (boleto: Boleto) => void;
}

export function ExtractScreen({
  userName = 'Tiago',
  avatarUrl,
  onLogout,
  boletos,
  onSelectBoleto,
}: ExtractScreenProps) {
  const paidBoletos = boletos.filter((b) => b.paid);
  const canScroll = paidBoletos.length > 4;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
      <AppHeader userName={userName} avatarUrl={avatarUrl} onLogout={onLogout} />

      <main className="relative flex-1 min-h-0 flex flex-col pt-7 px-6 overflow-hidden">
        <div className="pb-4 border-b border-[#E3E3E6] shrink-0 flex items-center justify-between">
          <h2 className="font-lexend font-semibold text-[20px] text-[#585666]">
            Meus extratos
          </h2>
          <span className="font-inter text-[13px] text-[#706E7A]">
            {paidBoletos.length} {paidBoletos.length === 1 ? 'pago' : 'pagos'}
          </span>
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          <div
            className={`min-h-0 max-h-[312px] no-scrollbar pt-2 pb-6 space-y-1 ${
              canScroll ? 'flex-1 overflow-y-auto' : 'overflow-hidden'
            }`}
          >
            {paidBoletos.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#706E7A]">
                Nenhum boleto pago ainda.
              </div>
            ) : (
              paidBoletos.map((boleto) => (
                <BoletoListItem
                  key={boleto.id}
                  boleto={boleto}
                  onSelect={onSelectBoleto}
                />
              ))
            )}
          </div>

          {/* Soft bottom fade above total bar */}
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </div>

        <BoletoTotalBar label="Total pago" boletos={paidBoletos} />
      </main>
    </div>
  );
}
