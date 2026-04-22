/**
 * Payments — convex/payments.ts
 *
 * Generates checkout URLs for Paystack (Africa) or Polar (Global).
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

export const createCheckoutSession = action({
  args: {
    sessionId: v.string(),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If country is Nigeria, South Africa, Kenya, Ghana -> Paystack
    const paystackCountries = ["NG", "ZA", "KE", "GH"];
    const usePaystack = args.country && paystackCountries.includes(args.country);
    
    // Hardcoded plan IDs for mock purposes, to be replaced with real ones via env vars
    const planId = usePaystack 
        ? (process.env.PAYSTACK_PLAN_ID ?? "mock_paystack_plan")
        : (process.env.POLAR_PLAN_ID ?? "mock_polar_plan");

    // In a real implementation, you would fetch from the Paystack or Polar API
    // using node-fetch or similar to generate a session, passing the sessionId as metadata
    
    // Mock response for now
    if (usePaystack) {
      return {
        url: `https://checkout.paystack.com/${planId}?session_id=${args.sessionId}`,
        provider: "paystack",
      };
    } else {
      return {
        url: `https://polar.sh/checkout/${planId}?session_id=${args.sessionId}`,
        provider: "polar",
      };
    }
  },
});
