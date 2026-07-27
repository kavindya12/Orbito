import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { disconnectSocket } from '@/services/socket';

export type AuthUser = { id: string; name: string; email: string; avatarUrl?: string | null };
export type Workspace = {
  id: string;
  name: string;
  role?: string;
  projectCount?: number;
  memberCount?: number;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isInitialized: boolean;
  login: (user: AuthUser, accessToken: string, workspaces: Workspace[]) => void;
  setSession: (payload: {
    user: AuthUser;
    accessToken: string;
    workspaces?: Workspace[];
    workspace?: Workspace;
  }) => void;
  setUser: (user: AuthUser) => void;
  setAccessToken: (token: string | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspaceId: (id: string) => void;
  initialize: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      workspaces: [],
      currentWorkspaceId: null,
      isInitialized: false,
      login: (user, accessToken, workspaces) =>
        set({
          user,
          accessToken,
          workspaces,
          currentWorkspaceId: workspaces[0]?.id || get().currentWorkspaceId,
        }),
      setSession: ({ user, accessToken, workspaces, workspace }) =>
        set((state) => {
          const list = workspaces || (workspace ? [workspace] : state.workspaces);
          return {
            user,
            accessToken,
            workspaces: list,
            currentWorkspaceId: workspace?.id || list[0]?.id || state.currentWorkspaceId,
          };
        }),
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setWorkspaces: (workspaces) =>
        set((state) => ({
          workspaces,
          currentWorkspaceId: state.currentWorkspaceId || workspaces[0]?.id || null,
        })),
      setCurrentWorkspaceId: (currentWorkspaceId) => set({ currentWorkspaceId }),
      initialize: () => set({ isInitialized: true }),
      logout: () => {
        disconnectSocket();
        set({ user: null, accessToken: null, workspaces: [], currentWorkspaceId: null });
      },
    }),
    {
      name: 'orbito-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        workspaces: s.workspaces,
        currentWorkspaceId: s.currentWorkspaceId,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ isInitialized: true });
      },
    }
  )
);

export function useCurrentWorkspace() {
  const workspaces = useAuthStore((s) => s.workspaces);
  const currentWorkspaceId = useAuthStore((s) => s.currentWorkspaceId);
  return workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0] || null;
}
