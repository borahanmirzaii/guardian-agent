import { google } from "googleapis";

export interface ForwardingFinding {
  type: "forwarding_rule";
  email: string;
  disposition: string;
  enabled: boolean;
}

export async function scanGoogleForwarding(
  accessToken: string
): Promise<ForwardingFinding[]> {
  const findings: ForwardingFinding[] = [];

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  try {
    const { data: forwarding } =
      await gmail.users.settings.getAutoForwarding({ userId: "me" });

    if (forwarding.enabled && forwarding.emailAddress) {
      findings.push({
        type: "forwarding_rule",
        email: forwarding.emailAddress,
        disposition: forwarding.disposition ?? "unknown",
        enabled: true,
      });
    }
  } catch {
    // No forwarding access or not set up
  }

  try {
    const { data: filtersResponse } = await gmail.users.settings.filters.list({
      userId: "me",
    });

    const filters = filtersResponse.filter ?? [];
    for (const filter of filters) {
      if (filter.action?.forward) {
        findings.push({
          type: "forwarding_rule",
          email: filter.action.forward,
          disposition: "filter",
          enabled: true,
        });
      }
    }
  } catch {
    // No filter access
  }

  return findings;
}
