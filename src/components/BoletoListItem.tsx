import { Repeat } from 'lucide-react';
import { formatCurrencyBRL } from '../data/initialBoletos';
import type { Boleto } from '../types/boleto';
import { isBoletoOverdue } from '../utils/boletoParser';

interface BoletoListItemProps {
  boleto: Boleto;
  onSelect: (boleto: Boleto) => void;
}

export function BoletoListItem({ boleto, onSelect }: BoletoListItemProps) {
  const overdue = !boleto.paid && isBoletoOverdue(boleto.dueDate);

  return (
    <button
      type="button"
      onClick={() => onSelect(boleto)}
      className="w-full py-3.5 flex items-center justify-between text-left hover:bg-[#FAFAFC] active:bg-[#F3F3F7] rounded-[5px] px-1 -mx-1 transition-colors cursor-pointer"
    >
      <div className="min-w-0 pr-3">
        <div className="flex items-center gap-2">
          <p className="font-lexend font-semibold text-[17px] leading-[22px] text-[#585666] truncate">
            {boleto.name}
          </p>
          {overdue && (
            <span className="shrink-0 rounded-[4px] bg-[#E83F5B]/10 px-1.5 py-0.5 font-inter text-[11px] font-semibold text-[#E83F5B]">
              Atrasado
            </span>
          )}
          {boleto.recurring && (
            <span
              title="Conta recorrente mensal"
              className="shrink-0 inline-flex items-center gap-1 rounded-[4px] bg-[#FF941A]/10 px-1.5 py-0.5 font-inter text-[11px] font-medium text-[#FF941A]"
            >
              <Repeat size={11} strokeWidth={2} />
              Mensal
            </span>
          )}
        </div>
        <p
          className={`mt-1 font-inter text-[13px] ${
            overdue ? 'text-[#E83F5B]' : 'text-[#706E7A]'
          }`}
        >
          {overdue ? 'Venceu em ' : 'Vence em '}
          <span className="font-semibold">{boleto.dueDate}</span>
        </p>
      </div>

      <div
        className={`font-inter text-[16px] whitespace-nowrap ${
          overdue ? 'text-[#E83F5B]' : 'text-[#585666]'
        }`}
      >
        <span>R$ </span>
        <span className="font-semibold">{formatCurrencyBRL(boleto.value)}</span>
      </div>
    </button>
  );
}
