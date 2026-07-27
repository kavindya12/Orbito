import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';

let socket: Socket | null = null;

export function getSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
      auth: { token },
      autoConnect: true,
    });
  } else {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
  }
  return socket;
}

export function joinProjectRoom(projectId: string) {
  getSocket()?.emit('join:project', projectId);
}

export function leaveProjectRoom(projectId: string) {
  getSocket()?.emit('leave:project', projectId);
}

export function joinWorkspaceRoom(workspaceId: string) {
  getSocket()?.emit('join:workspace', workspaceId);
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
