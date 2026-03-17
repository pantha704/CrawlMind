"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function SettingsManageSubscription({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleManage = async () => {
    if (plan === "SPARK") {
      router.push("/pricing");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to load portal");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleManage} 
      disabled={loading}
      variant={plan === "SPARK" ? "default" : "outline"}
      className="w-full sm:w-auto"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : plan === "SPARK" ? (
        "Upgrade Plan"
      ) : (
        <>
          Manage Subscription <ExternalLink className="w-4 h-4 ml-2" />
        </>
      )}
    </Button>
  );
}
