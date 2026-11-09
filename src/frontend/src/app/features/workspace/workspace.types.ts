export type Value = string | number | boolean | null;
export type Row = Record<string, Value> & { id: number };
export type Resource = 'users' | 'tickets';
export interface Field {
  key: string;
  label: string;
  kind?: 'select' | 'textarea';
  options?: { value: Value; label: string }[];
  createOnly?: boolean;
  editOnly?: boolean;
}
