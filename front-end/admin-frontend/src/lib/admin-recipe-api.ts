import { adminFetch, parseAdminResponse } from "./admin-api";

export type RecipeComponent = {
  item: string | null;
  name: string | null;
  sku: string | null;
  unit: string | null;
  quantity: number;
  unitCost: number;
  cost: number;
};

export type AdminRecipe = {
  id: string;
  product: number;
  productName: string | null;
  variant: string;
  components: RecipeComponent[];
  estimatedCost: number;
  active: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type RecipeComponentInput = { itemId: number; quantity: number };

export type RecipeInput = {
  product: number;
  variant?: string;
  components: RecipeComponentInput[];
  notes?: string;
};

export async function getRecipes(filters: { product?: number; active?: boolean } = {}): Promise<AdminRecipe[]> {
  const query = new URLSearchParams();
  if (filters.product !== undefined) query.set("product", String(filters.product));
  if (filters.active !== undefined) query.set("active", String(filters.active));
  const qs = query.toString();

  const response = await adminFetch(`/admin/recipes${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  return parseAdminResponse<AdminRecipe[]>(response);
}

export async function createRecipe(input: RecipeInput): Promise<AdminRecipe> {
  const response = await adminFetch(`/admin/recipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminRecipe>(response);
}

export async function updateRecipe(
  recipeId: string,
  input: Partial<RecipeInput> & { active?: boolean },
): Promise<AdminRecipe> {
  const response = await adminFetch(`/admin/recipes/${recipeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseAdminResponse<AdminRecipe>(response);
}

export async function deleteRecipe(recipeId: string): Promise<{ id: string }> {
  const response = await adminFetch(`/admin/recipes/${recipeId}`, { method: "DELETE" });
  return parseAdminResponse<{ id: string }>(response);
}
