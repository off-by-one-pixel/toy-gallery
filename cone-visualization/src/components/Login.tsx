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
        <div className="shadow-sm border border-slate-200 rounded-lg mt-6 max-w-96 p-3 mx-auto bg-white">
            <form onSubmit={handleSubmit}>
                <h2 className="font-bold leading-snug tracking-normal text-slate-800 mx-auto my-6 w-full text-2xl lg:max-w-3xl lg:text-4xl">Login</h2>
                <div className="w-full max-w-sm min-w-50">
                    <label className="block mb-2 text-sm text-slate-600 mt-4">Username</label>
                    <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        autoComplete="username"
                        required
                        aria-label="Username"
                    />
                </div>
                <div className="w-full max-w-sm min-w-50">
                    <label className="block mb-2 text-sm text-slate-600 mt-4">Password</label>
                    <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                        type="password"
                        autoComplete="current-password"
                        required
                        aria-label="Password"
                    />
                </div>
                {error && (
                    <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>
                )}
                <Button type="submit" fullWidth className="mt-4" isDisabled={submitting}>
                    {submitting ? 'Signing in…' : 'Login'}
                </Button>
            </form>
        </div>
    );
};

export default LoginPage;
