import React from 'react';
import { Users, Circle } from 'lucide-react';
import { type RemoteUser } from '@/hooks/useCollaborativeEditing';

interface ActiveUsersPanelProps {
  remoteUsers: RemoteUser[];
  currentUserName: string;
  currentUserColor: string;
  isConnected: boolean;
}

export function ActiveUsersPanel({
  remoteUsers,
  currentUserName,
  currentUserColor,
  isConnected,
}: ActiveUsersPanelProps) {
  const totalUsers = remoteUsers.length + 1; // +1 for current user

  return (
    <div className="border-l border-border bg-card p-4 w-64">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4" />
        <h3 className="font-semibold text-sm">Collaborators ({totalUsers})</h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
      </div>

      <div className="space-y-3">
        {/* Current user */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-background">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: currentUserColor }}
          >
            {currentUserName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUserName}</p>
            <p className="text-xs text-muted-foreground">You</p>
          </div>
        </div>

        {/* Remote users */}
        {remoteUsers.map(user => (
          <div
            key={user.userId}
            className="flex items-center gap-3 p-2 rounded-lg bg-background hover:bg-accent transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: user.color }}
            >
              {user.userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.userName}</p>
              <div className="flex items-center gap-1">
                <Circle
                  className="w-2 h-2"
                  style={{ fill: user.isEditing ? user.color : 'transparent', color: user.color }}
                />
                <p className="text-xs text-muted-foreground">
                  {user.isEditing ? 'Editing' : 'Viewing'}
                </p>
              </div>
            </div>
          </div>
        ))}

        {remoteUsers.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">No other collaborators yet</p>
            <p className="text-xs text-muted-foreground mt-1">Invite others to join</p>
          </div>
        )}
      </div>

      {/* Connection status */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
