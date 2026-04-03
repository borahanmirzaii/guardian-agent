"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scan, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ScanButton() {
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  async function handleScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Scan failed");
        return;
      }

      toast.success(
        `Scan complete — ${data.findings_count} finding(s) detected`
      );
      router.refresh();
    } catch {
      toast.error("Failed to start scan");
    } finally {
      setScanning(false);
    }
  }

  return (
    <Button onClick={handleScan} disabled={scanning}>
      {scanning ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Scan className="mr-2 h-4 w-4" />
      )}
      {scanning ? "Scanning..." : "Scan Now"}
    </Button>
  );
}
