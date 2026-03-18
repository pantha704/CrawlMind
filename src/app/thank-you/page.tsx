"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Download, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/landing/navbar";
import Confetti from "react-confetti";
import { toast } from "sonner";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const invoiceId = searchParams.get("invoice");
  
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Only set window size on client to avoid hydration mismatch
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    
    // Listen for resize
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDownload = async () => {
    if (!invoiceId) return;
    
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoice/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to download invoice");
      
      // Create a blob from the PDF stream and trigger a download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceId}.pdf`; // Fallback name, header overrides this
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Invoice downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download invoice. Please check your email instead.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={500}
        gravity={0.15}
        colors={['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981']}
      />
      
      <main className="pt-32 pb-24 px-6 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
          className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8 relative"
        >
          <div className="absolute inset-0 rounded-full animate-ping bg-primary/20 opacity-75" />
          <Check className="w-12 h-12 text-primary" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-4 mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight gradient-text">
            Payment Successful!
          </h1>
          <p className="text-xl text-muted-foreground">
            Welcome to the new era of data extraction. Your subscription is now active.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-md bg-card border border-border/50 rounded-2xl p-6 shadow-xl mb-8"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            Order Details
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            A confirmation email with your invoice has been sent to your registered email address.
          </p>
          
          <Button 
            onClick={handleDownload} 
            disabled={!invoiceId || downloading}
            variant="outline" 
            className="w-full h-12 relative overflow-hidden group border-primary/30 hover:border-primary/60 transition-colors"
          >
            <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
            {downloading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
            ) : (
              <Download className="w-5 h-5 mr-2 text-primary group-hover:-translate-y-1 transition-transform" />
            )}
            <span className="font-medium text-foreground relative z-10">
              Download PDF Invoice
            </span>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button 
            onClick={() => router.push("/dashboard")} 
            className="glow-cyan h-12 px-8 text-base font-medium rounded-full"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </main>
    </>
  );
}

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] pointer-events-none" />
      
      <Suspense fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <ThankYouContent />
      </Suspense>
    </div>
  );
}
