'use client';

import { Dropdown } from '@heroui/react';
import { Globe } from 'lucide-react';

import { useLocaleContext } from '../providers/LocaleProvider';
import { isLocale, LOCALES, type Locale } from '../i18n/routing';

const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
};

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocaleContext();

  return (
    <Dropdown>
      <Dropdown.Trigger className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50">
        <Globe size={14} strokeWidth={2} className="text-neutral-500" />
        <span>{LOCALE_LABEL[locale]}</span>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu
          selectedKeys={[locale]}
          onAction={(key) => {
            const next = String(key);
            if (isLocale(next)) setLocale(next);
          }}
        >
          {LOCALES.map((code) => (
            <Dropdown.Item key={code} id={code}>
              {LOCALE_LABEL[code]}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
