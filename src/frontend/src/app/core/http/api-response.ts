export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: PageMeta | null;
}
