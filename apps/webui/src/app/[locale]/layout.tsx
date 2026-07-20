import type {Metadata} from 'next';
import {hasLocale, NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';
import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';

import {routing} from '@/i18n/routing';

import {Providers} from '@/app/providers';

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

export async function generateMetadata({params}: LayoutProps): Promise<Metadata> {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({locale, namespace: 'meta'});
  return {
    title: t('title'),
    description: t('description')
  };
}

export default async function LocaleLayout({children, params}: LayoutProps) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages({locale});

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  );
}
