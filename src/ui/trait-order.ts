export type Trait = {
  kind: "camp" | "flag" | "role";
  key: string;
  label: string;
};

const KIND_RANK: Readonly<Record<Trait["kind"], number>> = Object.freeze({
  camp: 0,
  flag: 1,
  role: 2,
});

// Array.prototype.sort is stable, so equal labels keep their input order.
export function traitOrder(traits: readonly Trait[]): Trait[] {
  return [...traits].sort(
    (a, b) =>
      KIND_RANK[a.kind] - KIND_RANK[b.kind] ||
      a.label.localeCompare(b.label, "pl"),
  );
}
