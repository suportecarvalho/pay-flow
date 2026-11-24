import { formatCurrencyBRL } from '../data/initialBoletos';
import type { Boleto } from '../types/boleto';

interface BoletoTotalBarProps {
  label: string;
  boletos: Boleto[];
}

export function BoletoTotalBar({ label, boletos }: BoletoTotalBarProps) {
  const total = boletos.reduce((sum, boleto) => sum + boleto.value, 0);

  return (
    <div className="shrink-0 border-t border-[#E3E3E6] py-3.5 bg-white flex items-center justify-between">
      <span className="font-lexend font-semibold text-[16px] text-[#585666]">
        {label}
      </span>

      <div className="font-inter text-[16px] text-[#585666] whitespace-nowrap">
        <span>R$ </span>
        <span className="font-semibold">{formatCurrencyBRL(total)}</span>
      </div>
    </div>
  );
}
