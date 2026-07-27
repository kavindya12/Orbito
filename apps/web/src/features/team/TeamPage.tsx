import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inviteMemberSchema } from '@orbito/shared';
import { z } from 'zod';
import { Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import api, { getErrorMessage } from '@/services/api';
import { useCurrentWorkspace } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import type { WorkspaceMember } from '@/types';

type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export function TeamPage() {
  const workspace = useCurrentWorkspace();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', workspace?.id],
    queryFn: async () => {
      const { data } = await api.get<WorkspaceMember[]>(`/workspaces/${workspace!.id}/members`);
      return data;
    },
    enabled: !!workspace?.id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<InviteMemberInput>({ resolver: zodResolver(inviteMemberSchema) });

  const inviteMutation = useMutation({
    mutationFn: (data: InviteMemberInput) => api.post(`/workspaces/${workspace!.id}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      reset();
      setOpen(false);
    },
  });

  const onInvite = async (data: InviteMemberInput) => {
    setError('');
    try {
      await inviteMutation.mutateAsync(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!workspace) return <p className="text-[var(--muted)]">Select a workspace.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team</h2>
          <p className="text-[var(--muted)]">{members.length} members</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" /> Invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...register('email')} />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Invite
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-[var(--muted)]">Loading team...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id} className="glass">
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <UserAvatar name={m.user.name} src={m.user.avatarUrl} className="h-12 w-12" />
                <div>
                  <CardTitle className="text-base">{m.user.name}</CardTitle>
                  <p className="text-sm text-[var(--muted)]">{m.user.email}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{m.role}</Badge>
                  <span className="text-xs text-[var(--muted)]">
                    {m.completedTasks ?? 0}/{m.assignedTasks ?? 0} tasks done
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
