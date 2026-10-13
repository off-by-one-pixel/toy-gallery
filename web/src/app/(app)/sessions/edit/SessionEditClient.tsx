'use client';

import { useTranslations } from 'next-intl';

import { useNavigation } from '@/hooks/useNavigation';
import { routeParams, routes } from '@/routes';

import SessionForm from '@/features/sessions/form/SessionForm';

export default function SessionEditClient() {
  const t = useTranslations('session');
  const { param, backOr } = useNavigation();
  const idParam = param(routeParams.sessionId);
  const id = idParam ? Number(idParam) : Number.NaN;
  if (!Number.isFinite(id)) {
    return <main className="mx-auto max-w-300 px-6 py-12 text-center text-sm text-muted">{t('invalidId')}</main>;
  }
  const back = () => backOr(routes.sessions.list);
  return <SessionForm mode={{ kind: 'edit', sessionId: id }} onDone={back} onSaved={back} />;
}
