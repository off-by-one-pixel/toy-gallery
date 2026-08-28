'use client';

import { Alert } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useNavigation } from '@/hooks/useNavigation';
import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiMutation } from '@/hooks/useApi';
import TextInput from '@/components/TextInput';

const LoginPage = () => {
  const { param, replace } = useNavigation();
  const { login } = useAuth();
  const t = useTranslations('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const signIn = useApiMutation({
    fn: () => login(username, password),
    onSuccess: () => replace(param('next') || '/'),
    errorSink: setError,
  });

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    await signIn.run();
  };

  return (
    <div className="min-h-screen grid min-[900px]:grid-cols-2">
      <BrandPanel />
      <section className="grid place-items-center px-8 py-12 bg-surface-secondary">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface px-9 py-10 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_24px_rgba(17,24,39,0.06)]">
          <header className="mb-7">
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground">{t('welcome')}</h1>
            <p className="mt-1.5 text-sm text-muted">{t('subtitle')}</p>
          </header>

          {error && (
            <Alert status="danger" className="mb-4">
              <Alert.Description>{error}</Alert.Description>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            <Field label={t('usernameLabel')} htmlFor="username">
              <TextInput
                id="username"
                value={username}
                onChange={setUsername}
                placeholder={t('usernamePlaceholder')}
                autoComplete="username"
                required
              />
            </Field>
            <Field label={t('passwordLabel')} htmlFor="password">
              <TextInput
                id="password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={t('passwordPlaceholder')}
                autoComplete="current-password"
                required
              />
            </Field>
            <button
              type="submit"
              disabled={signIn.isPending}
              className="mt-1.5 w-full rounded-xl bg-accent px-4 py-3.5 text-[15px] font-semibold text-accent-foreground transition-colors hover:bg-accent-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signIn.isPending ? t('submitting') : t('submit')}
            </button>
          </form>

          <p className="mt-5 text-center text-meta text-muted">{t('inviteOnly')}</p>
        </div>
      </section>
    </div>
  );
};

function Field({ label, htmlFor, children }: Readonly<{ label: string; htmlFor: string; children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-meta font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function BrandPanel() {
  const t = useTranslations('login');
  return (
    <aside
      aria-hidden
      className="hidden min-[900px]:flex relative flex-col justify-between overflow-hidden p-12"
      style={{
        backgroundImage:
          'radial-gradient(1200px 800px at 30% 20%, rgba(196,181,253,0.35), transparent 60%), radial-gradient(900px 700px at 80% 100%, rgba(134,239,172,0.30), transparent 60%), linear-gradient(135deg, #fafaff 0%, #f0fdfa 100%)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(to right, transparent 92%, rgba(17,24,39,0.04))' }}
      />
      <div className="relative z-10 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 5 L22 11 L22 19 L20 27 L12 27 L10 19 L10 11 Z"
              fill="#c4b5fd"
              stroke="#ffffff"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-base font-semibold tracking-tight text-foreground">{t('brand')}</span>
      </div>

      <GalleryMontage />

      <div className="relative z-10 max-w-md">
        <h2 className="m-0 text-[22px] font-semibold tracking-tight text-foreground">{t('tagline')}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{t('taglineSubtitle')}</p>
      </div>
    </aside>
  );
}

type Tile = { w: number; h: number; color: string };

const TILES: Tile[] = [
  { w: 46, h: 88, color: '#c4b5fd' },
  { w: 60, h: 72, color: '#bae6fd' },
  { w: 40, h: 96, color: '#bbf7d0' },
  { w: 54, h: 64, color: '#fca5a5' },
  { w: 44, h: 104, color: '#fde68a' },
  { w: 58, h: 80, color: '#c7e4ee' },
];

function GalleryMontage() {
  return (
    <div className="relative z-10 flex-1 grid place-items-center py-6">
      <div
        className="grid grid-cols-3 gap-3.5 -rotate-[4deg] drop-shadow-[0_12px_28px_rgba(31,41,55,0.08)]"
        style={{ gridTemplateColumns: 'repeat(3, 120px)', gridAutoRows: '150px' }}
      >
        {TILES.map((tile, i) => (
          <MontageTile key={tile.color} tile={tile} staggered={i >= 3} />
        ))}
      </div>
    </div>
  );
}

function MontageTile({ tile, staggered }: Readonly<{ tile: Tile; staggered: boolean }>) {
  return (
    <div
      className={
        'relative overflow-hidden rounded-2xl border bg-linear-to-br from-[#fafaff] to-[#f0fdfa] ' +
        (staggered ? 'translate-y-1.5 ' : '')
      }
      style={{ borderColor: 'rgba(17,24,39,0.06)' }}
    >
      <span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 border-[1.25px] border-foreground"
        style={{
          bottom: 24,
          width: tile.w,
          height: tile.h,
          background: tile.color,
          borderRadius: '50% 50% 40% 40% / 65% 65% 35% 35%',
        }}
      />
      <span
        aria-hidden
        className="absolute left-2.5 right-2.5 bottom-2.5 h-1.5 rounded-sm"
        style={{ background: 'rgba(17,24,39,0.08)' }}
      />
    </div>
  );
}

export default LoginPage;
