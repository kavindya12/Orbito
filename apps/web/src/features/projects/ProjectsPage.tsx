import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, type CreateProjectInput } from '@orbito/shared';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, Trash2, Pencil, Loader2, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '@/services/api';
import { useCurrentWorkspace, useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Project } from '@/types';

export function ProjectsPage() {
  const workspace = useCurrentWorkspace();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [error, setError] = useState('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', workspace?.id],
    queryFn: async () => {
      const { data } = await api.get<Project[]>(`/projects/workspace/${workspace!.id}`);
      return data;
    },
    enabled: !!workspace?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({ resolver: zodResolver(createProjectSchema) });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<CreateProjectInput>({ resolver: zodResolver(createProjectSchema) });

  useEffect(() => {
    if (editing) {
      resetEdit({
        name: editing.name,
        description: editing.description ?? '',
        deadline: editing.deadline ? editing.deadline.slice(0, 10) : '',
      });
      setError('');
    }
  }, [editing, resetEdit]);

  const onCreate = async (data: CreateProjectInput) => {
    setError('');
    try {
      await api.post(`/projects/workspace/${workspace!.id}`, {
        ...data,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      reset();
      setCreateOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const onEdit = async (data: CreateProjectInput) => {
    if (!editing) return;
    setError('');
    try {
      await api.patch(`/projects/${editing.id}`, {
        name: data.name,
        description: data.description || null,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!workspace) return <p className="text-[var(--muted)]">Select a workspace.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-[var(--muted)]">{projects.length} active projects</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea {...register('description')} />
              </div>
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Input type="date" {...register('deadline')} />
              </div>
              {error && !editing && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...registerEdit('name')} />
              {editErrors.name && <p className="text-xs text-red-500">{editErrors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...registerEdit('description')} />
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" {...registerEdit('deadline')} />
            </div>
            {error && editing && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={isEditSubmitting} className="w-full">
              {isEditSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <p className="text-[var(--muted)]">Loading projects...</p>
      ) : projects.length === 0 ? (
        <p className="text-[var(--muted)]">No projects yet. Create one to get started.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                role="link"
                tabIndex={0}
                className="glass group relative cursor-pointer overflow-hidden transition-transform hover:-translate-y-1"
                onClick={() => navigate(`/app/projects/${project.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/app/projects/${project.id}`);
                  }
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FolderKanban className="h-5 w-5 shrink-0 text-primary" />
                      <CardTitle className="truncate text-base group-hover:text-primary">
                        {project.name}
                      </CardTitle>
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {user?.id === project.ownerId && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit project"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(project);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete project"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${project.name}"?`)) {
                                deleteMutation.mutate(project.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-[var(--muted)]">
                    {project.description || 'No description'}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant="outline">{project.taskCount ?? 0} tasks</Badge>
                    {project.deadline && (
                      <span className="text-xs text-[var(--muted)]">{formatDate(project.deadline)}</span>
                    )}
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--background)]">
                    <div
                      className="h-full rounded-full ai-gradient"
                      style={{ width: `${project.progress ?? 0}%` }}
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-80 group-hover:opacity-100">
                    Open board <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
