"use client";

import { useState, useEffect, use } from "react";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { CitationModal } from "@/components/chat/CitationModal";
import { useChat } from "@/hooks/useChat";
import { apiGetSession } from "@/lib/api";
import type { Citation } from "@/lib/types";

export default function SessionChatPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const chat = useChat();
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionIdNum = parseInt(sessionId, 10);
        const data = await apiGetSession(sessionIdNum);
        chat.setSessionId(sessionIdNum);
        chat.setMessages(data.messages);
      } catch (err) {
        console.error("Failed to load session:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0">
        <ChatMessages
          messages={chat.messages}
          streamingContent={chat.streamingContent}
          isStreaming={chat.isStreaming}
          citations={chat.citations}
          escalation={chat.escalation}
          onCitationClick={(c) => setSelectedCitation(c)}
        />

        <ChatInput
          onSend={chat.sendMessage}
          isStreaming={chat.isStreaming}
          onStop={chat.stopStreaming}
        />
      </div>

      <CitationModal
        citation={selectedCitation}
        open={!!selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </>
  );
}
