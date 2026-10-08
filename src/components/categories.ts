import { CATEGORY_INFO, isCategory } from "@/lib/categories";

/** Picture for a treatment group where one is needed (account, appointment page). null = no fitting photo yet. */
export const categoryImage = (category: string | null | undefined): string | null => (isCategory(category) ? CATEGORY_INFO[category].image : null);
