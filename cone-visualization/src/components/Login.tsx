'use client';

import { Button, Input } from '@heroui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '../providers/AuthProvider';

const LoginPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await login(username, password);
            const next = searchParams.get('next') || '/';
            router.replace(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white shadow-sm p-8">
                <div className="mb-6">
                    <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Toy Gallery</h1>
                    <p className="mt-1 text-sm text-neutral-500">Sign in to continue.</p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                            Username
                        </label>
                        <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="username"
                            autoComplete="username"
                            required
                            aria-label="Username"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                            Password
                        </label>
                        <Input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            type="password"
                            autoComplete="current-password"
                            required
                            aria-label="Password"
                        />
                    </div>
                    {error && (
                        <p className="text-xs text-red-600" role="alert">{error}</p>
                    )}
                    <Button type="submit" fullWidth isDisabled={submitting} variant="primary">
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
