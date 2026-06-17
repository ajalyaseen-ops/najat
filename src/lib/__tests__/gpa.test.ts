import { describe, it, expect } from "vitest";
import { subjectPercentage, bandFor, gpaFor, termGpa, rankByDesc } from "@/lib/gpa";

const scale = [
  { min_pct: 90, max_pct: 100, letter: "A", gpa: 4 },
  { min_pct: 80, max_pct: 89.99, letter: "B", gpa: 3 },
  { min_pct: 70, max_pct: 79.99, letter: "C", gpa: 2 },
  { min_pct: 60, max_pct: 69.99, letter: "D", gpa: 1 },
  { min_pct: 0, max_pct: 59.99, letter: "F", gpa: 0 },
];

describe("subjectPercentage", () => {
  it("weights items correctly", () => {
    // full marks on everything → 100%
    expect(
      subjectPercentage([
        { score: 20, max: 20, weight: 20 },
        { score: 30, max: 30, weight: 30 },
        { score: 50, max: 50, weight: 50 },
      ])
    ).toBe(100);
  });

  it("computes a partial weighted total", () => {
    // 50% on a 40-weight item + 100% on a 60-weight item = 80%
    expect(
      subjectPercentage([
        { score: 5, max: 10, weight: 40 },
        { score: 10, max: 10, weight: 60 },
      ])
    ).toBe(80);
  });

  it("returns 0 when there is no weight", () => {
    expect(subjectPercentage([])).toBe(0);
  });
});

describe("grade scale mapping", () => {
  it("maps percentage to band", () => {
    expect(bandFor(95, scale)?.letter).toBe("A");
    expect(bandFor(72, scale)?.letter).toBe("C");
    expect(gpaFor(85, scale)).toBe(3);
    expect(gpaFor(40, scale)).toBe(0);
  });
});

describe("termGpa", () => {
  it("averages per-subject GPA points", () => {
    // 95(A=4) + 82(B=3) + 71(C=2) → (4+3+2)/3 = 3
    expect(termGpa([95, 82, 71], scale)).toBe(3);
  });
});

describe("rankByDesc", () => {
  it("dense-ranks with ties", () => {
    const rows = [{ p: 90 }, { p: 90 }, { p: 80 }];
    const ranks = rankByDesc(rows, (r) => r.p);
    expect(ranks.get(rows[0])).toBe(1);
    expect(ranks.get(rows[1])).toBe(1);
    expect(ranks.get(rows[2])).toBe(3);
  });
});
