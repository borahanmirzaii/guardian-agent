import { describe, it, expect } from "vitest";
import { calculateRiskScore } from "../risk-score";

describe("Risk Score Calculator", () => {
  it("should return 100 for no findings", () => {
    expect(calculateRiskScore([])).toBe(100);
  });

  it("should deduct 30 for critical findings", () => {
    expect(calculateRiskScore([{ severity: "critical" }])).toBe(70);
  });

  it("should deduct 15 for high findings", () => {
    expect(calculateRiskScore([{ severity: "high" }])).toBe(85);
  });

  it("should deduct 5 for medium findings", () => {
    expect(calculateRiskScore([{ severity: "medium" }])).toBe(95);
  });

  it("should deduct 2 for low findings", () => {
    expect(calculateRiskScore([{ severity: "low" }])).toBe(98);
  });

  it("should handle multiple findings", () => {
    const findings = [
      { severity: "critical" },
      { severity: "high" },
      { severity: "medium" },
    ];
    // 100 - 30 - 15 - 5 = 50
    expect(calculateRiskScore(findings)).toBe(50);
  });

  it("should not go below 0", () => {
    const findings = [
      { severity: "critical" },
      { severity: "critical" },
      { severity: "critical" },
      { severity: "critical" },
    ];
    // 100 - 120 = clamped to 0
    expect(calculateRiskScore(findings)).toBe(0);
  });

  it("should not exceed 100", () => {
    expect(calculateRiskScore([])).toBeLessThanOrEqual(100);
  });
});
