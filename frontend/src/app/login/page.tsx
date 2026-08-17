"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Mail, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/chat");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950 bg-grid-pattern">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/25">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to AI Helpdesk</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </Button>

          <p className="text-center text-xs text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 transition-colors">
              Create one
            </Link>
          </p>
        </form>

        {/* Demo credentials */}
        <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium">Demo Accounts</p>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-400">
            <button onClick={() => { setEmail("admin@helpdesk.edu"); setPassword("admin1234"); }} className="text-left px-2 py-1 hover:bg-white/5 rounded transition-colors">
              🛡️ admin@helpdesk.edu
            </button>
            <button onClick={() => { setEmail("student@helpdesk.edu"); setPassword("student1234"); }} className="text-left px-2 py-1 hover:bg-white/5 rounded transition-colors">
              🎓 student@helpdesk.edu
            </button>
            <button onClick={() => { setEmail("faculty@helpdesk.edu"); setPassword("faculty1234"); }} className="text-left px-2 py-1 hover:bg-white/5 rounded transition-colors">
              📚 faculty@helpdesk.edu
            </button>
            <button onClick={() => { setEmail("support@helpdesk.edu"); setPassword("support1234"); }} className="text-left px-2 py-1 hover:bg-white/5 rounded transition-colors">
              🎧 support@helpdesk.edu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
