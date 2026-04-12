import { describe, it, expect, beforeEach } from "vitest";
import { CollaborativeEditingManager, type EditOperation, type CollaborativeSession } from "./collaborativeEditing";
import { createServer } from "http";

describe("CollaborativeEditingManager", () => {
  let manager: CollaborativeEditingManager;
  let httpServer: any;

  beforeEach(() => {
    httpServer = createServer();
    manager = new CollaborativeEditingManager(httpServer);
  });

  describe("createSession", () => {
    it("should create a new collaborative session", async () => {
      const session = await manager.createSession("song-123", "user-1", "X: 1\nT: Test");
      
      expect(session).toBeDefined();
      expect(session.songId).toBe("song-123");
      expect(session.createdBy).toBe("user-1");
      expect(session.currentAbc).toBe("X: 1\nT: Test");
      expect(session.participants.size).toBe(0);
      expect(session.editHistory.length).toBe(0);
    });

    it("should set creator as admin", async () => {
      const session = await manager.createSession("song-123", "user-1", "X: 1\nT: Test");
      
      expect(session.permissions.get("user-1")).toBe("admin");
    });

    it("should generate unique session IDs", async () => {
      const session1 = await manager.createSession("song-1", "user-1", "X: 1");
      const session2 = await manager.createSession("song-2", "user-2", "X: 2");
      
      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe("getSession", () => {
    it("should retrieve a session by ID", async () => {
      const created = await manager.createSession("song-123", "user-1", "X: 1");
      const retrieved = manager.getSession(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.songId).toBe("song-123");
    });

    it("should return undefined for non-existent session", () => {
      const session = manager.getSession("non-existent");
      expect(session).toBeUndefined();
    });
  });

  describe("addParticipant", () => {
    it("should add a participant with default edit permission", async () => {
      const session = await manager.createSession("song-123", "user-1", "X: 1");
      const added = manager.addParticipant(session.id, "user-2");
      
      expect(added).toBe(true);
      expect(session.permissions.get("user-2")).toBe("edit");
    });

    it("should add a participant with specific permission", async () => {
      const session = await manager.createSession("song-123", "user-1", "X: 1");
      const added = manager.addParticipant(session.id, "user-2", "view");
      
      expect(added).toBe(true);
      expect(session.permissions.get("user-2")).toBe("view");
    });

    it("should return false for non-existent session", () => {
      const added = manager.addParticipant("non-existent", "user-2");
      expect(added).toBe(false);
    });
  });

  describe("removeParticipant", () => {
    it("should remove a participant", async () => {
      const session = await manager.createSession("song-123", "user-1", "X: 1");
      manager.addParticipant(session.id, "user-2");
      
      const removed = manager.removeParticipant(session.id, "user-2");
      
      expect(removed).toBe(true);
      expect(session.permissions.has("user-2")).toBe(false);
    });

    it("should return false for non-existent session", () => {
      const removed = manager.removeParticipant("non-existent", "user-2");
      expect(removed).toBe(false);
    });
  });

  describe("getSessionsForSong", () => {
    it("should retrieve all sessions for a specific song", async () => {
      const session1 = await manager.createSession("song-1", "user-1", "X: 1");
      const session2 = await manager.createSession("song-1", "user-2", "X: 1");
      const session3 = await manager.createSession("song-2", "user-3", "X: 1");
      
      const sessions = manager.getSessionsForSong("song-1");
      
      expect(sessions.length).toBe(2);
      expect(sessions.map((s) => s.id)).toContain(session1.id);
      expect(sessions.map((s) => s.id)).toContain(session2.id);
      expect(sessions.map((s) => s.id)).not.toContain(session3.id);
    });

    it("should return empty array for song with no sessions", () => {
      const sessions = manager.getSessionsForSong("non-existent-song");
      expect(sessions.length).toBe(0);
    });
  });

  describe("getAllSessions", () => {
    it("should retrieve all active sessions", async () => {
      const session1 = await manager.createSession("song-1", "user-1", "X: 1");
      const session2 = await manager.createSession("song-2", "user-2", "X: 1");
      
      const sessions = manager.getAllSessions();
      
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.map((s) => s.id)).toContain(session1.id);
      expect(sessions.map((s) => s.id)).toContain(session2.id);
    });
  });

  describe("EditOperation", () => {
    it("should create a valid edit operation", () => {
      const operation: EditOperation = {
        id: "op-1",
        userId: "user-1",
        userName: "Alice",
        type: "lyric",
        lineNumber: 5,
        oldValue: "Old lyric",
        newValue: "New lyric",
        timestamp: Date.now(),
        sessionId: "session-1",
      };
      
      expect(operation.type).toBe("lyric");
      expect(operation.oldValue).toBe("Old lyric");
      expect(operation.newValue).toBe("New lyric");
    });
  });

  describe("UserPresence", () => {
    it("should track user presence in session", async () => {
      const session = await manager.createSession("song-123", "user-1", "X: 1");
      
      expect(session.participants.size).toBe(0);
      
      // Simulate user joining (would be done via WebSocket in real usage)
      session.participants.set("user-2", {
        userId: "user-2",
        userName: "Bob",
        cursorLine: 0,
        cursorPosition: 0,
        isEditing: false,
        color: "#FF6B6B",
        lastActive: Date.now(),
      });
      
      expect(session.participants.size).toBe(1);
      const presence = session.participants.get("user-2");
      expect(presence?.userName).toBe("Bob");
    });
  });

  describe("Permission levels", () => {
    it("should enforce different permission levels", async () => {
      const session = await manager.createSession("song-123", "user-1", "X: 1");
      
      manager.addParticipant(session.id, "user-2", "view");
      manager.addParticipant(session.id, "user-3", "edit");
      manager.addParticipant(session.id, "user-4", "admin");
      
      expect(session.permissions.get("user-1")).toBe("admin");
      expect(session.permissions.get("user-2")).toBe("view");
      expect(session.permissions.get("user-3")).toBe("edit");
      expect(session.permissions.get("user-4")).toBe("admin");
    });
  });

  describe("Session cleanup", () => {
    it("should clean up empty sessions when all participants leave", async () => {
      const session = await manager.createSession("song-123", "user-1", "X: 1");
      manager.addParticipant(session.id, "user-2");
      
      manager.removeParticipant(session.id, "user-1");
      manager.removeParticipant(session.id, "user-2");
      
      // Session should be cleaned up
      expect(manager.getSession(session.id)).toBeUndefined();
    });
  });
});
