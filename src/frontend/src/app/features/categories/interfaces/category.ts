export interface Category {
  id: number;
  code: string;
  name: string;
  parentId?: number | null;
  isActive: boolean;
}
export interface CategoryInput {
  code: string;
  name: string;
  parentId?: number | null;
}
export type CategoryUpdate = Partial<Pick<Category, 'name' | 'isActive' | 'parentId'>>;
