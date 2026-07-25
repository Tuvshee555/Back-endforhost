/**
 * Normalize a `sizes` payload into `[{ label, stock }]`.
 *
 * Accepts either the legacy shape (array of label strings) or the richer
 * `{ label, stock }` shape, so older admin clients keep working. `stock` is
 * null (= unlimited / untracked) unless a non-negative integer is provided.
 */
export function normalizeSizeInput(sizes) {
  if (!Array.isArray(sizes)) return [];

  return sizes
    .map((s) => {
      if (typeof s === "string") {
        return { label: s.trim(), stock: null };
      }

      const label = typeof s?.label === "string" ? s.label.trim() : "";

      let stock = null;
      if (s?.stock !== null && s?.stock !== undefined && s?.stock !== "") {
        const n = Number.parseInt(s.stock, 10);
        stock = Number.isFinite(n) && n >= 0 ? n : null;
      }

      return { label, stock };
    })
    .filter((s) => s.label);
}
