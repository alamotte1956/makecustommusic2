import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "./db";
import { songs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Represents a single edit operation in the collaborative session
 */
export interface EditOperation {
  id: string;
  userId: string;
  userName: string;
  type: "lyric" | "chord" | "title" | "composer" | "metadata";
  lineNumber: number;
  oldValue: string;
  newValue: string;
  timestamp: number;
  sessionId: string;
}

/**
 * Represents a user's presence in a collaborative session
 */
export interface UserPresence {
  userId: string;
  userName: string;
  cursorLine: number;
  cursorPosition: number;
  isEditing: boolean;
  color: string;
  lastActive: number;
}

/**
 * Represents a collaborative editing session
 */
export interface CollaborativeSession {
  id: string;
  songId: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  participants: Map<string, UserPresence>;
  editHistory: EditOperation[];
  currentAbc: string;
  permissions: Map<string, "view" | "edit" | "admin">;
}

/**
 * Manages collaborative editing sessions with real-time synchronization
 */
export class CollaborativeEditingManager {
  private sessions: Map<string, CollaborativeSession> = new Map();
  private io: SocketIOServer;
  private userColors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.VITE_FRONTEND_URL || "*",
        credentials: true,
      },
    });

    this.setupSocketHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupSocketHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[Collab] User connected: ${socket.id}`);

      // Join a collaborative session
      socket.on("join-session", async (data: { sessionId: string; userId: string; userName: string }) => {
        const { sessionId, userId, userName } = data;
        const session = this.sessions.get(sessionId);

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Add user to session
        const color = this.userColors[session.participants.size % this.userColors.length];
        session.participants.set(userId, {
          userId,
          userName,
          cursorLine: 0,
          cursorPosition: 0,
          isEditing: false,
          color,
          lastActive: Date.now(),
        });

        // Join socket to room
        socket.join(sessionId);

        // Notify others
        this.io.to(sessionId).emit("user-joined", {
          userId,
          userName,
          color,
          participants: Array.from(session.participants.values()),
        });

        // Send current state to joining user
        socket.emit("session-state", {
          currentAbc: session.currentAbc,
          editHistory: session.editHistory,
          participants: Array.from(session.participants.values()),
        });

        console.log(`[Collab] User ${userName} joined session ${sessionId}`);
      });

      // Handle edit operations
      socket.on("edit", async (data: { sessionId: string; userId: string; operation: EditOperation }) => {
        const { sessionId, userId, operation } = data;
        const session = this.sessions.get(sessionId);

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        // Check permissions
        const permission = session.permissions.get(userId);
        if (permission !== "edit" && permission !== "admin") {
          socket.emit("error", { message: "You don't have permission to edit" });
          return;
        }

        // Add operation to history
        session.editHistory.push(operation);
        session.updatedAt = Date.now();

        // Broadcast edit to all users in session
        this.io.to(sessionId).emit("edit-received", {
          operation,
          editCount: session.editHistory.length,
        });

        console.log(`[Collab] Edit in session ${sessionId}: ${operation.type} by ${operation.userName}`);
      });

      // Handle cursor position updates
      socket.on("cursor-move", (data: { sessionId: string; userId: string; line: number; position: number }) => {
        const { sessionId, userId, line, position } = data;
        const session = this.sessions.get(sessionId);

        if (!session) return;

        const presence = session.participants.get(userId);
        if (presence) {
          presence.cursorLine = line;
          presence.cursorPosition = position;
          presence.lastActive = Date.now();

          // Broadcast cursor position to others
          this.io.to(sessionId).emit("cursor-updated", {
            userId,
            line,
            position,
            userName: presence.userName,
            color: presence.color,
          });
        }
      });

      // Handle editing state changes
      socket.on("editing-state", (data: { sessionId: string; userId: string; isEditing: boolean }) => {
        const { sessionId, userId, isEditing } = data;
        const session = this.sessions.get(sessionId);

        if (!session) return;

        const presence = session.participants.get(userId);
        if (presence) {
          presence.isEditing = isEditing;
          presence.lastActive = Date.now();

          this.io.to(sessionId).emit("presence-updated", {
            userId,
            isEditing,
            userName: presence.userName,
            color: presence.color,
          });
        }
      });

      // Leave session
      socket.on("leave-session", (data: { sessionId: string; userId: string }) => {
        const { sessionId, userId } = data;
        const session = this.sessions.get(sessionId);

        if (!session) return;

        const presence = session.participants.get(userId);
        if (presence) {
          session.participants.delete(userId);

          socket.leave(sessionId);

          this.io.to(sessionId).emit("user-left", {
            userId,
            userName: presence.userName,
            participants: Array.from(session.participants.values()),
          });

          // Clean up empty sessions
          if (session.participants.size === 0) {
            this.sessions.delete(sessionId);
            console.log(`[Collab] Session ${sessionId} cleaned up (empty)`);
          }
        }
      });

      // Disconnect handler
      socket.on("disconnect", () => {
        console.log(`[Collab] User disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Create a new collaborative session
   */
  async createSession(
    songId: string,
    userId: string,
    currentAbc: string,
  ): Promise<CollaborativeSession> {
    const sessionId = `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: CollaborativeSession = {
      id: sessionId,
      songId,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      participants: new Map(),
      editHistory: [],
      currentAbc,
      permissions: new Map([[userId, "admin"]]),
    };

    this.sessions.set(sessionId, session);
    console.log(`[Collab] Session created: ${sessionId}`);

    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): CollaborativeSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Add a participant to a session
   */
  addParticipant(
    sessionId: string,
    userId: string,
    permission: "view" | "edit" | "admin" = "edit",
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.permissions.set(userId, permission);
    return true;
  }

  /**
   * Remove a participant from a session
   */
  removeParticipant(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.permissions.delete(userId);
    session.participants.delete(userId);

    if (session.participants.size === 0) {
      this.sessions.delete(sessionId);
    }

    return true;
  }

  /**
   * Save session changes to database
   */
  async saveSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      // Update the song's ABC notation with the final state
      const db = await getDb();
      if (!db) {
        console.error(`[Collab] Database not available for session ${sessionId}`);
        return false;
      }
      await db
        .update(songs)
        .set({
          abcNotation: session.currentAbc,
          updatedAt: new Date(),
        })
        .where(eq(songs.id as any, session.songId as any));

      console.log(`[Collab] Session ${sessionId} saved to database`);
      return true;
    } catch (error) {
      console.error(`[Collab] Error saving session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): CollaborativeSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get sessions for a specific song
   */
  getSessionsForSong(songId: string): CollaborativeSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.songId === songId);
  }
}

// Export singleton instance
let collaborativeManager: CollaborativeEditingManager | null = null;

export function initializeCollaborativeEditing(httpServer: HTTPServer): CollaborativeEditingManager {
  if (!collaborativeManager) {
    collaborativeManager = new CollaborativeEditingManager(httpServer);
  }
  return collaborativeManager;
}

export function getCollaborativeEditingManager(): CollaborativeEditingManager | null {
  return collaborativeManager;
}
