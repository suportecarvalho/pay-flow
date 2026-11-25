import {
  ZBarConfigType,
  ZBarScanner,
  ZBarSymbolType,
  scanImageData,
} from '@undecaf/zbar-wasm';
import { ArrowLeft, Flashlight, FlashlightOff, ImagePlus, ZoomIn } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  isPixPayload,
  isValidBoletoLength,
  isValidFebrabanBarcode,
} from '../utils/boletoParser';
import { extractBarcodeFromPdf } from '../utils/pdfBoletoReader';

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

function enhanceContrastGrayscale(imageData: ImageData): ImageData {
  const data = imageData.data;
  let min = 255;
  let max = 0;

  // Sample every 4th pixel to find min/max luminance quickly
  for (let i = 0; i < data.length; i += 16) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }

  const range = Math.max(max - min, 1);
  const out = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    const stretched = ((lum - min) * 255) / range;
    const val = stretched < 120 ? 0 : stretched > 155 ? 255 : stretched;
    out[i] = val;
    out[i + 1] = val;
    out[i + 2] = val;
    out[i + 3] = 255;
  }

  return new ImageData(out, imageData.width, imageData.height);
}

async function decodeCanvasWithEngines(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  nativeDetector: NativeBarcodeDetector | null,
  zbarScanner: ZBarScanner | null,
  applyContrast: boolean
): Promise<string[]> {
  const candidates: string[] = [];

  if (nativeDetector && !applyContrast) {
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
    const rawImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetData = applyContrast
      ? enhanceContrastGrayscale(rawImageData)
      : rawImageData;

    const symbols = zbarScanner
      ? await scanImageData(targetData, zbarScanner)
      : await scanImageData(targetData);

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
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanFailed, setScanFailed] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [photoStatus, setPhotoStatus] = useState('');
  const [isLandscape, setIsLandscape] = useState(getIsLandscape);
  const [tiltSide, setTiltSide] = useState<'none' | 'left' | 'right'>('none');

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomed, setZoomed] = useState(false);

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

    function confirmMatch(text: string) {
      active = false;
      setScanLocked(true);
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(80);
      }
      window.setTimeout(() => {
        onScanSuccessRef.current(text);
      }, 220);
    }

    function handleCandidates(candidates: string[]): boolean {
      for (const text of candidates) {
        if (!text) continue;

        // 0. Pix QR Code (Pague com Pix)
        if (isPixPayload(text)) {
          confirmMatch(text);
          return true;
        }

        const digits = text.replace(/\D/g, '');

        // 1. 44-digit Brazilian boleto: validate FEBRABAN check digit!
        if (digits.length === 44) {
          if (isValidFebrabanBarcode(digits)) {
            confirmMatch(text);
            return true;
          }
          // Reject corrupted 44-digit ITF read unless confirmed twice identically
          if (text === lastCandidate) {
            candidateHits += 1;
            if (candidateHits >= 3) {
              confirmMatch(text);
              return true;
            }
          } else {
            lastCandidate = text;
            candidateHits = 1;
          }
          continue;
        }

        // 2. 47/48-digit linha digitável
        if (isValidBoletoLength(text)) {
          confirmMatch(text);
          return true;
        }

        // 3. Other barcodes (8+ digits) confirmed on 2 consecutive frames
        if (digits.length >= 8) {
          if (text === lastCandidate) {
            candidateHits += 1;
          } else {
            lastCandidate = text;
            candidateHits = 1;
          }
          if (candidateHits >= 2) {
            confirmMatch(text);
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

        const track = stream.getVideoTracks()[0] ?? null;
        trackRef.current = track;

        if (track && 'getCapabilities' in track) {
          try {
            const caps = track.getCapabilities() as MediaTrackCapabilities & {
              torch?: boolean;
              zoom?: { min: number; max: number };
            };
            setTorchSupported(Boolean(caps.torch));
            setZoomSupported(Boolean(caps.zoom && caps.zoom.max >= 1.5));
          } catch {
            // Ignore capability inspection errors
          }
        }

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
            let formats = ['itf', 'code_128', 'ean_13', 'qr_code'];
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
          zbarScanner.setConfig(
            ZBarSymbolType.ZBAR_QRCODE,
            ZBarConfigType.ZBAR_CFG_ENABLE,
            1
          );
        } catch {
          zbarScanner = null;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let isProcessing = false;
        let frameCount = 0;

        intervalId = window.setInterval(async () => {
          if (!active || isProcessing || !ctx || video.readyState < 2) return;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (!vw || !vh) return;

          isProcessing = true;
          frameCount += 1;
          try {
            const cropH = Math.round(vh * 0.48);
            const cropY = Math.round((vh - cropH) / 2);
            const scale = vw < 1280 ? 1.5 : 1;

            // Every 3rd frame, test rotated 90° for perpendicular alignment
            if (frameCount % 3 === 0) {
              canvas.width = Math.round(cropH * scale);
              canvas.height = Math.round(vw * scale);
              ctx.save();
              ctx.translate(canvas.width / 2, canvas.height / 2);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(
                video,
                0,
                cropY,
                vw,
                cropH,
                -Math.round(vw * scale) / 2,
                -Math.round(cropH * scale) / 2,
                Math.round(vw * scale),
                Math.round(cropH * scale)
              );
              ctx.restore();
            } else {
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
            }

            // Alternate raw pass and contrast-enhanced pass
            const useContrast = frameCount % 2 === 0;
            const candidates = await decodeCanvasWithEngines(
              canvas,
              ctx,
              nativeDetector,
              zbarScanner,
              useContrast
            );
            handleCandidates(candidates);
          } finally {
            isProcessing = false;
          }
        }, 140);
      } catch {
        if (active) {
          setCameraError('Não foi possível acessar a câmera.');
        }
      }
    }

    startScanner();

    return () => {
      active = false;
      trackRef.current = null;
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
    if (scanFailed || scanLocked) return;
    const timer = setTimeout(() => {
      setScanFailed(true);
    }, 25000);
    return () => clearTimeout(timer);
  }, [scanFailed, scanLocked]);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      // Ignore unsupported torch toggle
    }
  };

  const toggleZoom = async () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !zoomed;
    try {
      const caps = track.getCapabilities() as MediaTrackCapabilities & {
        zoom?: { min: number; max: number };
      };
      const targetZoom = next ? Math.min(2, caps.zoom?.max ?? 2) : 1;
      await track.applyConstraints({
        advanced: [{ zoom: targetZoom } as MediaTrackConstraintSet],
      });
      setZoomed(next);
    } catch {
      // Ignore unsupported zoom toggle
    }
  };

  const handlePhotoSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    setPhotoStatus(isPdf ? 'Lendo PDF...' : 'Lendo imagem...');
    try {
      if (isPdf) {
        const pdfCode = await extractBarcodeFromPdf(file);
        if (pdfCode) {
          setPhotoStatus('');
          if (typeof navigator.vibrate === 'function') {
            navigator.vibrate(80);
          }
          onScanSuccessRef.current(pdfCode);
          return;
        }
        setPhotoStatus('Nenhum código encontrado no PDF.');
        setTimeout(() => setPhotoStatus(''), 3000);
        return;
      }

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

        const rawData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (const img of [rawData, enhanceContrastGrayscale(rawData)]) {
          const symbols = await scanImageData(img);
          const match =
            symbols.find((s) => isValidFebrabanBarcode(s.decode())) ??
            symbols.find((s) => isValidBoletoLength(s.decode())) ??
            symbols[0];

          if (match) {
            const text = match.decode().trim();
            if (text) {
              setPhotoStatus('');
              if (typeof navigator.vibrate === 'function') {
                navigator.vibrate(80);
              }
              onScanSuccessRef.current(text);
              return;
            }
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

      {/* Hidden Photo/PDF Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        onChange={(e) => void handlePhotoSelected(e)}
        className="hidden"
      />

      {/* Main Scanner Layout */}
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
          aria-label="Cadastrar manualmente"
        >
          <span
            className={`whitespace-nowrap font-inter text-[14px] text-[#585666] tracking-tight ${textRotationClass}`}
          >
            Cadastrar manualmente
          </span>
        </button>

        {/* Bottom/Side Dark Overlay + Controls (Torch, Zoom, Photo) */}
        <div
          className={`relative z-10 min-w-0 min-h-0 bg-black/65 flex items-center px-4 ${
            isSideways
              ? 'flex-1 flex-col justify-between py-6'
              : isLandscape
                ? 'h-12 shrink-0 justify-between px-6'
                : 'flex-1 justify-between px-6'
          }`}
        >
          {!isLandscape && !isSideways ? (
            <span className="font-inter text-[12px] text-white/75 truncate pr-2">
              Alinhe o código de barras na área marcada
            </span>
          ) : (
            <span />
          )}

          <div
            className={`flex items-center gap-2.5 shrink-0 ${
              isSideways ? 'flex-col' : 'flex-row'
            }`}
          >
            {torchSupported && (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                title={torchOn ? 'Desligar lanterna' : 'Ligar lanterna'}
                aria-label={torchOn ? 'Desligar lanterna' : 'Ligar lanterna'}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  torchOn
                    ? 'bg-[#FF941A] text-white'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                {torchOn ? (
                  <FlashlightOff size={17} strokeWidth={1.8} />
                ) : (
                  <Flashlight size={17} strokeWidth={1.8} />
                )}
              </button>
            )}

            {zoomSupported && (
              <button
                type="button"
                onClick={() => void toggleZoom()}
                title={zoomed ? 'Zoom 1x' : 'Zoom 2x'}
                aria-label={zoomed ? 'Zoom 1x' : 'Zoom 2x'}
                className={`h-9 px-2.5 rounded-full flex items-center gap-1 font-inter text-[12px] font-semibold transition-colors cursor-pointer ${
                  zoomed
                    ? 'bg-[#FF941A] text-white'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                <ZoomIn size={15} strokeWidth={1.8} />
                <span>{zoomed ? '2x' : '1x'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Importar PDF, foto ou print"
              aria-label="Importar boleto por PDF ou foto"
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ImagePlus size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Center Scan Window with Fintech Corner Brackets */}
        <div
          className={`relative z-10 bg-transparent flex items-center justify-center ${
            isSideways
              ? 'w-[54%] h-full shrink-0 border-x border-white/20'
              : isLandscape
                ? 'flex-1 min-h-0 w-full border-y border-white/20'
                : 'h-[38%] w-full shrink-0 border-y border-white/20'
          }`}
          aria-label="Área de leitura do código de barras"
        >
          {/* Corner Viewfinder Frame */}
          <div
            className={`relative flex items-center justify-center pointer-events-none ${
              isSideways ? 'w-[76%] h-[84%]' : 'w-[88%] h-[74%]'
            }`}
          >
            <span
              className={`absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] rounded-tl-[4px] transition-colors ${
                scanLocked ? 'border-emerald-400' : 'border-[#FF941A]'
              }`}
            />
            <span
              className={`absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] rounded-tr-[4px] transition-colors ${
                scanLocked ? 'border-emerald-400' : 'border-[#FF941A]'
              }`}
            />
            <span
              className={`absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] rounded-bl-[4px] transition-colors ${
                scanLocked ? 'border-emerald-400' : 'border-[#FF941A]'
              }`}
            />
            <span
              className={`absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] rounded-br-[4px] transition-colors ${
                scanLocked ? 'border-emerald-400' : 'border-[#FF941A]'
              }`}
            />

            {/* Animated Laser Sweep */}
            {!cameraError && (
              <div
                className={`transition-colors ${
                  scanLocked
                    ? 'bg-emerald-400'
                    : 'bg-[#FF941A]/80 animate-scan-sweep'
                } ${isSideways ? 'w-[2px] h-[86%]' : 'h-[2px] w-[90%]'}`}
              />
            )}
          </div>

          {(cameraError || photoStatus) && (
            <span
              className={`absolute whitespace-nowrap font-inter text-[12px] text-white/95 bg-black/50 px-3 py-1 rounded ${textRotationClass}`}
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
            <ArrowLeft
              size={20}
              strokeWidth={1.8}
              className={textRotationClass}
            />
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
