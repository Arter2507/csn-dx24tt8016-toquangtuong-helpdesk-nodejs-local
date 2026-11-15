export type Value = string | number | boolean | null;
export type Row = Record<string, Value> & { id: number };
export type Resource = 'users' | 'tickets';

export interface Field {
  key: string;
  label: string;
  kind?: 'select' | 'textarea' | 'email';
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
}
