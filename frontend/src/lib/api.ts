/* ── API Client with JWT interceptor ── */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

if (typeof window !== "undefined" && window.location.hostname !== "localhost" && API_BASE.includes("localhost")) {
  console.error(
    "🚨 WARNING: Production frontend is configured to call localhost API. " +
    "You must set NEXT_PUBLIC_API_URL in your Vercel deployment settings to point to your backend."
  );
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("helpdesk_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Auth ──
export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<import("./types").TokenResponse>(res);
}

export async function apiRegister(data: import("./types").RegisterRequest) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<import("./types").TokenResponse>(res);
}

export async function apiGetMe() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders(),
  });
  return handleResponse<import("./types").User>(res);
}

// ── Sessions ──
export async function apiGetSessions() {
  const res = await fetch(`${API_BASE}/sessions`, {
    headers: authHeaders(),
  });
  return handleResponse<import("./types").SessionListResponse>(res);
}

export async function apiGetSession(sessionId: number) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    headers: authHeaders(),
  });
  return handleResponse<import("./types").SessionDetailResponse>(res);
}

export async function apiDeleteSession(sessionId: number) {
  await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

// ── Chat (SSE) ──
export function apiStreamChat(
  message: string,
  sessionId: number | null,
  onEvent: (event: import("./types").SSEEvent) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
) {
  const token = getToken();
  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }
  
  const controller = new AbortController();

  fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: "Stream failed" }));
        throw new Error(body.detail || `Stream failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                onEvent(data);
              } catch {
                // ignore malformed JSON
              }
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          const lines = buffer.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                onEvent(data);
              } catch {
                // ignore
              }
            }
          }
        }
        onComplete();
      } catch (err) {
        throw new Error("Stream interrupted or failed to read.");
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err);
      }
    });

  return () => controller.abort();
}

// ── Documents ──
export async function apiUploadDocument(formData: FormData) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/admin/documents/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  return handleResponse<import("./types").Document>(res);
}

export async function apiGetDocuments() {
  const res = await fetch(`${API_BASE}/admin/documents`, {
    headers: authHeaders(),
  });
  return handleResponse<import("./types").DocumentListResponse>(res);
}

export async function apiDeleteDocument(docId: number) {
  await fetch(`${API_BASE}/admin/documents/${docId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function apiReindexDocument(docId: number) {
  const res = await fetch(`${API_BASE}/admin/documents/${docId}/reindex`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<import("./types").Document>(res);
}

// ── Tickets ──
export async function apiGetTickets() {
  const res = await fetch(`${API_BASE}/admin/tickets`, {
    headers: authHeaders(),
  });
  return handleResponse<import("./types").TicketListResponse>(res);
}

export async function apiUpdateTicket(ticketId: number, data: { status?: string; assigned_to?: string; resolution_note?: string }) {
  const res = await fetch(`${API_BASE}/admin/tickets/${ticketId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<import("./types").Ticket>(res);
}

export async function apiGetMyTickets() {
  const res = await fetch(`${API_BASE}/tickets/mine`, {
    headers: authHeaders(),
  });
  return handleResponse<import("./types").TicketListResponse>(res);
}
