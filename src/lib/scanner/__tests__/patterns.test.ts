import { describe, it, expect } from "vitest";
import { scanContent, SECRET_PATTERNS } from "../patterns";

describe("Secret Detection Patterns", () => {
  it("should detect AWS access key", () => {
    const content = 'const key = "AKIAIOSFODNN7EXAMPLE";';
    const matches = scanContent(content, "config.js");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].pattern.name).toBe("AWS Access Key");
    expect(matches[0].pattern.severity).toBe("critical");
  });

  it("should detect AWS secret key", () => {
    const content =
      'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"';
    const matches = scanContent(content, "config.js");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].pattern.name).toBe("AWS Secret Key");
  });

  it("should detect GitHub personal access token", () => {
    const content = 'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";';
    const matches = scanContent(content, "auth.ts");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].pattern.name).toBe("GitHub Token");
    expect(matches[0].pattern.severity).toBe("high");
  });

  it("should detect private keys", () => {
    const content = "-----BEGIN RSA PRIVATE KEY-----\nMIIEpA...";
    const matches = scanContent(content, "key.pem");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].pattern.name).toBe("Private Key");
    expect(matches[0].pattern.severity).toBe("critical");
  });

  it("should detect passwords in code", () => {
    const content = 'password = "supersecret123"';
    const matches = scanContent(content, "db.py");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].pattern.name).toBe("Password in Code");
  });

  it("should return correct file path and line number", () => {
    const content = 'line1\nline2\nconst key = "AKIAIOSFODNN7EXAMPLE";\nline4';
    const matches = scanContent(content, "src/config.js");
    expect(matches[0].file).toBe("src/config.js");
    expect(matches[0].line).toBe(3);
  });

  it("should not match safe content", () => {
    const content =
      'const greeting = "hello world";\nconst count = 42;\nconst name = "guardian";';
    const matches = scanContent(content, "safe.ts");
    expect(matches.length).toBe(0);
  });

  it("should have at least 5 pattern types", () => {
    expect(SECRET_PATTERNS.length).toBeGreaterThanOrEqual(5);
  });
});
