"use client";

import { useState } from "react";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { CitationModal } from "@/components/chat/CitationModal";
import { QuickActions } from "@/components/chat/QuickActions";
import { useChat } from "@/hooks/useChat";
import type { Citation } from "@/lib/types";

export default function ChatPage() {
  const chat = useChat();
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const handleQuickAction = (query: string) => {
    chat.sendMessage(query);
  };

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

        {/* Quick actions — only show when no messages */}
        {chat.messages.length === 0 && !chat.isStreaming && (
          <QuickActions onSelect={handleQuickAction} />
        )}

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
