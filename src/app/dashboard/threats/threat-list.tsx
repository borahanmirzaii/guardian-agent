"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThreatCard } from "@/components/threat-card";
import { StepUpModal } from "@/components/step-up-modal";
import type { Finding } from "@/lib/db";
import { toast } from "sonner";

interface ThreatListProps {
  findings: Finding[];
}

export function ThreatList({ findings }: ThreatListProps) {
  const router = useRouter();
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [remediating, setRemediating] = useState(false);

  async function handleRemediate(findingId: number) {
    const finding = findings.find((f) => f.id === findingId);
    if (finding) setSelectedFinding(finding);
  }

  async function handleApprove() {
    if (!selectedFinding) return;
    setRemediating(true);

    try {
      const res = await fetch("/api/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding_id: selectedFinding.id,
          action: selectedFinding.provider === "github" ? "create_issue" : "remove_forwarding",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Remediation failed");
      } else {
        toast.success("Remediation complete — access reverted to read-only");
      }

      setSelectedFinding(null);
      router.refresh();
    } catch {
      toast.error("Remediation failed");
    } finally {
      setRemediating(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {findings.map((finding) => (
          <ThreatCard
            key={finding.id}
            id={finding.id}
            title={finding.title}
            description={finding.description}
            severity={finding.severity}
            provider={finding.provider}
            type={finding.type}
            evidence={finding.evidence}
            status={finding.status}
            recommended_action={finding.recommended_action}
            onRemediate={handleRemediate}
          />
        ))}
      </div>

      <StepUpModal
        open={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
        onApprove={handleApprove}
        loading={remediating}
        finding={selectedFinding}
      />
    </>
  );
}
