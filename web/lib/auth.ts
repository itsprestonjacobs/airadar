import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  user: {
    additionalFields: {
      locationLat: { type: "number", required: false },
      locationLon: { type: "number", required: false },
      locationName: { type: "string", required: false },
      alertsEnabled: { type: "boolean", defaultValue: false },
      totalWatchSeconds: { type: "number", defaultValue: 0 },
    },
  },

  trustedOrigins: [
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  ],
});

export type Session = typeof auth.$Infer.Session;
