export type FieldFocusTarget = {
  id: string;
  errorKey: string;
};

/**
 * Focus the first field in visual order that has an error.
 * Skips missing DOM nodes.
 */
export function focusFirstFieldError(
  fieldOrder: readonly FieldFocusTarget[],
  errors: Record<string, string | undefined>
): void {
  for (const { id, errorKey } of fieldOrder) {
    if (errors[errorKey]) {
      const element = document.getElementById(id);
      if (element) {
        element.focus();
        return;
      }
    }
  }
}
