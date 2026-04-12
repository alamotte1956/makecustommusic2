import React, { createContext, useContext, ReactNode } from 'react';
import { useCollaborativeEditing, type RemoteUser } from '@/hooks/useCollaborativeEditing';

interface CollaborativeEditingContextType {
  isConnected: boolean;
  remoteUsers: RemoteUser[];
  userColor: string;
  updateCursorPosition: (position: number) => void;
  setEditingState: (isEditing: boolean) => void;
  sendContentChange: (content: string, operation: any) => void;
}

const CollaborativeEditingContext = createContext<CollaborativeEditingContextType | null>(null);

interface CollaborativeEditingProviderProps {
  sessionId: string | null;
  userId: string;
  userName: string;
  children: ReactNode;
}

export function CollaborativeEditingProvider({
  sessionId,
  userId,
  userName,
  children,
}: CollaborativeEditingProviderProps) {
  const {
    isConnected,
    remoteUsers,
    userColor,
    updateCursorPosition,
    setEditingState,
    sendContentChange,
  } = useCollaborativeEditing(sessionId, userId, userName);

  return (
    <CollaborativeEditingContext.Provider
      value={{
        isConnected,
        remoteUsers,
        userColor,
        updateCursorPosition,
        setEditingState,
        sendContentChange,
      }}
    >
      {children}
    </CollaborativeEditingContext.Provider>
  );
}

export function useCollaborativeEditingContext() {
  const context = useContext(CollaborativeEditingContext);
  if (!context) {
    throw new Error(
      'useCollaborativeEditingContext must be used within CollaborativeEditingProvider'
    );
  }
  return context;
}
