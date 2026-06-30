import type {Metadata} from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations} from 'next-intl/server';

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
  const normalizedLocale = routing.locales.includes(locale as (typeof routing.locales)[number])
    ? (locale as (typeof routing.locales)[number])
    : routing.defaultLocale;

  const t = await getTranslations({locale: normalizedLocale, namespace: 'meta'});
  return {
    title: t('title'),
    description: t('description')
  };
}

export default async function LocaleLayout({children, params}: LayoutProps) {
  const {locale} = await params;
  const normalizedLocale = routing.locales.includes(locale as (typeof routing.locales)[number])
    ? (locale as (typeof routing.locales)[number])
    : routing.defaultLocale;

  const messages = await getMessages({locale: normalizedLocale});

  return (
    <NextIntlClientProvider locale={normalizedLocale} messages={messages}>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  );
}
