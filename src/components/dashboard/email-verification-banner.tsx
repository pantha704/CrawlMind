"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AlertCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export function EmailVerificationBanner({ 
  email, 
  verified 
}: { 
  email: string;
  verified: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  if (verified) return null;

  const handleSendOTP = async () => {
    setSending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "email-verification",
    });
    setSending(false);

    if (error) {
      toast.error(error.message || "Failed to send verification code.");
    } else {
      toast.success("Verification code sent to your email.");
      setOpen(true);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length < 5) {
      toast.error("Please enter a valid code.");
      return;
    }
    
    setLoading(true);
    const { error } = await authClient.emailOtp.verifyEmail({
      email,
      otp,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Invalid or expired code.");
    } else {
      toast.success("Email verified successfully!");
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>
            <strong>Your email is not verified.</strong> You won&apos;t be able to run crawls until you verify your email address.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSendOTP} 
          disabled={sending}
          className="shrink-0 text-amber-600 dark:text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
        >
          {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
          Send Verification Code
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify your email</DialogTitle>
            <DialogDescription>
              We&apos;ve sent a one-time verification code to <strong>{email}</strong>. Please enter it below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Input 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              className="text-center tracking-widest text-lg font-mono"
              maxLength={6}
            />
            <Button onClick={handleVerify} disabled={loading || otp.length < 5}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
