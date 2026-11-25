import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { BoletoListItem } from '../components/BoletoListItem';
import { BoletoTotalBar } from '../components/BoletoTotalBar';
import type { Boleto } from '../types/boleto';
import { getBoletoMonthYear } from '../utils/boletoParser';

interface ExtractScreenProps {
  userName?: string;
  avatarUrl?: string;
  onLogout?: () => void;
  boletos: Boleto[];
  onSelectBoleto: (boleto: Boleto) => void;
}

const MONTH_NAMES_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function ExtractScreen({
  userName = 'Tiago',
  avatarUrl,
  onLogout,
  boletos,
  onSelectBoleto,
}: ExtractScreenProps) {
  const now = new Date();
  const [filterMode, setFilterMode] = useState<'all' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const paidBoletos = boletos.filter((b) => b.paid);

  const filteredBoletos =
    filterMode === 'all'
      ? paidBoletos
      : paidBoletos.filter((b) => {
          const parsed = getBoletoMonthYear(b.dueDate);
          return (
            parsed !== null &&
            parsed.month === selectedMonth &&
            parsed.year === selectedYear
          );
        });

  const canScroll = filteredBoletos.length > 4;

  const stepMonth = (delta: number) => {
    let baseMonth = selectedMonth;
    let baseYear = selectedYear;

    if (filterMode === 'all' && delta < 0) {
      baseMonth = now.getMonth() + 1;
      baseYear = now.getFullYear();
    }

    let nextMonth = baseMonth + delta;
    let nextYear = baseYear;

    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
    setFilterMode('month');
  };

  const monthLabel = `${MONTH_NAMES_PT[selectedMonth - 1]}/${String(
    selectedYear
  ).slice(-2)}`;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
      <AppHeader
        userName={userName}
        avatarUrl={avatarUrl}
        onLogout={onLogout}
      />

      <main className="relative flex-1 min-h-0 flex flex-col pt-7 px-6 overflow-hidden">
        <div className="pb-3 border-b border-[#E3E3E6] shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-lexend font-semibold text-[20px] text-[#585666]">
              Meus extratos
            </h2>
            <span className="font-inter text-[13px] text-[#706E7A]">
              {filteredBoletos.length}{' '}
              {filteredBoletos.length === 1 ? 'pago' : 'pagos'}
            </span>
          </div>

          {/* Month Filter Bar */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-[5px] font-inter text-[12px] font-medium transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-[#FF941A] text-white'
                  : 'bg-[#FAFAFC] text-[#706E7A] border border-[#E3E3E6] hover:bg-[#F2F2F7]'
              }`}
            >
              Todos
            </button>

            <div
              className={`flex items-center rounded-[5px] border transition-colors ${
                filterMode === 'month'
                  ? 'border-[#FF941A] bg-[#FF941A]/10 text-[#FF941A]'
                  : 'border-[#E3E3E6] bg-[#FAFAFC] text-[#585666]'
              }`}
            >
              <button
                type="button"
                onClick={() => stepMonth(-1)}
                aria-label="Mês anterior"
                className="px-2 py-1 hover:opacity-75 transition-opacity cursor-pointer"
              >
                <ChevronLeft size={15} strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('month')}
                className="px-2 py-1 font-inter text-[12px] font-semibold cursor-pointer"
              >
                {monthLabel}
              </button>

              <button
                type="button"
                onClick={() => stepMonth(1)}
                aria-label="Próximo mês"
                className="px-2 py-1 hover:opacity-75 transition-opacity cursor-pointer"
              >
                <ChevronRight size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          <div
            className={`min-h-0 max-h-[312px] no-scrollbar pt-2 pb-6 space-y-1 ${
              canScroll ? 'flex-1 overflow-y-auto' : 'overflow-hidden'
            }`}
          >
            {filteredBoletos.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#706E7A]">
                {filterMode === 'month'
                  ? `Nenhum boleto pago em ${monthLabel}.`
                  : 'Nenhum boleto pago ainda.'}
              </div>
            ) : (
              filteredBoletos.map((boleto) => (
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

        <BoletoTotalBar label="Total pago" boletos={filteredBoletos} />
      </main>
    </div>
  );
}
