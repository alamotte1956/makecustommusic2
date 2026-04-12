import React, { useEffect, useRef } from 'react';
import { type RemoteUser } from '@/hooks/useCollaborativeEditing';

interface CursorTrackerProps {
  remoteUsers: RemoteUser[];
  containerRef: React.RefObject<HTMLDivElement>;
  contentLength: number;
}

export function CursorTracker({ remoteUsers, containerRef, contentLength }: CursorTrackerProps) {
  const cursorsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    remoteUsers.forEach(user => {
      let cursorElement = cursorsRef.current.get(user.userId);

      if (!cursorElement) {
        cursorElement = document.createElement('div');
        cursorElement.className = 'collaborative-cursor';
        cursorElement.style.position = 'absolute';
        cursorElement.style.width = '2px';
        cursorElement.style.height = '20px';
        cursorElement.style.pointerEvents = 'none';
        cursorElement.style.zIndex = '1000';
        cursorElement.style.backgroundColor = user.color;
        cursorElement.style.opacity = '0.8';
        cursorElement.style.boxShadow = `0 0 4px ${user.color}`;
        
        const label = document.createElement('div');
        label.className = 'collaborative-cursor-label';
        label.style.position = 'absolute';
        label.style.top = '-20px';
        label.style.left = '0';
        label.style.backgroundColor = user.color;
        label.style.color = 'white';
        label.style.padding = '2px 4px';
        label.style.borderRadius = '2px';
        label.style.fontSize = '11px';
        label.style.fontWeight = 'bold';
        label.style.whiteSpace = 'nowrap';
        label.style.pointerEvents = 'none';
        label.textContent = user.userName;
        
        cursorElement.appendChild(label);
        containerRef.current?.appendChild(cursorElement);
        cursorsRef.current.set(user.userId, cursorElement);
      }

      // Calculate position based on cursor position in content
      // This is a simplified approach - in production, you'd calculate based on actual text layout
      const percentage = contentLength > 0 ? (user.cursorPosition / contentLength) * 100 : 0;
      const container = containerRef.current;
      if (container) {
        const containerHeight = container.scrollHeight;
        const estimatedLineHeight = 24; // Approximate line height
        const estimatedLine = Math.floor((percentage / 100) * (containerHeight / estimatedLineHeight));
        const estimatedTop = estimatedLine * estimatedLineHeight;
        
        cursorElement.style.top = `${estimatedTop}px`;
        cursorElement.style.left = `${(user.cursorPosition % 80) * 8}px`; // Rough horizontal position
      }
    });

    // Remove cursors for users that are no longer present
    cursorsRef.current.forEach((element, userId) => {
      if (!remoteUsers.find(u => u.userId === userId)) {
        element.remove();
        cursorsRef.current.delete(userId);
      }
    });
  }, [remoteUsers, containerRef, contentLength]);

  return null; // This component only manages DOM elements
}
