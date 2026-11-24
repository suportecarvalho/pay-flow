import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerScreenProps {
  onBack: () => void;
  onManualInsert: () => void;
  onScanSuccess: (barcode: string) => void;
}

export function BarcodeScannerScreen({
  onBack,
  onManualInsert,
  onScanSuccess,
}: BarcodeScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanFailed, setScanFailed] = useState(false);
  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;

  useEffect(() => {
    if (scanFailed) return;

    let controls: IScannerControls | undefined;
    let active = true;

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Câmera indisponível (use HTTPS ou localhost).');
        return;
      }

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.ITF,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 150,
      });

      try {
        if (!videoRef.current) return;
        controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result) => {
            if (!active || !result) return;
            const text = result.getText();
            if (text) {
              active = false;
              controls?.stop();
              onScanSuccessRef.current(text);
            }
          }
        );
        if (active) {
          setHasCamera(true);
          setCameraError('');
        }
      } catch {
        if (active) {
          setCameraError('Não foi possível acessar a câmera.');
        }
      }
    }

    startScanner();

    return () => {
      active = false;
      controls?.stop();
    };
  }, [scanFailed]);

  // Show "Tente novamente" sheet if no barcode is scanned within 15 seconds
  useEffect(() => {
    if (scanFailed) return;
    const timer = setTimeout(() => {
      setScanFailed(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [scanFailed]);

  return (
    <div className="flex-1 flex flex-col bg-[#111111] overflow-hidden relative">
      {/* Top Orange Strip */}
      <div className="h-11 w-full bg-gradient-to-b from-[#FF941A] to-[#FFA436] shrink-0" />

      {/* Main Scanner Layout */}
      <div className="flex-1 flex flex-row relative overflow-hidden">
        {/* Live Camera Video Background */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity ${
            hasCamera ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Left White Vertical Action Bar */}
        <button
          type="button"
          onClick={onManualInsert}
          className="relative z-10 w-14 bg-white hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          aria-label="Inserir código do boleto"
        >
          <span className="rotate-90 whitespace-nowrap font-inter text-[14px] text-[#585666] tracking-tight">
            Inserir código do boleto
          </span>
        </button>

        {/* Dark Left Overlay */}
        <div className="relative z-10 flex-1 bg-black/65" />

        {/* Center Scan Window (transparent over camera!) */}
        <button
          type="button"
          onClick={() =>
            onScanSuccess('836400000018 450000000000 000000000000 000000000000')
          }
          title="Aponte a câmera para o código de barras ou toque para simular"
          className="relative z-10 w-[38%] bg-transparent border-x border-white/25 cursor-pointer flex items-center justify-center"
          aria-label="Área de leitura do código de barras"
        >
          {cameraError && (
            <span className="rotate-90 whitespace-nowrap font-inter text-[11px] text-white/75 px-2">
              {cameraError}
            </span>
          )}
        </button>

        {/* Dark Right Overlay + Back Arrow + Instruction */}
        <div className="relative z-10 flex-1 bg-black/65 flex items-center justify-center">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center text-white hover:opacity-75 transition-opacity cursor-pointer"
          >
            <ArrowUp size={20} strokeWidth={1.8} />
          </button>

          <span className="rotate-90 whitespace-nowrap font-inter text-[14px] text-white tracking-tight">
            Escaneie o código de barras do boleto
          </span>
        </div>
      </div>

      {/* "Tente novamente" Rotated Sheet Overlay */}
      {scanFailed && (
        <div
          className="absolute inset-0 z-30 flex flex-row bg-black/55"
          role="dialog"
          aria-modal="true"
          aria-label="Não foi possível identificar um código de barras"
        >
          {/* Left White Sheet (47% width) */}
          <div className="w-[47%] h-full bg-white flex flex-row shadow-xl">
            {/* Leftmost Action Buttons Column */}
            <div className="w-14 h-full border-r border-[#E3E3E6] flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => setScanFailed(false)}
                className="flex-1 border-b border-[#E3E3E6] flex items-center justify-center hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <span className="rotate-90 whitespace-nowrap font-inter text-[14px] font-medium text-[#FF941A]">
                  Escanear novamente
                </span>
              </button>

              <button
                type="button"
                onClick={onManualInsert}
                className="flex-1 flex items-center justify-center hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <span className="rotate-90 whitespace-nowrap font-inter text-[14px] text-[#585666]">
                  Digitar código
                </span>
              </button>
            </div>

            {/* Error Message Column */}
            <div className="flex-1 h-full flex items-center justify-center px-3 overflow-hidden">
              <div className="rotate-90 whitespace-nowrap text-center font-inter leading-[22px]">
                <p className="font-semibold text-[14px] text-[#585666]">
                  Não foi possível identificar um código de barras.
                </p>
                <p className="text-[13px] text-[#706E7A]">
                  Tente escanear novamente ou digite o código do seu boleto.
                </p>
              </div>
            </div>
          </div>

          {/* Clicking the dimmed right area retries scanning */}
          <div
            className="flex-1 h-full"
            onClick={() => setScanFailed(false)}
          />
        </div>
      )}
    </div>
  );
}
