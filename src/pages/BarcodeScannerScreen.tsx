import { scanImageData } from '@undecaf/zbar-wasm';
import { ArrowLeft, ArrowUp, ImagePlus } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
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

function getIsLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(orientation: landscape)').matches;
}

async function decodeCanvasWithEngines(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  nativeDetector: NativeBarcodeDetector | null
): Promise<string[]> {
  const candidates: string[] = [];

  if (nativeDetector) {
    try {
      const results = await nativeDetector.detect(canvas);
      for (const item of results) {
        if (item.rawValue) candidates.push(item.rawValue.trim());
      }
    } catch {
      // Fall through to ZBar
    }
  }

  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const symbols = await scanImageData(imageData);
    for (const sym of symbols) {
      const text = sym.decode().trim();
      if (text) candidates.push(text);
    }
  } catch {
    // Ignore ZBar frame error
  }

  return candidates;
}

export function BarcodeScannerScreen({
  onBack,
  onManualInsert,
  onScanSuccess,
}: BarcodeScannerScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanFailed, setScanFailed] = useState(false);
  const [photoStatus, setPhotoStatus] = useState('');
  const [isLandscape, setIsLandscape] = useState(getIsLandscape);
  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handleOrientation = () => {
      setIsLandscape(mediaQuery.matches);
    };

    handleOrientation();
    mediaQuery.addEventListener('change', handleOrientation);
    window.addEventListener('resize', handleOrientation);

    return () => {
      mediaQuery.removeEventListener('change', handleOrientation);
      window.removeEventListener('resize', handleOrientation);
    };
  }, []);

  useEffect(() => {
    if (scanFailed) return;

    let stream: MediaStream | null = null;
    let intervalId: number | undefined;
    let active = true;
    let lastCandidate = '';
    let candidateHits = 0;

    function handleCandidates(candidates: string[]): boolean {
      for (const text of candidates) {
        if (!text) continue;

        if (isValidBoletoLength(text)) {
          active = false;
          onScanSuccessRef.current(text);
          return true;
        }

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

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let isProcessing = false;

        intervalId = window.setInterval(async () => {
          if (!active || isProcessing || !ctx || video.readyState < 2) return;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (!vw || !vh) return;

          isProcessing = true;
          try {
            canvas.width = vw;
            canvas.height = vh;
            ctx.drawImage(video, 0, 0, vw, vh);

            const candidates = await decodeCanvasWithEngines(
              canvas,
              ctx,
              nativeDetector
            );
            handleCandidates(candidates);
          } finally {
            isProcessing = false;
          }
        }, 160);
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

  // Show "Tente novamente" sheet if no barcode is scanned within 25 seconds
  useEffect(() => {
    if (scanFailed) return;
    const timer = setTimeout(() => {
      setScanFailed(true);
    }, 25000);
    return () => clearTimeout(timer);
  }, [scanFailed]);

  const handlePhotoSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoStatus('Lendo imagem...');
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      for (const rotated of [false, true]) {
        if (rotated) {
          canvas.width = bitmap.height;
          canvas.height = bitmap.width;
          ctx.save();
          ctx.translate(bitmap.height / 2, bitmap.width / 2);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(
            bitmap,
            -bitmap.width / 2,
            -bitmap.height / 2,
            bitmap.width,
            bitmap.height
          );
          ctx.restore();
        } else {
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          ctx.drawImage(bitmap, 0, 0);
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const symbols = await scanImageData(imageData);
        const match =
          symbols.find((s) => isValidBoletoLength(s.decode())) ?? symbols[0];

        if (match) {
          const text = match.decode().trim();
          if (text) {
            setPhotoStatus('');
            onScanSuccessRef.current(text);
            return;
          }
        }
      }

      setPhotoStatus('Nenhum código encontrado na foto.');
      setTimeout(() => setPhotoStatus(''), 3000);
    } catch {
      setPhotoStatus('Erro ao ler imagem.');
      setTimeout(() => setPhotoStatus(''), 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#111111] overflow-hidden relative">
      {/* Top Orange Strip */}
      <div
        className={`w-full bg-gradient-to-b from-[#FF941A] to-[#FFA436] shrink-0 ${
          isLandscape ? 'h-4' : 'h-11'
        }`}
      />

      {/* Hidden Photo Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handlePhotoSelected(e)}
        className="hidden"
      />

      {/* Main Scanner Layout */}
      <div
        className={`flex-1 flex relative overflow-hidden ${
          isLandscape ? 'flex-col-reverse' : 'flex-row'
        }`}
      >
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

        {/* White Action Bar (Left in portrait, Bottom in landscape) */}
        <button
          type="button"
          onClick={onManualInsert}
          className={`relative z-10 bg-white hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
            isLandscape ? 'h-14 w-full' : 'w-14 h-full'
          }`}
          aria-label="Inserir código do boleto"
        >
          <span
            className={`whitespace-nowrap font-inter text-[14px] text-[#585666] tracking-tight ${
              isLandscape ? '' : 'rotate-90'
            }`}
          >
            Inserir código do boleto
          </span>
        </button>

        {/* Dark Overlay + Photo fallback button */}
        <div
          className={`relative z-10 flex-1 bg-black/65 flex items-center justify-center ${
            isLandscape ? 'flex-row px-6 justify-end' : 'items-end pb-6'
          }`}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Ler de foto ou print"
            aria-label="Ler código de barras de foto"
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ImagePlus size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Center Scan Window (transparent over camera!) */}
        <div
          className={`relative z-10 bg-transparent flex items-center justify-center ${
            isLandscape
              ? 'h-[38%] w-full border-y border-white/25'
              : 'w-[38%] h-full border-x border-white/25'
          }`}
          aria-label="Área de leitura do código de barras"
        >
          {!cameraError && (
            <div
              className={`bg-[#FF941A]/70 animate-pulse ${
                isLandscape ? 'h-[1.5px] w-[75%]' : 'w-[1.5px] h-[75%]'
              }`}
            />
          )}

          {(cameraError || photoStatus) && (
            <span
              className={`whitespace-nowrap font-inter text-[11px] text-white/85 px-2 ${
                isLandscape ? '' : 'rotate-90'
              }`}
            >
              {photoStatus || cameraError}
            </span>
          )}
        </div>

        {/* Dark Overlay + Back Arrow + Instruction (Right in portrait, Top in landscape) */}
        <div className="relative z-10 flex-1 bg-black/65 flex items-center justify-center">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className={`absolute w-10 h-10 flex items-center justify-center text-white hover:opacity-75 transition-opacity cursor-pointer ${
              isLandscape ? 'left-4 top-1/2 -translate-y-1/2' : 'top-5 right-5'
            }`}
          >
            {isLandscape ? (
              <ArrowLeft size={20} strokeWidth={1.8} />
            ) : (
              <ArrowUp size={20} strokeWidth={1.8} />
            )}
          </button>

          <span
            className={`whitespace-nowrap font-inter text-[14px] text-white tracking-tight ${
              isLandscape ? '' : 'rotate-90'
            }`}
          >
            Escaneie o código de barras do boleto
          </span>
        </div>
      </div>

      {/* "Tente novamente" Sheet Overlay */}
      {scanFailed && (
        <div
          className={`absolute inset-0 z-30 flex bg-black/55 ${
            isLandscape ? 'flex-col-reverse' : 'flex-row'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Não foi possível identificar um código de barras"
        >
          {/* White Sheet */}
          <div
            className={`bg-white flex shadow-xl ${
              isLandscape
                ? 'w-full h-[55%] flex-col-reverse'
                : 'w-[47%] h-full flex-row'
            }`}
          >
            {/* Action Buttons */}
            <div
              className={`border-[#E3E3E6] flex shrink-0 ${
                isLandscape
                  ? 'h-14 w-full border-t flex-row'
                  : 'w-14 h-full border-r flex-col'
              }`}
            >
              <button
                type="button"
                onClick={() => setScanFailed(false)}
                className={`flex-1 border-[#E3E3E6] flex items-center justify-center hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors cursor-pointer ${
                  isLandscape ? 'border-r' : 'border-b'
                }`}
              >
                <span
                  className={`whitespace-nowrap font-inter text-[14px] font-medium text-[#FF941A] ${
                    isLandscape ? '' : 'rotate-90'
                  }`}
                >
                  Escanear novamente
                </span>
              </button>

              <button
                type="button"
                onClick={onManualInsert}
                className="flex-1 flex items-center justify-center hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <span
                  className={`whitespace-nowrap font-inter text-[14px] text-[#585666] ${
                    isLandscape ? '' : 'rotate-90'
                  }`}
                >
                  Digitar código
                </span>
              </button>
            </div>

            {/* Error Message */}
            <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
              <div
                className={`text-center font-inter leading-[22px] ${
                  isLandscape ? '' : 'rotate-90 whitespace-nowrap'
                }`}
              >
                <p className="font-semibold text-[14px] text-[#585666]">
                  Não foi possível identificar um código de barras.
                </p>
                <p className="text-[13px] text-[#706E7A]">
                  Tente escanear novamente ou digite o código do seu boleto.
                </p>
              </div>
            </div>
          </div>

          {/* Clicking the dimmed area retries scanning */}
          <div className="flex-1" onClick={() => setScanFailed(false)} />
        </div>
      )}
    </div>
  );
}
