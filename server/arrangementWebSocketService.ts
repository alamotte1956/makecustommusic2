/**
 * Arrangement WebSocket Service
 * 
 * Handles WebSocket connections for real-time arrangement generation
 * updates with bidirectional communication.
 */

import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";

export interface WebSocketMessage {
  type: "subscribe" | "unsubscribe" | "progress" | "complete" | "error" | "ping" | "pong";
  streamId?: string;
  data?: any;
  timestamp?: number;
}

export class ArrangementWebSocketService {
  private wss: WebSocketServer;
  private clients = new Map<string, Set<WebSocket>>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: "/ws/arrangement" });

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      console.log("[WebSocket] New client connected");

      // Send welcome message
      this.sendMessage(ws, {
        type: "ping",
        timestamp: Date.now()
      });

      ws.on("message", (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
          this.sendError(ws, "Invalid message format");
        }
      });

      ws.on("close", () => {
        console.log("[WebSocket] Client disconnected");
        this.removeClient(ws);
      });

      ws.on("error", (error: Error) => {
        console.error("[WebSocket] Error:", error);
      });
    });

    // Start heartbeat to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: any) => {
        if ((ws as any).isAlive === false) {
          return ws.terminate();
        }
        (ws as any).isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    switch (message.type) {
      case "subscribe":
        this.subscribeToStream(ws, message.streamId || "");
        break;

      case "unsubscribe":
        this.unsubscribeFromStream(ws, message.streamId || "");
        break;

      case "ping":
        this.sendMessage(ws, {
          type: "pong",
          timestamp: Date.now()
        });
        break;

      default:
        console.warn("[WebSocket] Unknown message type:", message.type);
    }
  }

  /**
   * Subscribe a client to a stream
   */
  private subscribeToStream(ws: WebSocket, streamId: string): void {
    if (!streamId) {
      this.sendError(ws, "Stream ID is required");
      return;
    }

    if (!this.clients.has(streamId)) {
      this.clients.set(streamId, new Set());
    }

    this.clients.get(streamId)!.add(ws);
    (ws as any).streamId = streamId;

    console.log(`[WebSocket] Client subscribed to stream: ${streamId}`);

    this.sendMessage(ws, {
      type: "progress",
      data: {
        message: `Connected to stream: ${streamId}`,
        percentage: 0
      },
      timestamp: Date.now()
    });
  }

  /**
   * Unsubscribe a client from a stream
   */
  private unsubscribeFromStream(ws: WebSocket, streamId: string): void {
    const clients = this.clients.get(streamId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.clients.delete(streamId);
      }
    }

    console.log(`[WebSocket] Client unsubscribed from stream: ${streamId}`);
  }

  /**
   * Remove a client from all streams
   */
  private removeClient(ws: WebSocket): void {
    const streamId = (ws as any).streamId;
    if (streamId) {
      this.unsubscribeFromStream(ws, streamId);
    }
  }

  /**
   * Broadcast a progress update to all clients in a stream
   */
  broadcastProgress(streamId: string, data: any): void {
    const clients = this.clients.get(streamId);
    if (!clients) return;

    const message: WebSocketMessage = {
      type: "progress",
      streamId,
      data,
      timestamp: Date.now()
    };

    clients.forEach((ws) => {
      this.sendMessage(ws, message);
    });
  }

  /**
   * Broadcast a part generation completion
   */
  broadcastPartGenerated(streamId: string, partName: string, melodyLine: any): void {
    const clients = this.clients.get(streamId);
    if (!clients) return;

    const message: WebSocketMessage = {
      type: "progress",
      streamId,
      data: {
        type: "part_generated",
        partName,
        melodyLine
      },
      timestamp: Date.now()
    };

    clients.forEach((ws) => {
      this.sendMessage(ws, message);
    });
  }

  /**
   * Broadcast completion to all clients in a stream
   */
  broadcastComplete(streamId: string, data?: any): void {
    const clients = this.clients.get(streamId);
    if (!clients) return;

    const message: WebSocketMessage = {
      type: "complete",
      streamId,
      data: data || { message: "Arrangement generation complete" },
      timestamp: Date.now()
    };

    clients.forEach((ws) => {
      this.sendMessage(ws, message);
    });

    // Clean up stream
    this.clients.delete(streamId);
  }

  /**
   * Broadcast an error to all clients in a stream
   */
  broadcastError(streamId: string, error: string): void {
    const clients = this.clients.get(streamId);
    if (!clients) return;

    const message: WebSocketMessage = {
      type: "error",
      streamId,
      data: { error },
      timestamp: Date.now()
    };

    clients.forEach((ws) => {
      this.sendMessage(ws, message);
    });
  }

  /**
   * Send a message to a specific client
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send an error message to a client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: "error",
      data: { error },
      timestamp: Date.now()
    });
  }

  /**
   * Get the number of active connections
   */
  getActiveConnections(): number {
    return this.wss.clients.size;
  }

  /**
   * Get the number of clients in a specific stream
   */
  getStreamSubscribers(streamId: string): number {
    return this.clients.get(streamId)?.size || 0;
  }

  /**
   * Shutdown the WebSocket service
   */
  shutdown(): void {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}

export default ArrangementWebSocketService;
