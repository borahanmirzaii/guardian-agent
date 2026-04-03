const SEVERITY_WEIGHTS = {
  critical: 30,
  high: 15,
  medium: 5,
  low: 2,
} as const;

export function calculateRiskScore(
  findings: { severity: string }[]
): number {
  let deductions = 0;
  for (const finding of findings) {
    const weight =
      SEVERITY_WEIGHTS[finding.severity as keyof typeof SEVERITY_WEIGHTS] ?? 0;
    deductions += weight;
  }
  return Math.max(0, Math.min(100, 100 - deductions));
}
