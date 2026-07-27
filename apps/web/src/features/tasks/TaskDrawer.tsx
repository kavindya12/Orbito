import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Paperclip, Send, Trash2, UserPlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import api, { getErrorMessage } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { cn, formatDate } from '@/lib/utils';
import type { Project, Task, User } from '@/types';

type TaskDrawerProps = {
  taskId: string | null;
  project: Project;
  workspaceMembers?: User[];
  open: boolean;
  onClose: () => void;
};

export function TaskDrawer({ taskId, project, workspaceMembers = [], open, onClose }: TaskDrawerProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const assignees =
    workspaceMembers.length > 0 ? workspaceMembers : (project.members?.map((m) => m.user) ?? []);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data } = await api.get<Task>(`/tasks/${taskId}`);
      return data;
    },
    enabled: !!taskId && open,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.patch(`/tasks/${taskId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const commentMutation = useMutation({
    mutationFn: (message: string) => api.post(`/comments/task/${taskId}`, { message }),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      onClose();
    },
  });

  const uploadAttachment = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post(`/comments/task/${taskId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="font-semibold">Task Details</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate()}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {isLoading || !task ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                defaultValue={task.title}
                onBlur={(e) => e.target.value !== task.title && updateMutation.mutate({ title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                defaultValue={task.description ?? ''}
                rows={4}
                onBlur={(e) =>
                  e.target.value !== (task.description ?? '') &&
                  updateMutation.mutate({ description: e.target.value || null })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  defaultValue={task.priority}
                  onValueChange={(v) => updateMutation.mutate({ priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="space-y-2">
                <Label>Column</Label>
                <Select
                  defaultValue={task.columnId}
                  onValueChange={(v) => updateMutation.mutate({ columnId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {project.columns?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                onChange={(e) =>
                  updateMutation.mutate({
                    dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
              {task.dueDate && <p className="text-xs text-[var(--muted)]">{formatDate(task.dueDate)}</p>}
            </div>

            <div className="space-y-3 rounded-[12px] border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <Label className="text-primary">Assign to someone</Label>
              </div>
              <p className="text-xs text-[var(--muted)]">Click a person to assign this task</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateMutation.mutate({ assigneeId: null })}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    !task.assigneeId
                      ? 'border-primary bg-primary text-white'
                      : 'border-[var(--border)] hover:border-primary/50'
                  )}
                >
                  Unassigned
                </button>
                {assignees.map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => updateMutation.mutate({ assigneeId: u.id })}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      task.assigneeId === u.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-[var(--border)] hover:border-primary/50'
                    )}
                  >
                    <UserAvatar name={u.name} src={u.avatarUrl} className="h-6 w-6" />
                    {u.name}
                  </button>
                ))}
              </div>
              {assignees.length === 0 && (
                <p className="text-xs text-amber-500">
                  Invite people under Team to assign tasks.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Attachments</Label>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-4 w-4" /> Upload
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadAttachment(e.target.files[0])}
                />
              </div>
              {task.attachments?.map((a) => (
                <a
                  key={a.id}
                  href={a.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-[10px] border border-[var(--border)] p-2 text-sm hover:bg-[var(--background)]"
                >
                  <Paperclip className="h-4 w-4" />
                  {a.fileName}
                </a>
              ))}
            </div>

            <div className="space-y-3">
              <Label>Comments</Label>
              {task.comments?.map((c) => (
                <div key={c.id} className="rounded-[12px] border border-[var(--border)] p-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={c.user.name} src={c.user.avatarUrl} className="h-6 w-6" />
                    <span className="text-sm font-medium">{c.user.name}</span>
                  </div>
                  <p className="mt-2 text-sm">{c.message}</p>
                </div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (comment.trim()) commentMutation.mutate(comment.trim());
                }}
                className="flex gap-2"
              >
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." />
                <Button type="submit" size="icon" disabled={commentMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}
      </div>
    </>
  );
}
