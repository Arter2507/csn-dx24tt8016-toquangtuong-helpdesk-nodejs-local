export interface Category { id: number; code: string; name: string; isActive: boolean; }
export interface CategoryInput { code: string; name: string; }
export interface CategoryUpdate { name: string; isActive: boolean; }
export interface PageMeta { page: number; pageSize: number; totalItems: number; totalPages: number; }
export interface ApiResponse<T> { success: boolean; data: T; meta: PageMeta | null; }
