/**
 * Grade computation helpers — pure functions, unit-tested.
 * A school's grade scale (see public.grade_scales) maps a percentage to a
 * letter + GPA point. Assessment weights (public.assessment_types) define how
 * raw scores roll up into a subject total.
 */

export type GradeBand = {
  min_pct: number;
  max_pct: number;
  letter: string;
  gpa: number;
  label_ar?: string | null;
};

export type WeightedScore = {
  /** raw score the student got */
  score: number;
  /** the maximum possible for this item */
  max: number;
  /** the item's weight toward the subject total (e.g. 20 for a 20% midterm) */
  weight: number;
};

/** Weighted subject percentage from a set of scored items. Returns 0..100. */
export function subjectPercentage(items: WeightedScore[]): number {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  if (totalWeight <= 0) return 0;
  const earned = items.reduce((s, i) => {
    const ratio = i.max > 0 ? Math.min(1, Math.max(0, i.score / i.max)) : 0;
    return s + ratio * i.weight;
  }, 0);
  return Math.round((earned / totalWeight) * 1000) / 10; // one decimal
}

/** Map a percentage to its grade band. */
export function bandFor(pct: number, scale: GradeBand[]): GradeBand | null {
  return scale.find((b) => pct >= b.min_pct && pct <= b.max_pct) ?? null;
}

/** GPA point for a percentage given the school's scale (0 if unmatched). */
export function gpaFor(pct: number, scale: GradeBand[]): number {
  return bandFor(pct, scale)?.gpa ?? 0;
}

/** Term GPA = average of per-subject GPA points. */
export function termGpa(subjectPercentages: number[], scale: GradeBand[]): number {
  if (subjectPercentages.length === 0) return 0;
  const sum = subjectPercentages.reduce((s, p) => s + gpaFor(p, scale), 0);
  return Math.round((sum / subjectPercentages.length) * 100) / 100;
}

/** Dense ranking (1-based) of students by a numeric metric, descending. */
export function rankByDesc<T>(rows: T[], metric: (r: T) => number): Map<T, number> {
  const sorted = [...rows].sort((a, b) => metric(b) - metric(a));
  const ranks = new Map<T, number>();
  let rank = 0;
  let prev: number | null = null;
  sorted.forEach((r, i) => {
    const v = metric(r);
    if (prev === null || v !== prev) rank = i + 1;
    ranks.set(r, rank);
    prev = v;
  });
  return ranks;
}
