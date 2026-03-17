import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const PLAN_IDS = {
  PRO: process.env.RAZORPAY_PRO_PLAN_ID || "",
  PRO_PLUS: process.env.RAZORPAY_PRO_PLUS_PLAN_ID || "",
  SCALE: process.env.RAZORPAY_SCALE_PLAN_ID || "",
};

// Map plan IDs back to plan names for webhook lookups
export function getPlanNameFromId(planId: string): string | null {
  for (const [name, id] of Object.entries(PLAN_IDS)) {
    if (id === planId) return name;
  }
  return null;
}
