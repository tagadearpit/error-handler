"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { apiStreamChat } from "@/lib/api";
import type { ChatMessage, Citation, SSEEvent } from "@/lib/types";

interface UseChatReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isStreaming: boolean;
  streamingContent: string;
  citations: Citation[];
  escalation: { ticket_id: number; message: string } | null;
  sessionId: number | null;
  setSessionId: (id: number | null) => void;
  sendMessage: (message: string) => void;
  stopStreaming: () => void;
  error: string | null;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [escalation, setEscalation] = useState<{ ticket_id: number; message: string } | null>(null);
  const [sessionId, setSessionIdState] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const citationsRef = useRef<Citation[]>([]);

  // P1-10: Restore session on mount
  useEffect(() => {
    const savedSession = sessionStorage.getItem("current_chat_session");
    if (savedSession) {
      const id = parseInt(savedSession, 10);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionIdState(id);
      import("@/lib/api").then(({ apiGetSession }) => {
        apiGetSession(id).then((data) => {
          setMessages(data.messages);
        }).catch(() => {
          sessionStorage.removeItem("current_chat_session");
          setSessionIdState(null);
        });
      });
    }
  }, []);

  const setSessionId = useCallback((id: number | null) => {
    setSessionIdState(id);
    if (id) {
      sessionStorage.setItem("current_chat_session", id.toString());
    } else {
      sessionStorage.removeItem("current_chat_session");
    }
  }, []);

  const sendMessage = useCallback(
    (message: string) => {
      setError(null);
      setEscalation(null);

      // Add user message to list
      const userMsg: ChatMessage = {
        id: Date.now(),
        role: "user",
        content: message,
        citations: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingContent("");
      setCitations([]);
      citationsRef.current = [];

      const abort = apiStreamChat(
        message,
        sessionId,
        (event: SSEEvent) => {
          switch (event.type) {
            case "session":
              setSessionId(event.session_id);
              break;
            case "token":
              setStreamingContent((prev) => prev + event.content);
              break;
            case "citations":
              setCitations(event.citations);
              citationsRef.current = event.citations;
              break;
            case "escalation":
              setEscalation({ ticket_id: event.ticket_id, message: event.message });
              break;
            case "done":
              // Finalize: move streaming content into messages
              setStreamingContent((content) => {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: event.message_id,
                    role: "assistant" as const,
                    content,
                    citations: citationsRef.current,
                    created_at: new Date().toISOString(),
                  },
                ]);
                return "";
              });
              break;
          }
        },
        (err: Error) => {
          setError(err.message);
          setIsStreaming(false);
          setStreamingContent(""); // Clear half-rendered message
        },
        () => {
          setIsStreaming(false);
        },
      );

      abortRef.current = abort;
    },
    [sessionId, setSessionId],
  );

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      setIsStreaming(false);
    }
  }, []);

  return {
    messages,
    setMessages,
    isStreaming,
    streamingContent,
    citations,
    escalation,
    sessionId,
    setSessionId,
    sendMessage,
    stopStreaming,
    error,
  };
}
