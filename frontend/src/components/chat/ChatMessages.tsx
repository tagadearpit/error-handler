"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Sparkles } from "lucide-react";
import { CitationPill } from "./CitationPill";
import { EscalationBanner } from "./EscalationBanner";
import type { ChatMessage, Citation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  citations: Citation[];
  escalation: { ticket_id: number; message: string } | null;
  onCitationClick: (citation: Citation) => void;
}

export function ChatMessages({
  messages,
  streamingContent,
  isStreaming,
  citations,
  escalation,
  onCitationClick,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin">
      {messages.length === 0 && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">AI Helpdesk Assistant</h2>
          <p className="text-gray-400 max-w-md text-sm leading-relaxed">
            Ask me anything about your institution — admissions, fees, schedules, policies, and more.
            I&apos;ll find answers from your knowledge base.
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onCitationClick={onCitationClick}
        />
      ))}

      {/* Streaming response */}
      {isStreaming && streamingContent && (
        <div className="flex gap-3 max-w-3xl mx-auto">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
              </div>
              <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse ml-0.5" />
            </div>
            {/* Citations during streaming */}
            {citations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {citations.map((c, i) => (
                  <CitationPill key={i} citation={c} onClick={() => onCitationClick(c)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Streaming indicator */}
      {isStreaming && !streamingContent && (
        <div className="flex gap-3 max-w-3xl mx-auto">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/5">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      {/* Escalation banner */}
      {escalation && <EscalationBanner ticketId={escalation.ticket_id} message={escalation.message} />}

      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({
  message,
  onCitationClick,
}: {
  message: ChatMessage;
  onCitationClick: (c: Citation) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 max-w-3xl mx-auto", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1",
          isUser
            ? "bg-gradient-to-br from-sky-500 to-blue-600"
            : "bg-gradient-to-br from-violet-500 to-indigo-600",
        )}
      >
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={cn("flex-1 min-w-0", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 border",
            isUser
              ? "bg-gradient-to-r from-sky-600/20 to-blue-600/20 border-sky-500/20 rounded-tr-sm"
              : "bg-white/5 border-white/5 rounded-tl-sm",
          )}
        >
          <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>
        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.citations.map((c, i) => (
              <CitationPill key={i} citation={c} onClick={() => onCitationClick(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
