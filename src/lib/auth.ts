import { betterAuth } from "better-auth";
// import { emailOTP } from "better-auth/plugins";
import { Pool } from "@neondatabase/serverless";
// import { Resend } from "resend";

// TODO: Re-enable when a verified sending domain is available
// const resend = new Resend(process.env.RESEND_API_KEY!);

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  // emailVerification: {
  //   sendOnSignUp: true,
  //   autoSignInAfterVerification: true,
  // },
  // plugins: [
  //   emailOTP({
  //     async sendVerificationOTP({ email, otp, type }) {
  //       if (type === "email-verification") {
  //         try {
  //           await resend.emails.send({
  //             from: "CrawlMind <noreply@crawlmind.xyz>",
  //             to: email,
  //             subject: "Verify your email address",
  //             html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
  //           });
  //           console.log(`Email verification OTP sent to ${email}`);
  //         } catch (error) {
  //           console.error("Failed to send OTP email:", error);
  //         }
  //       }
  //     },
  //   }),
  // ],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
});
