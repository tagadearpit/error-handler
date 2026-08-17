/* ── TypeScript interfaces matching backend schemas ── */

export type UserRole = "student" | "faculty" | "admin" | "support";
export type AccessLevel = "public" | "student" | "faculty" | "admin" | "support";
export type DocumentStatus = "pending" | "processing" | "processed" | "failed";
export type MessageRole = "user" | "assistant" | "system";
export type TicketStatus = "open" | "in_progress" | "resolved";

// ── Auth ──
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department?: string;
}

// ── Documents ──
export interface Document {
  id: number;
  title: string;
  filename: string;
  mime_type: string;
  access_level: AccessLevel;
  department: string | null;
  status: DocumentStatus;
  chunk_count: number;
  uploaded_by: number;
  created_at: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

// ── Chat ──
export interface Citation {
  chunk_id: number;
  document_id: number;
  document_title: string;
  page_number: number | null;
  quote: string;
}

export interface ChatMessage {
  id: number;
  role: MessageRole;
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export interface Session {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SessionListResponse {
  sessions: Session[];
}

export interface SessionDetailResponse {
  session: Session;
  messages: ChatMessage[];
}

// ── Tickets ──
export interface Ticket {
  id: number;
  session_id: number | null;
  user_id: number;
  query: string;
  status: TicketStatus;
  department: string | null;
  assigned_to: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
}

// ── SSE Events ──
export interface SSESessionEvent {
  type: "session";
  session_id: number;
}

export interface SSETokenEvent {
  type: "token";
  content: string;
}

export interface SSECitationsEvent {
  type: "citations";
  citations: Citation[];
}

export interface SSEEscalationEvent {
  type: "escalation";
  ticket_id: number;
  message: string;
}

export interface SSEDoneEvent {
  type: "done";
  message_id: number;
}

export type SSEEvent =
  | SSESessionEvent
  | SSETokenEvent
  | SSECitationsEvent
  | SSEEscalationEvent
  | SSEDoneEvent;
