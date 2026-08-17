"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, isStreaming, onStop, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-white/5 bg-gray-950/50 backdrop-blur-xl px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-violet-500/30 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent text-gray-100 placeholder:text-gray-500 text-sm resize-none focus:outline-none min-h-[36px] max-h-[200px] py-1.5"
          />
          {isStreaming ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={onStop}
              className="h-8 w-8 rounded-xl shrink-0"
            >
              <Square className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              className="h-8 w-8 rounded-xl shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-2">
          AI responses are grounded in uploaded documents. Always verify critical information.
        </p>
      </div>
    </div>
  );
}
