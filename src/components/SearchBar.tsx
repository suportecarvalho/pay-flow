import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar conta...',
}: SearchBarProps) {
  return (
    <div className="mt-3 w-full h-10 rounded-full bg-[#FAFAFC] border border-[#E3E3E6] focus-within:border-[#FF941A] transition-colors px-3.5 flex items-center gap-2.5">
      <Search size={16} className="text-[#B1B0B8] shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 font-inter text-[13px] text-[#585666] placeholder:text-[#B1B0B8] bg-transparent outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="text-[#B1B0B8] hover:text-[#585666] transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
