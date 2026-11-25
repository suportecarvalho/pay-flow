import {
  ZBarConfigType,
  ZBarScanner,
  ZBarSymbolType,
  scanImageData,
} from '@undecaf/zbar-wasm';
import { ArrowLeft, ImagePlus } from 'lucide-react';
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
  if (window.matchMedia('(orientation: landscape)').matches) return true;
  return window.innerWidth > window.innerHeight;
}

async function decodeCanvasWithEngines(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  nativeDetector: NativeBarcodeDetector | null,
  zbarScanner: ZBarScanner | null
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
    const symbols = zbarScanner
      ? await scanImageData(imageData, zbarScanner)
      : await scanImageData(imageData);
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
  const [tiltSide, setTiltSide] = useState<'none' | 'left' | 'right'>('none');
  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handleOrientation = () => {
      const landscape = getIsLandscape();
      setIsLandscape(landscape);
      if (landscape) {
        setTiltSide('none');
      }
    };

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (getIsLandscape()) {
        setTiltSide('none');
        return;
      }
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 0;

      if (Math.abs(beta) < 55) {
        if (gamma < -48) {
          setTiltSide('left');
          return;
        }
        if (gamma > 48) {
          setTiltSide('right');
          return;
        }
      }

      if (Math.abs(gamma) < 28) {
        setTiltSide('none');
      }
    };

    handleOrientation();
    mediaQuery.addEventListener('change', handleOrientation);
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    screen.orientation?.addEventListener?.('change', handleOrientation);
    window.addEventListener('deviceorientation', handleDeviceOrientation);

    return () => {
      mediaQuery.removeEventListener('change', handleOrientation);
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
      screen.orientation?.removeEventListener?.('change', handleOrientation);
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
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

        let zbarScanner: ZBarScanner | null = null;
        try {
          zbarScanner = await ZBarScanner.create();
          // Configure ZBar specifically for 44-48 digit ITF boletos + Code128
          zbarScanner.setConfig(
            ZBarSymbolType.ZBAR_NONE,
            ZBarConfigType.ZBAR_CFG_ENABLE,
            0
          );
          zbarScanner.setConfig(
            ZBarSymbolType.ZBAR_I25,
            ZBarConfigType.ZBAR_CFG_ENABLE,
            1
          );
          zbarScanner.setConfig(
            ZBarSymbolType.ZBAR_I25,
            ZBarConfigType.ZBAR_CFG_MIN_LEN,
            44
          );
          zbarScanner.setConfig(
            ZBarSymbolType.ZBAR_I25,
            ZBarConfigType.ZBAR_CFG_MAX_LEN,
            48
          );
          zbarScanner.setConfig(
            ZBarSymbolType.ZBAR_I25,
            ZBarConfigType.ZBAR_CFG_UNCERTAINTY,
            1
          );
          zbarScanner.setConfig(
            ZBarSymbolType.ZBAR_CODE128,
            ZBarConfigType.ZBAR_CFG_ENABLE,
            1
          );
        } catch {
          zbarScanner = null;
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
            // Crop the center 46% band where the scan window is, upscaling slightly if narrow
            const cropH = Math.round(vh * 0.46);
            const cropY = Math.round((vh - cropH) / 2);
            const scale = vw < 1280 ? 1.5 : 1;
            canvas.width = Math.round(vw * scale);
            canvas.height = Math.round(cropH * scale);
            ctx.drawImage(
              video,
              0,
              cropY,
              vw,
              cropH,
              0,
              0,
              canvas.width,
              canvas.height
            );

            const candidates = await decodeCanvasWithEngines(
              canvas,
              ctx,
              nativeDetector,
              zbarScanner
            );
            handleCandidates(candidates);
          } finally {
            isProcessing = false;
          }
        }, 150);
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

  const isSideways = !isLandscape && tiltSide !== 'none';
  const textRotationClass =
    tiltSide === 'left'
      ? 'rotate-90'
      : tiltSide === 'right'
        ? '-rotate-90'
        : '';

  return (
    <div className="flex-1 flex flex-col bg-[#111111] overflow-hidden relative">
      {/* Top Orange Strip */}
      <div
        className={`w-full bg-gradient-to-b from-[#FF941A] to-[#FFA436] shrink-0 ${
          isLandscape ? 'h-3' : 'h-11'
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

      {/* Main Scanner Layout (adapts cleanly to portrait, landscape & physical tilt) */}
      <div
        className={`flex-1 flex relative overflow-hidden ${
          isSideways
            ? tiltSide === 'right'
              ? 'flex-row-reverse'
              : 'flex-row'
            : 'flex-col-reverse'
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

        {/* White Action Bar */}
        <button
          type="button"
          onClick={onManualInsert}
          className={`relative z-10 bg-white hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
            isSideways
              ? 'w-14 h-full'
              : isLandscape
                ? 'h-12 w-full'
                : 'h-14 w-full'
          }`}
          aria-label="Inserir código do boleto"
        >
          <span
            className={`whitespace-nowrap font-inter text-[14px] text-[#585666] tracking-tight ${textRotationClass}`}
          >
            Inserir código do boleto
          </span>
        </button>

        {/* Bottom/Side Dark Overlay + Photo fallback button */}
        <div
          className={`relative z-10 min-w-0 min-h-0 bg-black/65 flex items-center px-4 ${
            isSideways
              ? 'flex-1 flex-col justify-between py-6'
              : isLandscape
                ? 'h-12 shrink-0 justify-end px-6'
                : 'flex-1 justify-between px-6'
          }`}
        >
          {!isLandscape && !isSideways ? (
            <span className="font-inter text-[12px] text-white/75">
              Vire o celular na horizontal para ler melhor
            </span>
          ) : !isLandscape ? (
            <span />
          ) : null}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Ler de foto ou print"
            aria-label="Ler código de barras de foto"
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <ImagePlus size={18} strokeWidth={1.8} />
          </button>
        </div>

        {/* Center Scan Window (transparent over camera!) */}
        <div
          className={`relative z-10 bg-transparent flex items-center justify-center ${
            isSideways
              ? 'w-[54%] h-full shrink-0 border-x border-white/25'
              : isLandscape
                ? 'flex-1 min-h-0 w-full border-y border-white/25'
                : 'h-[38%] w-full shrink-0 border-y border-white/25'
          }`}
          aria-label="Área de leitura do código de barras"
        >
          {!cameraError && (
            <div
              className={`bg-[#FF941A]/70 animate-pulse ${
                isSideways ? 'w-[1.5px] h-[78%]' : 'h-[1.5px] w-[82%]'
              }`}
            />
          )}

          {(cameraError || photoStatus) && (
            <span
              className={`whitespace-nowrap font-inter text-[12px] text-white/90 px-3 text-center ${textRotationClass}`}
            >
              {photoStatus || cameraError}
            </span>
          )}
        </div>

        {/* Top/Side Dark Overlay + Back Arrow + Instruction */}
        <div
          className={`relative z-10 min-w-0 min-h-0 bg-black/65 flex items-center justify-center ${
            isLandscape ? 'h-12 shrink-0 px-12' : 'flex-1'
          }`}
        >
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className={`absolute w-10 h-10 flex items-center justify-center text-white hover:opacity-75 transition-opacity cursor-pointer ${
              isSideways
                ? 'top-5 right-1/2 translate-x-1/2'
                : 'left-4 top-1/2 -translate-y-1/2'
            }`}
          >
            <ArrowLeft size={20} strokeWidth={1.8} className={textRotationClass} />
          </button>

          <span
            className={`whitespace-nowrap font-inter text-[14px] text-white tracking-tight text-center ${
              isSideways ? 'absolute' : ''
            } ${textRotationClass}`}
          >
            Escaneie o código de barras do boleto
          </span>
        </div>
      </div>

      {/* "Tente novamente" Sheet Overlay */}
      {scanFailed && (
        <div
          className="absolute inset-0 z-30 flex flex-col-reverse bg-black/55"
          role="dialog"
          aria-modal="true"
          aria-label="Não foi possível identificar um código de barras"
        >
          {/* White Sheet */}
          <div
            className={`w-full bg-white flex flex-col-reverse shadow-xl ${
              isLandscape ? 'h-[62%]' : 'h-[42%]'
            }`}
          >
            {/* Action Buttons */}
            <div className="h-14 w-full border-t border-[#E3E3E6] flex flex-row shrink-0">
              <button
                type="button"
                onClick={() => setScanFailed(false)}
                className="flex-1 border-r border-[#E3E3E6] flex items-center justify-center hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <span className="whitespace-nowrap font-inter text-[14px] font-medium text-[#FF941A]">
                  Escanear novamente
                </span>
              </button>

              <button
                type="button"
                onClick={onManualInsert}
                className="flex-1 flex items-center justify-center hover:bg-[#FAFAFC] active:bg-[#F2F2F7] transition-colors cursor-pointer"
              >
                <span className="whitespace-nowrap font-inter text-[14px] text-[#585666]">
                  Digitar código
                </span>
              </button>
            </div>

            {/* Error Message */}
            <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
              <div className="text-center font-inter leading-[22px]">
                <p className="font-semibold text-[14px] text-[#585666]">
                  Não foi possível identificar um código de barras.
                </p>
                <p className="text-[13px] text-[#706E7A] mt-1">
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
