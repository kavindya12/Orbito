import { useEffect, useState } from 'react';
import { Loader2, Moon, Sun, Check, Save } from 'lucide-react';
import { useUiStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import api, { getErrorMessage } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const workspaces = useAuthStore((s) => s.workspaces);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);

  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.patch<{ user: typeof user }>('/auth/me', { name: name.trim() });
      if (data.user) {
        setUser(data.user);
        setMessage('Profile updated');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-[var(--muted)]">Manage your account and appearance</p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h3 className="text-lg font-semibold">Profile</h3>
          <p className="text-sm text-[var(--muted)]">Update how your name appears across Orbito</p>
        </div>
        <form onSubmit={saveProfile} className="space-y-5 p-6">
          <div className="flex items-center gap-4">
            <UserAvatar name={name || user?.name || 'User'} src={user?.avatarUrl} className="h-16 w-16 text-lg" />
            <div>
              <p className="font-semibold">{name || user?.name}</p>
              <p className="text-sm text-[var(--muted)]">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-name">Display name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-email">Email</Label>
            <Input
              id="settings-email"
              value={user?.email ?? ''}
              disabled
              className="h-11 rounded-xl opacity-70"
            />
            <p className="text-xs text-[var(--muted)]">Email can’t be changed in this version</p>
          </div>

          {workspaces[0] && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/50 px-4 py-3 text-sm">
              <span className="text-[var(--muted)]">Workspace: </span>
              <span className="font-medium">{workspaces[0].name}</span>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}

          <Button type="submit" className="gap-2 rounded-xl" disabled={saving || name.trim() === user?.name}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </form>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h3 className="text-lg font-semibold">Appearance</h3>
          <p className="text-sm text-[var(--muted)]">Choose light or dark mode - saved on this device</p>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={cn(
              'relative rounded-2xl border p-4 text-left transition-all',
              theme === 'light'
                ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                : 'border-[var(--border)] hover:border-primary/40'
            )}
          >
            {theme === 'light' && (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <Sun className="h-5 w-5" />
            </div>
            <p className="font-semibold">Light</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Bright background for daytime use</p>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={cn(
              'relative rounded-2xl border p-4 text-left transition-all',
              theme === 'dark'
                ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                : 'border-[var(--border)] hover:border-primary/40'
            )}
          >
            {theme === 'dark' && (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <Moon className="h-5 w-5" />
            </div>
            <p className="font-semibold">Dark</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Default Orbito look</p>
          </button>
        </div>
        <p className="border-t border-[var(--border)] px-6 py-3 text-sm text-[var(--muted)]">
          Currently using <span className="font-medium text-[var(--text)]">{theme}</span> mode
        </p>
      </section>
    </div>
  );
}
