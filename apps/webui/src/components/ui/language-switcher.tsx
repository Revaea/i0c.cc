'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';

import {routing} from '@/i18n/routing';

function replaceLocaleInPath(pathname: string, nextLocale: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const segments = path.split('/');
  const maybeLocale = segments[1] ?? '';
  if (routing.locales.includes(maybeLocale as (typeof routing.locales)[number])) {
    segments[1] = nextLocale;
    return segments.join('/') || `/${nextLocale}`;
  }

  return `/${nextLocale}${path}`;
}

export type LanguageSwitcherProps = {
  className?: string;
};

export function LanguageSwitcher({className}: LanguageSwitcherProps) {
  const locale = useLocale();
  const tHeader = useTranslations('header');
  const pathname = usePathname();
  const router = useRouter();

  const currentLocale = String(locale);

  const items = useMemo(
    () => [
      {value: 'zh-CN', label: tHeader('chinese')},
      {value: 'en', label: tHeader('english')}
    ],
    [tHeader]
  );

  const currentLabel = useMemo(() => {
    return items.find((item) => item.value === currentLocale)?.label ?? currentLocale;
  }, [currentLocale, items]);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root) {
        return;
      }
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const a11yLabel = tHeader('language');

  const navigateTo = (nextLocale: string) => {
    setOpen(false);
    router.push(replaceLocaleInPath(pathname, nextLocale));
  };

  return (
    <div
      ref={rootRef}
      className={'relative inline-flex ' + (className ?? '')}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        aria-label={a11yLabel}
        title={a11yLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path d="M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M12 3c2.5 2.5 4 5.7 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">{currentLabel}</span>
        </span>
        <span className="ml-2 hidden sm:inline-flex items-center" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={a11yLabel}
          className="absolute right-0 top-full z-50 mt-2 min-w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md"
        >
          {items.map((item) => {
            const selected = item.value === currentLocale;
            return (
              <button
                key={item.value}
                type="button"
                role="menuitem"
                onClick={() => navigateTo(item.value)}
                className={
                  'flex w-full items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 ' +
                  (selected ? 'font-semibold' : '')
                }
                aria-current={selected ? 'true' : undefined}
              >
                <span>{item.label}</span>
                {selected ? (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
