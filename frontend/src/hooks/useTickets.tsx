"use client";

import { useState, useCallback, useEffect } from "react";
import { apiGetTickets, apiUpdateTicket } from "@/lib/api";
import type { Ticket } from "@/lib/types";

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGetTickets();
      setTickets(res.tickets);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTickets();
  }, [fetchTickets]);

  const updateTicket = useCallback(
    async (ticketId: number, data: { status?: string; assigned_to?: string; resolution_note?: string }) => {
      const updated = await apiUpdateTicket(ticketId, data);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      return updated;
    },
    [],
  );

  return { tickets, loading, error, fetchTickets, updateTicket };
}
