'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {usePathname, useRouter} from 'next/navigation';

import {Button} from '@/components/ui/button';
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
  const triggerLabel = `${a11yLabel}: ${currentLabel}`;

  const navigateTo = (nextLocale: string) => {
    setOpen(false);
    router.push(replaceLocaleInPath(pathname, nextLocale));
  };

  return (
    <div
      ref={rootRef}
      className={'relative inline-flex ' + (className ?? '')}
    >
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon-lg"
        variant="secondary"
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
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
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label={a11yLabel}
          className="absolute right-0 top-full z-50 mt-2 min-w-40 overflow-hidden rounded-xl border border-line bg-panel shadow-[0_18px_40px_-24px_rgb(23_32_51_/_45%)]"
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
                  'flex w-full items-center justify-between px-3 py-2 text-sm text-ink transition hover:bg-panel-muted ' +
                  (selected ? 'bg-accent-soft font-semibold text-accent-strong' : '')
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
