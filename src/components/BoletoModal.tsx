import {
  Check,
  Copy,
  FileCheck2,
  Paperclip,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { formatCurrencyBRL } from '../data/initialBoletos';
import type { Boleto } from '../types/boleto';
import { isPixPayload } from '../utils/boletoParser';

interface BoletoModalProps {
  boleto: Boleto;
  onClose: () => void;
  onMarkPaid: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
  onEdit: (boleto: Boleto) => void;
  onDelete: (id: string) => void;
  onAttachReceipt: (id: string, file: File) => Promise<void>;
}

export function BoletoModal({
  boleto,
  onClose,
  onMarkPaid,
  onMarkUnpaid,
  onEdit,
  onDelete,
  onAttachReceipt,
}: BoletoModalProps) {
  const [copied, setCopied] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  const isPix = isPixPayload(boleto.barcode);

  const handleCopyBarcode = async () => {
    if (!boleto.barcode) return;
    try {
      await navigator.clipboard.writeText(boleto.barcode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleReceiptChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingReceipt(true);
    setReceiptError('');
    try {
      await onAttachReceipt(boleto.id, file);
    } catch (err) {
      setReceiptError(
        err instanceof Error ? err.message : 'Erro ao anexar comprovante.'
      );
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleViewReceipt = () => {
    if (!boleto.receiptUrl) return;
    const win = window.open();
    if (win) {
      if (boleto.receiptUrl.startsWith('data:image/')) {
        win.document.write(
          `<img src="${boleto.receiptUrl}" style="max-width:100%;height:auto;" />`
        );
      } else {
        win.location.href = boleto.receiptUrl;
      }
    }
  };

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

        {/* Hidden Receipt Input */}
        <input
          ref={receiptInputRef}
          type="file"
          accept="image/*,application/pdf,.pdf"
          onChange={(e) => void handleReceiptChange(e)}
          className="hidden"
        />

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

        {/* Receipt Row */}
        <div className="mt-5 px-8 flex items-center justify-center gap-3">
          {boleto.receiptUrl ? (
            <>
              <button
                type="button"
                onClick={handleViewReceipt}
                className="flex items-center gap-1.5 font-inter text-[13px] font-medium text-emerald-600 hover:opacity-80 cursor-pointer"
              >
                <FileCheck2 size={15} strokeWidth={2} />
                <span>Ver comprovante</span>
              </button>
              <span className="text-[#E3E3E6]">|</span>
              <button
                type="button"
                disabled={uploadingReceipt}
                onClick={() => receiptInputRef.current?.click()}
                className="font-inter text-[12px] text-[#706E7A] hover:text-[#585666] cursor-pointer"
              >
                {uploadingReceipt ? 'Enviando...' : 'Trocar'}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={uploadingReceipt}
              onClick={() => receiptInputRef.current?.click()}
              className="flex items-center gap-1.5 font-inter text-[13px] text-[#706E7A] hover:text-[#FF941A] transition-colors cursor-pointer"
            >
              <Paperclip size={14} strokeWidth={1.8} />
              <span>
                {uploadingReceipt
                  ? 'Anexando comprovante...'
                  : 'Anexar comprovante'}
              </span>
            </button>
          )}
        </div>

        {receiptError && (
          <p className="mt-2 px-6 text-center font-inter text-[12px] text-[#E83F5B]">
            {receiptError}
          </p>
        )}

        {/* Divider */}
        <div className="mt-4 border-t border-[#E3E3E6]" />

        {/* Secondary actions: Copy, Edit, Delete */}
        <div className="pt-4 pb-1 px-6 flex items-center justify-around gap-2">
          {boleto.barcode && (
            <button
              type="button"
              onClick={() => void handleCopyBarcode()}
              className="py-1.5 px-2 flex items-center justify-center gap-1.5 text-[#585666] hover:text-[#FF941A] transition-colors cursor-pointer"
            >
              {copied ? (
                <Check size={16} strokeWidth={2} className="text-emerald-600" />
              ) : (
                <Copy size={16} strokeWidth={1.8} />
              )}
              <span className="font-inter text-[14px]">
                {copied ? 'Copiado!' : isPix ? 'Copiar Pix' : 'Copiar código'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(boleto)}
            className="py-1.5 px-2 flex items-center justify-center gap-1.5 text-[#585666] hover:text-[#FF941A] transition-colors cursor-pointer"
          >
            <Pencil size={15} strokeWidth={1.8} />
            <span className="font-inter text-[14px]">Editar</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(boleto.id)}
            className="py-1.5 px-2 flex items-center justify-center gap-1.5 text-[#E83F5B] hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer"
          >
            <Trash2 size={16} strokeWidth={1.8} />
            <span className="font-inter text-[14px]">Deletar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
