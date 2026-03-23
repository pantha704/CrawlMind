"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

export function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    
    const handleTriggerCheck = async () => {
      try {
        const res = await fetch("/api/feedback");
        if (res.ok) {
          const data = await res.json();
          if (data.canPrompt) {
            setOpen(true);
          }
        }
      } catch (err) {
        // silently fail
      }
    };

    window.addEventListener("open-feedback-modal", handleOpen);
    window.addEventListener("trigger-feedback-check", handleTriggerCheck);
    
    return () => {
      window.removeEventListener("open-feedback-modal", handleOpen);
      window.removeEventListener("trigger-feedback-check", handleTriggerCheck);
    };
  }, []);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message, page: pathname }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");
      
      toast.success("Thank you for your feedback!");
      setOpen(false);
      
      // Reset state on close
      setTimeout(() => {
        setRating(0);
        setMessage("");
      }, 300);
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            How is your experience with CrawlMind so far? We&apos;d love to hear from you.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-8 h-8 ${
                    (hoveredRating || rating) >= star
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>

          <Textarea 
            placeholder="Tell us what you love or what could be improved... (Optional)"
            className="resize-none h-24 mt-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
