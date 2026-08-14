// Shared HTTP-backed metadata store (V1 indexer).
//
// Talks to indexer/server.mjs (or any compatible backend). This makes events and
// ticket issuance visible to EVERY connected user, fixing the localStorage
// per-device limitation. See README "Known Limitations #3".

import type { Event } from '../../types';
import { type CreateEventArgs, type MetadataStore, type TicketIssue } from './store';

export class HttpMetadataStore implements MetadataStore {
  constructor(private readonly baseUrl: string) {}

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`indexer ${res.status}: ${text || res.statusText}`);
    }
    return (await res.json()) as T;
  }

  async createEvent(args: CreateEventArgs): Promise<Event> {
    return this.req<Event>('/events', { method: 'POST', body: JSON.stringify(args) });
  }

  async getEvent(eventId: string): Promise<Event | null> {
    try {
      return await this.req<Event>(`/events/${encodeURIComponent(eventId)}`);
    } catch {
      return null;
    }
  }

  async listEvents(): Promise<Event[]> {
    return this.req<Event[]>('/events');
  }

  async issueTicket(ev: TicketIssue): Promise<void> {
    await this.req('/tickets', { method: 'POST', body: JSON.stringify(ev) });
  }

  async listTicketsForEvent(eventId: string): Promise<TicketIssue[]> {
    const list = await this.req<TicketIssue[]>(
      `/tickets?eventId=${encodeURIComponent(eventId)}`,
    );
    return list;
  }

  async listTicketsForOwner(owner: string): Promise<Array<TicketIssue & { event: Event }>> {
    const list = await this.req<TicketIssue[]>(`/tickets?owner=${encodeURIComponent(owner)}`);
    const events = await Promise.all(
      list.map((t) => this.getEvent(t.eventId).then((e) => e ?? null)),
    );
    return list
      .map((t, i) => (events[i] ? { ...t, event: events[i]! } : null))
      .filter((x): x is TicketIssue & { event: Event } => x !== null);
  }

  async listHolders(eventId: string): Promise<string[]> {
    const list = await this.listTicketsForEvent(eventId);
    return list.map((t) => t.owner);
  }
}
