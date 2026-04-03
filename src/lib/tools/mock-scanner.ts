import type { GitHubFinding } from "./scan-github-secrets";
import type { ForwardingFinding } from "./scan-google-forwarding";

export function getMockGitHubFindings(): GitHubFinding[] {
  return [
    {
      repo: "guardian-test-repo",
      file: "config.js",
      line: 3,
      secretType: "AWS Access Key",
      severity: "critical",
      description:
        "AWS Access Key ID — can be used to access AWS services",
      snippet: 'const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"',
    },
    {
      repo: "guardian-test-repo",
      file: "config.js",
      line: 4,
      secretType: "AWS Secret Key",
      severity: "critical",
      description:
        "AWS Secret Access Key — full AWS access when combined with Access Key ID",
      snippet:
        'const AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"',
    },
    {
      repo: "frontend-v2",
      file: ".env.production",
      line: 7,
      secretType: "Generic API Key",
      severity: "medium",
      description: "Generic API key found in code",
      snippet: 'api_key="sk_live_abc123def456ghi789"',
    },
  ];
}

export function getMockGoogleFindings(): ForwardingFinding[] {
  return [
    {
      type: "forwarding_rule",
      email: "external-attacker@protonmail.com",
      disposition: "leaveInInbox",
      enabled: true,
    },
  ];
}
