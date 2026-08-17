"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, MessageSquare, Search, Trash2, LogOut, Settings, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { apiGetSessions, apiDeleteSession } from "@/lib/api";
import type { Session } from "@/lib/types";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";

interface ChatSidebarProps {
  currentSessionId?: number | null;
  onNewChat: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function ChatSidebar({ currentSessionId, onNewChat, collapsed, onToggle }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const fetchSessions = async () => {
    try {
      const res = await apiGetSessions();
      setSessions(res.sessions);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    await apiDeleteSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      onNewChat();
    }
  };

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (collapsed) {
    return (
      <div className="w-16 h-full bg-gray-950/80 border-r border-white/5 flex flex-col items-center py-4 gap-3">
        <Button variant="ghost" size="icon" onClick={onToggle} className="text-gray-400">
          <MessageSquare className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNewChat} className="text-gray-400">
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-gray-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            AI Helpdesk
          </h1>
          <Button variant="ghost" size="icon" onClick={onToggle} className="text-gray-400 h-8 w-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={onNewChat} className="w-full gap-2" size="sm">
          <Plus className="w-4 h-4" /> New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-8">
            {search ? "No matching chats" : "No conversations yet"}
          </p>
        ) : (
          filtered.map((session) => (
            <button
              key={session.id}
              onClick={() => router.push(`/chat/${session.id}`)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left group transition-all duration-150",
                currentSessionId === session.id
                  ? "bg-violet-500/15 text-white border border-violet-500/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
              )}
            >
              <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{truncate(session.title, 28)}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {formatRelativeTime(session.updated_at)}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/5 space-y-1">
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-gray-400"
            onClick={() => router.push("/admin/documents")}
          >
            <Settings className="w-4 h-4" /> Admin Panel
          </Button>
        )}
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
            {user?.full_name?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 truncate">{user?.full_name}</p>
            <p className="text-[10px] text-gray-500 capitalize">{user?.role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-gray-500">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
