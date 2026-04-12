import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface RemoteUser {
  userId: string;
  userName: string;
  color: string;
  cursorPosition: number;
  isEditing: boolean;
  lastActive: Date;
}

export interface CollaborativeSession {
  sessionId: string;
  songId: string;
  createdBy: string;
  participants: RemoteUser[];
  content: string;
}

export function useCollaborativeEditing(sessionId: string | null, userId: string, userName: string) {
  const socketRef = useRef<Socket | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionData, setSessionData] = useState<CollaborativeSession | null>(null);

  // Generate a consistent color for the user
  const userColor = useRef<string>('');
  useEffect(() => {
    if (!userColor.current) {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
      userColor.current = colors[userId.charCodeAt(0) % colors.length];
    }
  }, [userId]);

  // Connect to collaborative editing server
  useEffect(() => {
    if (!sessionId) return;

    socketRef.current = io(window.location.origin, {
      path: '/api/socket.io',
      query: { sessionId, userId, userName },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('[Collab] Connected to collaborative session:', sessionId);
      setIsConnected(true);
    });

    socketRef.current.on('session:updated', (session: CollaborativeSession) => {
      console.log('[Collab] Session updated:', session);
      setSessionData(session);
      
      // Update remote users (all except current user)
      const others = session.participants.filter(p => p.userId !== userId);
      setRemoteUsers(others);
    });

    socketRef.current.on('user:joined', (user: RemoteUser) => {
      console.log('[Collab] User joined:', user.userName);
      setRemoteUsers(prev => [...prev, user]);
    });

    socketRef.current.on('user:left', (userId: string) => {
      console.log('[Collab] User left:', userId);
      setRemoteUsers(prev => prev.filter(u => u.userId !== userId));
    });

    socketRef.current.on('cursor:moved', (data: { userId: string; position: number }) => {
      setRemoteUsers(prev =>
        prev.map(u =>
          u.userId === data.userId ? { ...u, cursorPosition: data.position } : u
        )
      );
    });

    socketRef.current.on('user:editing', (data: { userId: string; isEditing: boolean }) => {
      setRemoteUsers(prev =>
        prev.map(u =>
          u.userId === data.userId ? { ...u, isEditing: data.isEditing } : u
        )
      );
    });

    socketRef.current.on('disconnect', () => {
      console.log('[Collab] Disconnected from collaborative session');
      setIsConnected(false);
    });

    socketRef.current.on('error', (error: any) => {
      console.error('[Collab] Socket error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId, userId, userName]);

  // Send cursor position updates
  const updateCursorPosition = useCallback((position: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cursor:move', { position });
    }
  }, []);

  // Send editing state updates
  const setEditingState = useCallback((isEditing: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('user:editing', { isEditing });
    }
  }, []);

  // Send content changes
  const sendContentChange = useCallback((content: string, operation: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('content:changed', { content, operation });
    }
  }, []);

  return {
    isConnected,
    remoteUsers,
    sessionData,
    userColor: userColor.current,
    updateCursorPosition,
    setEditingState,
    sendContentChange,
    socket: socketRef.current,
  };
}
