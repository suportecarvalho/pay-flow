import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isValidBoletoLength } from '../utils/boletoParser';

interface BarcodeScannerScreenProps {
  onBack: () => void;
  onManualInsert: () => void;
  onScanSuccess: (barcode: string) => void;
}

interface NativeBarcodeResult {
  rawValue?: string;
}

interface NativeBarcodeDetector {
  detect: (source: ImageBitmapSource) => Promise<NativeBarcodeResult[]>;
}

interface NativeBarcodeDetectorConstructor {
  new (options?: { formats: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
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

    let stream: MediaStream | null = null;
    let intervalId: number | undefined;
    let active = true;
    let lastCandidate = '';
    let candidateHits = 0;

    function handleDecoded(rawText: string | undefined): boolean {
      const text = rawText?.trim();
      if (!text) return false;

      if (isValidBoletoLength(text)) {
        active = false;
        onScanSuccessRef.current(text);
        return true;
      }

      // Accept non-boleto test barcodes only if confirmed on 2 consecutive frames
      const digitsOnly = text.replace(/\D/g, '');
      if (digitsOnly.length >= 8) {
        if (text === lastCandidate) {
          candidateHits += 1;
        } else {
          lastCandidate = text;
          candidateHits = 1;
        }
        if (candidateHits >= 2) {
          active = false;
          onScanSuccessRef.current(text);
          return true;
        }
      }

      return false;
    }

    async function startScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Câmera indisponível (use HTTPS ou localhost).');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
        setHasCamera(true);
        setCameraError('');

        const track = stream.getVideoTracks()[0];
        if (track && 'applyConstraints' in track) {
          track
            .applyConstraints({
              advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
            })
            .catch(() => {
              // Ignore unsupported focusMode
            });
        }

        // Prepare native BarcodeDetector if available
        let nativeDetector: NativeBarcodeDetector | null = null;
        const DetectorCtor = (
          window as unknown as {
            BarcodeDetector?: NativeBarcodeDetectorConstructor;
          }
        ).BarcodeDetector;

        if (DetectorCtor) {
          try {
            let formats = ['itf', 'code_128', 'ean_13'];
            if (DetectorCtor.getSupportedFormats) {
              const supported = await DetectorCtor.getSupportedFormats();
              formats = formats.filter((f) => supported.includes(f));
            }
            if (formats.length > 0) {
              nativeDetector = new DetectorCtor({ formats });
            }
          } catch {
            nativeDetector = null;
          }
        }

        // Prepare ZXing reader (strictly 44/47/48 for ITF to prevent false reads)
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.ITF,
          BarcodeFormat.CODE_128,
        ]);
        hints.set(DecodeHintType.ALLOWED_LENGTHS, new Int32Array([44, 47, 48]));
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let scanRotated = false;
        let isProcessing = false;

        intervalId = window.setInterval(async () => {
          if (!active || isProcessing || !ctx || video.readyState < 2) return;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (!vw || !vh) return;

          isProcessing = true;
          try {
            scanRotated = !scanRotated;
            if (scanRotated) {
              canvas.width = vh;
              canvas.height = vw;
              ctx.save();
              ctx.translate(vh / 2, vw / 2);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);
              ctx.restore();
            } else {
              canvas.width = vw;
              canvas.height = vh;
              ctx.drawImage(video, 0, 0, vw, vh);
            }

            // 1. Try native BarcodeDetector on canvas (works reliably across Android Chrome)
            if (nativeDetector) {
              try {
                const results = await nativeDetector.detect(canvas);
                for (const item of results) {
                  if (handleDecoded(item.rawValue)) return;
                }
              } catch {
                // Fall through to ZXing
              }
            }

            // 2. Fallback to ZXing on the same canvas
            try {
              const result = reader.decodeFromCanvas(canvas);
              if (handleDecoded(result.getText())) return;
            } catch {
              // NotFoundException on frames without a valid barcode
            }
          } finally {
            isProcessing = false;
          }
        }, 180);
      } catch {
        if (active) {
          setCameraError('Não foi possível acessar a câmera.');
        }
      }
    }

    startScanner();

    return () => {
      active = false;
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [scanFailed]);

  // Show "Tente novamente" sheet if no barcode is scanned within 20 seconds
  useEffect(() => {
    if (scanFailed) return;
    const timer = setTimeout(() => {
      setScanFailed(true);
    }, 20000);
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
        <div
          className="relative z-10 w-[38%] bg-transparent border-x border-white/25 flex items-center justify-center"
          aria-label="Área de leitura do código de barras"
        >
          {/* Subtle vertical laser line inside scan window */}
          {!cameraError && (
            <div className="w-[1.5px] h-[75%] bg-[#FF941A]/70 animate-pulse" />
          )}

          {cameraError && (
            <span className="rotate-90 whitespace-nowrap font-inter text-[11px] text-white/75 px-2">
              {cameraError}
            </span>
          )}
        </div>

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
