import { ArrowLeft, FileText, Wallet, XCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { parseBoletoBarcode } from '../utils/boletoParser';

interface InsertBoletoScreenProps {
  initialBarcode?: string;
  onCancel: () => void;
  onSubmit: (data: {
    name: string;
    dueDate: string;
    value: number;
    barcode?: string;
  }) => void;
}

function formatDueDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10) / 100;
  return `R$ ${cents.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseCurrencyInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function InsertBoletoScreen({
  initialBarcode = '',
  onCancel,
  onSubmit,
}: InsertBoletoScreenProps) {
  const parsedInitial = initialBarcode
    ? parseBoletoBarcode(initialBarcode)
    : null;

  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [valueText, setValueText] = useState(() =>
    parsedInitial?.value
      ? `R$ ${parsedInitial.value.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : ''
  );
  const [barcode, setBarcode] = useState(initialBarcode);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const numericValue = parseCurrencyInput(valueText);

    if (!trimmedName) {
      setError('Informe o nome do boleto.');
      return;
    }
    if (dueDate.trim().length < 6) {
      setError('Informe uma data de vencimento válida (DD/MM/AA).');
      return;
    }
    if (numericValue <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }

    onSubmit({
      name: trimmedName,
      dueDate: dueDate.trim(),
      value: numericValue,
      barcode: barcode.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 flex flex-col bg-white overflow-hidden"
    >
      {/* Top Bar */}
      <div className="pt-11 px-6 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Voltar"
          className="w-10 h-10 -ml-2 flex items-center justify-center text-[#B1B0B8] hover:text-[#585666] transition-colors cursor-pointer"
        >
          <ArrowLeft size={22} strokeWidth={1.8} />
        </button>
      </div>

      {/* Title */}
      <h1 className="mt-5 font-lexend font-semibold text-[20px] leading-[26px] text-[#585666] text-center">
        Preencha os dados
        <br />
        do boleto
      </h1>

      {/* Form Fields */}
      <div className="flex-1 px-6 pt-9 space-y-5 overflow-y-auto no-scrollbar">
        {/* Nome do boleto */}
        <div className="flex items-center border-b border-[#E3E3E6] pb-3">
          <div className="w-11 flex items-center justify-center border-r border-[#E3E3E6] pr-3 mr-4 shrink-0">
            <FileText size={20} strokeWidth={1.8} className="text-[#FF941A]" />
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="Nome do boleto"
            className="flex-1 font-inter text-[15px] text-[#585666] placeholder:text-[#B1B0B8] bg-transparent outline-none"
          />
        </div>

        {/* Vencimento */}
        <div className="flex items-center border-b border-[#E3E3E6] pb-3">
          <div className="w-11 flex items-center justify-center border-r border-[#E3E3E6] pr-3 mr-4 shrink-0">
            <XCircle size={20} strokeWidth={1.8} className="text-[#FF941A]" />
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={dueDate}
            onChange={(e) => {
              setDueDate(formatDueDateMask(e.target.value));
              if (error) setError('');
            }}
            placeholder="Vencimento"
            className="flex-1 font-inter text-[15px] text-[#585666] placeholder:text-[#B1B0B8] bg-transparent outline-none"
          />
        </div>

        {/* Valor */}
        <div className="flex items-center border-b border-[#E3E3E6] pb-3">
          <div className="w-11 flex items-center justify-center border-r border-[#E3E3E6] pr-3 mr-4 shrink-0">
            <Wallet size={20} strokeWidth={1.8} className="text-[#FF941A]" />
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={valueText}
            onChange={(e) => {
              setValueText(formatCurrencyInput(e.target.value));
              if (error) setError('');
            }}
            placeholder="Valor"
            className="flex-1 font-inter text-[15px] text-[#585666] placeholder:text-[#B1B0B8] bg-transparent outline-none"
          />
        </div>

        {/* Código */}
        <div className="flex items-center border-b border-[#E3E3E6] pb-3">
          <div className="w-11 flex items-center justify-center border-r border-[#E3E3E6] pr-3 mr-4 shrink-0">
            <svg width="20" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
              <rect x="1" y="2" width="1.8" height="14" fill="#FF941A" />
              <rect x="4.5" y="2" width="1.2" height="14" fill="#FF941A" />
              <rect x="7.5" y="2" width="2.4" height="14" fill="#FF941A" />
              <rect x="11.5" y="2" width="1.4" height="14" fill="#FF941A" />
              <rect x="14.5" y="2" width="2.2" height="14" fill="#FF941A" />
              <rect x="18.2" y="2" width="1.4" height="14" fill="#FF941A" />
              <rect x="21" y="2" width="2" height="14" fill="#FF941A" />
            </svg>
          </div>
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Código"
            className="flex-1 font-inter text-[15px] text-[#585666] placeholder:text-[#B1B0B8] bg-transparent outline-none"
          />
        </div>

        {error && (
          <p className="text-center font-inter text-[13px] text-[#E83F5B] pt-1">
            {error}
          </p>
        )}
      </div>

      {/* Bottom Two-Button Bar */}
      <div className="h-[64px] border-t border-[#E3E3E6] grid grid-cols-2 shrink-0 bg-white">
        <button
          type="button"
          onClick={onCancel}
          className="border-r border-[#E3E3E6] flex items-center justify-center font-inter text-[15px] text-[#666666] hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors cursor-pointer"
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="flex items-center justify-center font-inter text-[15px] font-medium text-[#FF941A] hover:bg-[#FAFAFC] active:bg-[#FFF5E8] transition-colors cursor-pointer"
        >
          Cadastrar
        </button>
      </div>
    </form>
  );
}
