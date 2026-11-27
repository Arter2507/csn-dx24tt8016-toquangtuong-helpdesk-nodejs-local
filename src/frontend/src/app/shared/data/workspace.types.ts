export type Value = string | number | boolean | null;
export type Row = Record<string, Value> & { id: number };
export type Resource = 'users' | 'tickets';
export interface TicketLink {
  id: number;
  code: string;
}
export interface TicketDetails {
  attachments?: Attachment[];
  history?: TicketEvent[];
  mergedInto?: TicketLink;
  mergedTickets?: TicketLink[];
}

export interface Field {
  key: string;
  label: string;
  kind?: 'select' | 'textarea' | 'email' | 'password';
  options?: ReadonlyArray<{ value: Value; label: string }>;
  placeholder?: string;
  maxLength?: number;
  optional?: boolean;
  wide?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface TicketEvent {
  status: string;
  at: string;
  note?: string;
}

export interface TicketComment {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
  internal: boolean;
  firstResponseAt?: string;
  ticketUpdate?: { status: string; version: number; at: string };
}
