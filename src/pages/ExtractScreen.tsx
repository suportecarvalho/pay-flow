import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { BoletoListItem } from '../components/BoletoListItem';
import { BoletoTotalBar } from '../components/BoletoTotalBar';
import { SearchBar } from '../components/SearchBar';
import { formatCurrencyBRL } from '../data/initialBoletos';
import type { Boleto } from '../types/boleto';
import {
  getBoletoMonthYear,
  parseDueDateTimestamp,
} from '../utils/boletoParser';

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
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const paidBoletos = boletos
    .filter((b) => b.paid)
    .sort(
      (a, b) =>
        parseDueDateTimestamp(b.dueDate) - parseDueDateTimestamp(a.dueDate)
    );

  const monthFiltered =
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

  const filteredBoletos = search.trim()
    ? monthFiltered.filter((b) =>
        b.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : monthFiltered;

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

  const handleExportCsv = () => {
    if (filteredBoletos.length === 0) return;

    const header = 'Nome;Vencimento;Valor;Recorrente;Compartilhado';
    const rows = filteredBoletos.map((b) => {
      const safeName = `"${b.name.replace(/"/g, '""')}"`;
      const val = `R$ ${formatCurrencyBRL(b.value)}`;
      const rec = b.recurring ? 'Sim' : 'Não';
      const shared = b.sharedWith ? b.sharedWith : '-';
      return `${safeName};${b.dueDate};${val};${rec};${shared}`;
    });

    const total = filteredBoletos.reduce((sum, b) => sum + b.value, 0);
    rows.push(`"TOTAL";;R$ ${formatCurrencyBRL(total)};;`);

    const csvText = [header, ...rows].join('\r\n');
    const bytes = new Uint8Array(csvText.length);
    for (let i = 0; i < csvText.length; i++) {
      const code = csvText.charCodeAt(i);
      bytes[i] = code <= 0xff ? code : 0x3f;
    }

    const blob = new Blob([bytes], { type: 'text/csv;charset=windows-1252;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extrato-payboletos-${
      filterMode === 'month' ? monthLabel.replace('/', '-') : 'todos'
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
      <AppHeader
        userName={userName}
        avatarUrl={avatarUrl}
        onLogout={onLogout}
      />

      <main className="relative flex-1 min-h-0 flex flex-col pt-7 px-6 overflow-hidden">
        <div className="pb-3 border-b border-[#E3E3E6] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-lexend font-semibold text-[20px] text-[#585666]">
              Meus extratos
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-inter text-[13px] text-[#706E7A]">
                {filteredBoletos.length}{' '}
                {filteredBoletos.length === 1 ? 'pago' : 'pagos'}
              </span>
              {paidBoletos.length > 0 && !searchOpen && (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  title="Buscar no extrato"
                  aria-label="Abrir busca no extrato"
                  className="p-1.5 rounded-[5px] text-[#706E7A] hover:text-[#FF941A] hover:bg-[#FAFAFC] transition-colors cursor-pointer"
                >
                  <Search size={20} strokeWidth={1.9} />
                </button>
              )}
              {filteredBoletos.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCsv}
                  title="Exportar extrato CSV"
                  aria-label="Exportar extrato CSV"
                  className="p-1.5 rounded-[5px] border border-[#E3E3E6] bg-[#FAFAFC] text-[#585666] hover:text-[#FF941A] hover:border-[#FF941A]/40 transition-colors cursor-pointer"
                >
                  <Download size={14} strokeWidth={2} />
                </button>
              )}
            </div>
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

          {searchOpen && (
            <SearchBar
              value={search}
              onChange={setSearch}
              onClose={() => setSearchOpen(false)}
              placeholder="Buscar no extrato..."
            />
          )}
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          <div
            className={`min-h-0 max-h-[312px] no-scrollbar pt-2 pb-6 space-y-1 ${
              canScroll ? 'flex-1 overflow-y-auto' : 'overflow-hidden'
            }`}
          >
            {filteredBoletos.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#706E7A]">
                {search.trim()
                  ? 'Nenhum boleto encontrado.'
                  : filterMode === 'month'
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
