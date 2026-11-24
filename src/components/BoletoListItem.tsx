import { formatCurrencyBRL } from '../data/initialBoletos';
import type { Boleto } from '../types/boleto';

interface BoletoListItemProps {
  boleto: Boleto;
  onSelect: (boleto: Boleto) => void;
}

export function BoletoListItem({ boleto, onSelect }: BoletoListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(boleto)}
      className="w-full py-3.5 flex items-center justify-between text-left hover:bg-[#FAFAFC] active:bg-[#F3F3F7] rounded-[5px] px-1 -mx-1 transition-colors cursor-pointer"
    >
      <div>
        <p className="font-lexend font-semibold text-[17px] leading-[22px] text-[#585666]">
          {boleto.name}
        </p>
        <p className="mt-1 font-inter text-[13px] text-[#706E7A]">
          Vence em <span className="font-semibold">{boleto.dueDate}</span>
        </p>
      </div>

      <div className="font-inter text-[16px] text-[#585666] whitespace-nowrap">
        <span>R$ </span>
        <span className="font-semibold">{formatCurrencyBRL(boleto.value)}</span>
      </div>
    </button>
  );
}
