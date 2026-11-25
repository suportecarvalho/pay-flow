import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onClose,
  placeholder = 'Buscar conta...',
}: SearchBarProps) {
  return (
    <div className="mt-3 w-full h-9 rounded-full bg-[#FAFAFC] border border-[#FF941A]/60 px-3.5 flex items-center gap-2">
      <Search size={15} className="text-[#FF941A] shrink-0" />
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 font-inter text-[13px] text-[#585666] placeholder:text-[#B1B0B8] bg-transparent outline-none"
      />
      <button
        type="button"
        onClick={() => {
          onChange('');
          onClose();
        }}
        aria-label="Fechar busca"
        className="text-[#B1B0B8] hover:text-[#585666] transition-colors cursor-pointer"
      >
        <X size={15} />
      </button>
    </div>
  );
}
