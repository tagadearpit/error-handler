"use client";

import { useState } from "react";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { CitationModal } from "@/components/chat/CitationModal";
import { QuickActions } from "@/components/chat/QuickActions";
import { useChat } from "@/hooks/useChat";
import type { Citation } from "@/lib/types";
import { AlertCircle } from "lucide-react";

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

        {/* Error Banner */}
        {chat.error && (
          <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-200 font-medium">Error</p>
              <p className="text-xs text-red-300 mt-0.5">{chat.error}</p>
            </div>
          </div>
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
