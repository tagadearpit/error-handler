"use client";

import { Sparkles } from "lucide-react";

interface QuickActionsProps {
  onSelect: (query: string) => void;
}

const QUICK_ACTIONS = [
  { label: "📅 Scholarship Deadlines", query: "What are the upcoming scholarship application deadlines?" },
  { label: "🏠 Hostel Fee Structure", query: "What is the hostel fee structure for this semester?" },
  { label: "📝 Leave Application", query: "What is the leave application process for students?" },
  { label: "📚 Library Timings", query: "What are the library operating hours?" },
  { label: "💳 Fee Payment Methods", query: "What are the available fee payment methods?" },
  { label: "🎓 Exam Schedule", query: "When are the upcoming exams scheduled?" },
];

export function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 pb-2">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <p className="text-xs text-gray-400 font-medium">Quick Actions</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => onSelect(action.query)}
            className="text-left px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-violet-500/20 rounded-xl text-xs text-gray-400 hover:text-gray-200 transition-all duration-200 group"
          >
            <span className="group-hover:translate-x-0.5 transition-transform inline-block">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
