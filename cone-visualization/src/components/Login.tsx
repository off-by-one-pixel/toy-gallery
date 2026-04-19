'use client';

import { Alert } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useAsyncAction } from '../hooks/useAsyncAction';
import TextInput from './TextInput';

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const runAction = useAsyncAction(setError);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    await runAction(() => login(username, password), {
      busy: setSubmitting,
      onSuccess: () => router.replace(searchParams.get('next') || '/'),
    });
  };

  return (
    <div className="min-h-screen grid min-[900px]:grid-cols-2">
      <BrandPanel />
      <section className="grid place-items-center px-8 py-12 bg-neutral-100">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white px-9 py-10 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_24px_rgba(17,24,39,0.06)]">
          <header className="mb-7">
            <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-neutral-500">Sign in to your gallery.</p>
          </header>

          {error && (
            <Alert status="danger" className="mb-4">
              <Alert.Description>{error}</Alert.Description>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            <Field label="Username" htmlFor="username">
              <TextInput
                id="username"
                value={username}
                onChange={setUsername}
                placeholder="your-username"
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <TextInput
                id="password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••••"
                autoComplete="current-password"
                required
              />
            </Field>
            <button
              type="submit"
              disabled={submitting}
              className="mt-1.5 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-neutral-500">Access is invite-only.</p>
        </div>
      </section>
    </div>
  );
};

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-neutral-900">
        {label}
      </label>
      {children}
    </div>
  );
}

function BrandPanel() {
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
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-800">
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
        <span className="text-base font-semibold tracking-tight text-neutral-900">Toy Gallery</span>
      </div>

      <GalleryMontage />

      <div className="relative z-10 max-w-md">
        <h2 className="m-0 text-[22px] font-semibold tracking-tight text-neutral-900">
          Your collection, shaped to scale.
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
          Record every toy with its silhouette, exact dimensions, and your own notes — see the whole gallery at a
          glance.
        </p>
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
          <MontageTile key={i} tile={tile} staggered={i >= 3} />
        ))}
      </div>
    </div>
  );
}

function MontageTile({ tile, staggered }: { tile: Tile; staggered: boolean }) {
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
        className="absolute left-1/2 -translate-x-1/2 border-[1.25px] border-neutral-800"
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
