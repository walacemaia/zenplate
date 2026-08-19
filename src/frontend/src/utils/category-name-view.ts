export const CATEGORY_NAME_VIEW_SEPARATOR = '||';

export function splitCategoryNameViewValue(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  const source = value.trim();
  if (!source) {
    return [];
  }

  return source
    .split(CATEGORY_NAME_VIEW_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function formatCategoryNameViewValue(value: string | null | undefined): string {
  const names = splitCategoryNameViewValue(value);
  return names.length > 0 ? names.join(', ') : '-';
}
