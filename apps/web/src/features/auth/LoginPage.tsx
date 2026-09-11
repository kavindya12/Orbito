import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@orbito/shared';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import api, { getErrorMessage } from '@/services/api';
import { demoLogin, isDemoMode } from '@/services/demo-api';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrbitoLogo } from '@/components/layout/Logo';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');
  const demo = typeof window !== 'undefined' && isDemoMode();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setError('');
    try {
      // GitHub Pages: never call the network (avoids 405)
      if (isDemoMode()) {
        const res = await demoLogin(data.email, data.password);
        login(res.user, res.accessToken, res.workspaces);
        navigate('/app');
        return;
      }
      const res = await api.post('/auth/login', data);
      login(res.data.user, res.data.accessToken, res.data.workspaces ?? []);
      navigate('/app');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex h-dvh items-center justify-center overflow-y-auto bg-[var(--background)] p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <OrbitoLogo size={40} />
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-[var(--muted)]">Sign in to your Orbito workspace</p>
          {demo && (
            <p className="rounded-md bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
              Demo mode — use kavindya@orbito.dev / password123
            </p>
          )}
        </div>
        <Card className="glass">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-[var(--muted)]">
              Demo: kavindya@orbito.dev / password123
              {typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')
                ? ' (works here in demo mode)'
                : ''}
            </p>
            <p className="mt-4 text-center text-sm text-[var(--muted)]">
              No account?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
