interface PayFlowLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function PayFlowBarcodeIcon({ size = 'lg' }: PayFlowLogoProps) {
  const iconSizes = {
    sm: 'w-12 h-9',
    md: 'w-[74px] h-[52px]',
    lg: 'w-[92px] h-[66px]',
  };

  return (
    <div className={`relative flex items-center justify-center ${iconSizes[size]}`}>
      {/* Top-left corner */}
      <span className="absolute top-0 left-0 w-3.5 h-3.5 border-t-[2.5px] border-l-[2.5px] border-[#FF941A] rounded-tl-[2px]" />
      {/* Top-right corner */}
      <span className="absolute top-0 right-0 w-3.5 h-3.5 border-t-[2.5px] border-r-[2.5px] border-[#FF941A] rounded-tr-[2px]" />
      {/* Bottom-left corner */}
      <span className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-[2.5px] border-l-[2.5px] border-[#FF941A] rounded-bl-[2px]" />
      {/* Bottom-right corner */}
      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-[2.5px] border-r-[2.5px] border-[#FF941A] rounded-br-[2px]" />

      {/* Barcode SVG */}
      <svg
        viewBox="0 0 76 48"
        className="w-[82%] h-[74%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="4" y="4" width="2.2" height="40" fill="#B1B0B8" />
        <rect x="8.5" y="4" width="1.4" height="40" fill="#B1B0B8" />
        <rect x="12" y="4" width="3.2" height="40" fill="#B1B0B8" />
        <rect x="17.5" y="4" width="1.6" height="40" fill="#B1B0B8" />
        <rect x="21.5" y="4" width="2.5" height="40" fill="#B1B0B8" />
        <rect x="26.5" y="4" width="3.8" height="40" fill="#B1B0B8" />
        <rect x="32.5" y="4" width="1.5" height="40" fill="#B1B0B8" />
        <rect x="36.5" y="4" width="2.8" height="40" fill="#B1B0B8" />
        <rect x="41.5" y="4" width="1.6" height="40" fill="#B1B0B8" />
        <rect x="45.5" y="4" width="3.4" height="40" fill="#B1B0B8" />
        <rect x="51" y="4" width="1.6" height="40" fill="#B1B0B8" />
        <rect x="55" y="4" width="2.4" height="40" fill="#B1B0B8" />
        <rect x="59.5" y="4" width="1.5" height="40" fill="#B1B0B8" />
        <rect x="63.5" y="4" width="3.2" height="40" fill="#B1B0B8" />
        <rect x="69" y="4" width="2.2" height="40" fill="#B1B0B8" />

        {/* Horizontal scan line */}
        <rect x="0" y="22.5" width="76" height="3.2" rx="1.6" fill="#585666" />
      </svg>
    </div>
  );
}

export function PayFlowLogo({ size = 'lg' }: PayFlowLogoProps) {
  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-[34px] leading-none',
  };

  return (
    <div className="flex flex-col items-center select-none">
      <PayFlowBarcodeIcon size={size} />

      {/* PayFlow Wordmark */}
      <div className={`mt-5 font-lexend tracking-tight ${textSizes[size]}`}>
        <span className="font-semibold text-[#FF941A]">Pay</span>
        <span className="font-normal text-[#585666]">Flow</span>
      </div>
    </div>
  );
}
