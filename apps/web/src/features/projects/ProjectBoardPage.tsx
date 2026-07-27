import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Plus, GripVertical, Loader2, UserPlus } from 'lucide-react';
import api, { getErrorMessage } from '@/services/api';
import { joinProjectRoom, leaveProjectRoom, getSocket } from '@/services/socket';
import { useCurrentWorkspace } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge, PriorityBadge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskDrawer } from '@/features/tasks/TaskDrawer';
import { cn, formatDate } from '@/lib/utils';
import type { Project, Task, BoardColumn, User } from '@/types';

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--background)] p-3 shadow-sm hover:border-primary/40"
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-[var(--muted)]"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">{task.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            {task.dueDate && <span className="text-xs text-[var(--muted)]">{formatDate(task.dueDate)}</span>}
          </div>
          {task.assignee && (
            <div className="flex items-center gap-2">
              <UserAvatar name={task.assignee.name} src={task.assignee.avatarUrl} className="h-6 w-6" />
              <span className="text-xs text-[var(--muted)]">{task.assignee.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onAddClick,
  onTaskClick,
}: {
  column: BoardColumn;
  tasks: Task[];
  onAddClick: (columnId: string) => void;
  onTaskClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[280px] shrink-0 flex-col rounded-[16px] border border-[var(--border)] bg-[var(--card)] ${
        isOver ? 'ring-2 ring-primary/40' : ''
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] p-3">
        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: column.color }} />
        <h3 className="truncate font-medium">{column.name}</h3>
        <Badge variant="outline" className="ml-auto shrink-0">
          {tasks.length}
        </Badge>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>
      <div className="shrink-0 border-t border-[var(--border)] p-3">
        <Button variant="ghost" size="sm" className="w-full gap-2" onClick={() => onAddClick(column.id)}>
          <Plus className="h-4 w-4" /> Add task
        </Button>
      </div>
    </div>
  );
}

export function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const workspace = useCurrentWorkspace();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const selectedTaskId = searchParams.get('task');

  const [addOpen, setAddOpen] = useState(false);
  const [addColumnId, setAddColumnId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newAssigneeId, setNewAssigneeId] = useState<string | null>(null);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data } = await api.get<Project>(`/projects/${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });

  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ['workspace-members', workspace?.id],
    queryFn: async () => {
      const { data } = await api.get<Array<{ user: User }>>(`/workspaces/${workspace!.id}/members`);
      return data.map((m) => m.user);
    },
    enabled: !!workspace?.id,
  });

  const assignees =
    workspaceMembers.length > 0 ? workspaceMembers : (project?.members?.map((m) => m.user) ?? []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (!projectId) return;
    joinProjectRoom(projectId);
    const socket = getSocket();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    socket?.on('task:created', invalidate);
    socket?.on('task:updated', invalidate);
    socket?.on('task:moved', invalidate);
    socket?.on('task:deleted', invalidate);
    return () => {
      leaveProjectRoom(projectId);
      socket?.off('task:created', invalidate);
      socket?.off('task:updated', invalidate);
      socket?.off('task:moved', invalidate);
      socket?.off('task:deleted', invalidate);
    };
  }, [projectId, queryClient]);

  const openAddDialog = (columnId: string) => {
    setAddColumnId(columnId);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('MEDIUM');
    setNewAssigneeId(null);
    setAddError('');
    setAddOpen(true);
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !projectId || !addColumnId) return;
    setAdding(true);
    setAddError('');
    try {
      await api.post(`/tasks/project/${projectId}`, {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        columnId: addColumnId,
        priority: newPriority,
        assigneeId: newAssigneeId,
      });
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setAddOpen(false);
    } catch (err) {
      setAddError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !project) return;

    const taskId = active.id as string;
    let columnId = over.data.current?.task
      ? (over.data.current.task as Task).columnId
      : (over.id as string);
    const overTask = over.data.current?.task as Task | undefined;

    const column = project.columns?.find(
      (c) => c.id === columnId || c.tasks?.some((t) => t.id === over.id)
    );
    if (column) columnId = column.id;

    const tasksInColumn = column?.tasks ?? [];
    let position = overTask
      ? tasksInColumn.findIndex((t) => t.id === overTask.id)
      : tasksInColumn.length;
    if (position < 0) position = tasksInColumn.length;

    try {
      await api.post(`/tasks/${taskId}/move`, { columnId, position });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    } catch {
      /* ignore */
    }
  };

  if (isLoading) return <p className="text-[var(--muted)]">Loading board...</p>;
  if (!project) return <p className="text-[var(--muted)]">Project not found</p>;

  const addColumnName = project.columns?.find((c) => c.id === addColumnId)?.name ?? '';

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-3 overflow-hidden lg:h-[calc(100vh-5.5rem)]">
      <div className="flex shrink-0 flex-wrap items-center gap-4">
        <Link to="/app/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold">{project.name}</h2>
          <p className="line-clamp-1 text-sm text-[var(--muted)]">{project.description}</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => openAddDialog(project.columns?.[0]?.id ?? '')}
          disabled={!project.columns?.length}
        >
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        autoScroll={false}
      >
        <div className="kanban-scroll min-h-0 flex-1 rounded-[16px] border border-[var(--border)] bg-[var(--background)]/40 p-3">
          <div className="flex h-full w-max items-stretch gap-4">
            {project.columns?.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={column.tasks ?? []}
                onAddClick={openAddDialog}
                onTaskClick={(task) => setSearchParams({ task: task.id })}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="w-[260px] rounded-[12px] border border-primary bg-[var(--card)] p-3 shadow-lg">
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add task{addColumnName ? ` · ${addColumnName}` : ''}</DialogTitle>
          </DialogHeader>
          <form onSubmit={createTask} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What needs to be done?"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Add more details (optional)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={newPriority} onValueChange={setNewPriority}>
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
            </div>

            <div className="space-y-3 rounded-[12px] border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <Label className="text-primary">Assign to someone</Label>
              </div>
              <p className="text-xs text-[var(--muted)]">Click a person below to assign this task</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setNewAssigneeId(null)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    newAssigneeId === null
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
                    onClick={() => setNewAssigneeId(u.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      newAssigneeId === u.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-[var(--border)] hover:border-primary/50'
                    )}
                  >
                    <UserAvatar
                      name={u.name}
                      src={u.avatarUrl}
                      className={cn('h-6 w-6', newAssigneeId === u.id && 'ring-2 ring-white/40')}
                    />
                    {u.name}
                  </button>
                ))}
              </div>
              {assignees.length === 0 && (
                <p className="text-xs text-amber-500">
                  No teammates yet - invite people from the Team page first.
                </p>
              )}
              {newAssigneeId && (
                <p className="text-xs text-primary">
                  Assigned to {assignees.find((u) => u.id === newAssigneeId)?.name}
                </p>
              )}
            </div>

            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <Button type="submit" className="w-full" disabled={!newTitle.trim() || adding}>
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              Create task
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <TaskDrawer
        taskId={selectedTaskId}
        project={project}
        workspaceMembers={assignees}
        open={!!selectedTaskId}
        onClose={() => setSearchParams({})}
      />
    </div>
  );
}
