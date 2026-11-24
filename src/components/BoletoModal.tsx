import { Trash2 } from 'lucide-react';
import { formatCurrencyBRL } from '../data/initialBoletos';
import type { Boleto } from '../types/boleto';

interface BoletoModalProps {
  boleto: Boleto;
  onClose: () => void;
  onMarkPaid: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
  onDelete: (id: string) => void;
}

export function BoletoModal({
  boleto,
  onClose,
  onMarkPaid,
  onMarkUnpaid,
  onDelete,
}: BoletoModalProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Opções para ${boleto.name}`}
    >
      <div
        className="w-full bg-white pt-3 pb-5 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="mx-auto w-11 h-[2.5px] rounded-full bg-[#B1B0B8]/60 mb-7" />

        {/* Question */}
        <div className="px-8 text-center">
          <p className="font-lexend text-[20px] leading-[28px] text-[#585666] font-normal">
            O boleto <strong className="font-semibold">{boleto.name}</strong>
            <br />
            no valor de R${' '}
            <strong className="font-semibold">
              {formatCurrencyBRL(boleto.value)}
            </strong>
            <br />
            foi pago ?
          </p>

          {/* Action buttons */}
          <div className="mt-7 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onMarkUnpaid(boleto.id)}
              className="h-14 rounded-[5px] bg-[#FAFAFC] hover:bg-[#F2F2F7] active:scale-[0.99] transition-all border border-[#E3E3E6] font-inter text-[15px] text-[#666666] cursor-pointer"
            >
              Ainda não
            </button>

            <button
              type="button"
              onClick={() => onMarkPaid(boleto.id)}
              className="h-14 rounded-[5px] bg-[#FF941A] hover:bg-[#e88414] active:scale-[0.99] transition-all font-inter text-[15px] font-medium text-white cursor-pointer"
            >
              Sim
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-6 border-t border-[#E3E3E6]" />

        {/* Delete action */}
        <button
          type="button"
          onClick={() => onDelete(boleto.id)}
          className="pt-5 pb-2 flex items-center justify-center gap-2 text-[#E83F5B] hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer"
        >
          <Trash2 size={16} strokeWidth={1.8} />
          <span className="font-inter text-[15px]">Deletar boleto</span>
        </button>
      </div>
    </div>
  );
}
