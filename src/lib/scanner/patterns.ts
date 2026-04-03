export interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: "critical",
    description: "AWS Access Key ID — can be used to access AWS services",
  },
  {
    name: "AWS Secret Key",
    pattern:
      /(?:aws_secret_access_key|AWS_SECRET_KEY|secret_key)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    severity: "critical",
    description: "AWS Secret Access Key — full AWS access when combined with Access Key ID",
  },
  {
    name: "GitHub Token",
    pattern: /ghp_[A-Za-z0-9_]{36}/g,
    severity: "high",
    description: "GitHub Personal Access Token",
  },
  {
    name: "GitHub OAuth Token",
    pattern: /gho_[A-Za-z0-9_]{36}/g,
    severity: "high",
    description: "GitHub OAuth Access Token",
  },
  {
    name: "Generic API Key",
    pattern:
      /(?:api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*["']([A-Za-z0-9_\-]{20,})["']/gi,
    severity: "medium",
    description: "Generic API key found in code",
  },
  {
    name: "Password in Code",
    pattern:
      /(?:password|passwd|pwd)\s*[=:]\s*["']([^"']{8,})["']/gi,
    severity: "high",
    description: "Hardcoded password found in code",
  },
  {
    name: "Private Key",
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    severity: "critical",
    description: "Private key embedded in source code",
  },
  {
    name: "Slack Token",
    pattern: /xox[bpors]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34}/g,
    severity: "high",
    description: "Slack API token",
  },
];

export interface ScanMatch {
  pattern: SecretPattern;
  file: string;
  line: number;
  snippet: string;
}

export function scanContent(
  content: string,
  filePath: string
): ScanMatch[] {
  const matches: ScanMatch[] = [];
  const lines = content.split("\n");

  for (const pattern of SECRET_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      if (regex.test(lines[i])) {
        matches.push({
          pattern,
          file: filePath,
          line: i + 1,
          snippet: lines[i].trim().slice(0, 100),
        });
      }
    }
  }

  return matches;
}
