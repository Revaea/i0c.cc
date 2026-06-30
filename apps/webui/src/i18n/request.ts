import {getRequestConfig} from 'next-intl/server';

import {routing, type AppLocale} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  const candidate = await requestLocale;
  const locale = routing.locales.includes(candidate as AppLocale)
    ? (candidate as AppLocale)
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
