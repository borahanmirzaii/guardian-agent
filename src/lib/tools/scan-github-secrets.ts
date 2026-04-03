import { Octokit } from "octokit";
import { scanContent, type ScanMatch } from "../scanner/patterns";

export interface GitHubFinding {
  repo: string;
  file: string;
  line: number;
  secretType: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  snippet: string;
}

const SCANNABLE_EXTENSIONS = [
  ".js", ".ts", ".jsx", ".tsx", ".py", ".rb", ".go",
  ".json", ".yml", ".yaml", ".env", ".cfg", ".conf",
  ".properties", ".ini", ".toml",
];

function shouldScanFile(path: string): boolean {
  return SCANNABLE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export async function scanGitHubSecrets(
  accessToken: string,
  options?: { maxRepos?: number }
): Promise<GitHubFinding[]> {
  const octokit = new Octokit({ auth: accessToken });
  const findings: GitHubFinding[] = [];
  const maxRepos = options?.maxRepos ?? 5;

  const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: maxRepos,
  });

  for (const repo of repos) {
    try {
      const { data: tree } = await octokit.rest.git.getTree({
        owner: repo.owner.login,
        repo: repo.name,
        tree_sha: repo.default_branch ?? "main",
        recursive: "true",
      });

      const filesToScan = (tree.tree ?? [])
        .filter(
          (item) =>
            item.type === "blob" &&
            item.path &&
            shouldScanFile(item.path) &&
            (item.size ?? 0) < 100_000
        )
        .slice(0, 20);

      for (const file of filesToScan) {
        if (!file.path) continue;
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner: repo.owner.login,
            repo: repo.name,
            path: file.path,
          });

          if ("content" in data && data.content) {
            const content = Buffer.from(data.content, "base64").toString(
              "utf-8"
            );
            const matches: ScanMatch[] = scanContent(
              content,
              file.path
            );

            for (const match of matches) {
              findings.push({
                repo: `${repo.owner.login}/${repo.name}`,
                file: match.file,
                line: match.line,
                secretType: match.pattern.name,
                severity: match.pattern.severity,
                description: match.pattern.description,
                snippet: match.snippet,
              });
            }
          }
        } catch {
          // Skip files we can't read
        }
      }
    } catch {
      // Skip repos we can't access
    }
  }

  return findings;
}
