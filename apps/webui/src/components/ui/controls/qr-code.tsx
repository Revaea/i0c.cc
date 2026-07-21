'use client';

import { appConfig } from "@i0c/config";
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from 'next-intl';
import Image from "next/image";

import { Button } from "@/components/ui/controls/button";

export function QRCodeButton({ pathKey, domain }: { pathKey: string; domain?: string; }) {
  const t = useTranslations('qrCode');
  const [open, setOpen] = useState(false);
  const [showIcon, setShowIcon] = useState(true);
  const [isDropUp, setIsDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const qrWrapperRef = useRef<HTMLDivElement | null>(null);

  const baseUrl = domain || appConfig.runtime.canonicalOrigin;
  const cleanPath = pathKey.startsWith('/') ? pathKey : `/${pathKey}`;
  const finalUrl = `${baseUrl}${cleanPath}`;

  const toggleOpen = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setIsDropUp(spaceBelow < 320);
    }
    setOpen(!open);
  };

  const downloadQRCode = () => {
    if (!qrWrapperRef.current) return;
    
    const sourceCanvas = qrWrapperRef.current.querySelector('canvas');
    if (!sourceCanvas) return;

    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(sourceCanvas, 0, 0);

    if (showIcon) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = "/favicon.ico";
      
      img.onload = () => {
        const size = sourceCanvas.width;
        const iconSize = 32 * (size / 160);
        const bgSize = iconSize + 4;
        const center = size / 2;

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        const x = center - bgSize / 2;
        const y = center - bgSize / 2;
        const r = 4;
        ctx.roundRect(x, y, bgSize, bgSize, r);
        ctx.fill();

        ctx.drawImage(img, center - iconSize / 2, center - iconSize / 2, iconSize, iconSize);
        saveCanvas(canvas);
      };
      
      img.onerror = () => saveCanvas(canvas);
    } else {
      saveCanvas(canvas);
    }
  };

  const saveCanvas = (canvas: HTMLCanvasElement) => {
    const safeName = pathKey.replace(/^\/+/, '').replace(/\//g, '-') || 'home';
    
    const link = document.createElement('a');
    link.download = `qrcode-${safeName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  if (!pathKey) return null;

  return (
    <div ref={rootRef} className="relative inline-flex shrink-0">
      <Button
        onClick={toggleOpen}
        title={t('openQRCode')}
        aria-label={t('openQRCode')}
        size="icon"
        variant={open ? "primary" : "secondary"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="M14 9v6"/><path d="M9 15h6"/>
        </svg>
      </Button>

      {open && (
        <div 
          className={`absolute right-0 z-50 w-56 animate-[fade-up_200ms_ease-out] rounded-2xl border border-line bg-panel p-4 shadow-[0_24px_60px_-32px_rgb(23_32_51_/_55%)] ${
            isDropUp 
              ? "bottom-full mb-2 origin-bottom-right" 
              : "top-full mt-2 origin-top-right"
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-2xl border border-line bg-panel p-2">
              <div ref={qrWrapperRef} className="relative flex items-center justify-center">
                <QRCodeCanvas
                  value={finalUrl}
                  size={160}
                  level={"H"}
                  marginSize={0}
                />
                {showIcon && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Image
                      src="/favicon.ico"
                      alt={t('faviconAlt')}
                      width={32}
                      height={32}
                      className="rounded-lg border-2 border-white bg-white shadow-sm"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-full space-y-4">
              <p className="truncate px-2 text-center font-mono text-[10px] text-muted" title={finalUrl}>
                {finalUrl}
              </p>
              <div className="h-px w-full bg-line" />
              
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted">{t('faviconLabel')}</span>
                <button
                  type="button"
                  onClick={() => setShowIcon(!showIcon)}
                  aria-pressed={showIcon}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                    showIcon ? 'bg-accent' : 'bg-line-strong'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white ring-0 transition-all duration-200 ease-in-out ${
                      showIcon ? 'ml-auto' : 'ml-0'
                    }`}
                  />
                </button>
              </div>

              <Button
                onClick={downloadQRCode}
                className="w-full"
                size="sm"
                variant="secondary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                {t('download') || "Save Image"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
