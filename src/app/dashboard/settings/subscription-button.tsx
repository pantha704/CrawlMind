"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function SettingsManageSubscription({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleManage = async () => {
    if (plan === "SPARK") {
      router.push("/pricing");
      return;
    }

    // Cancel subscription
    if (!confirm("Are you sure you want to cancel your subscription? You will retain Pro access until the end of your current billing cycle, after which you'll be downgraded to the Spark (free) plan.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/razorpay/cancel", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        throw new Error(data.error || "Failed to cancel");
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
      variant={plan === "SPARK" ? "default" : "destructive"}
      className="w-full sm:w-auto"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : plan === "SPARK" ? (
        "Upgrade Plan"
      ) : (
        "Cancel Subscription"
      )}
    </Button>
  );
}
