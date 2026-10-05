// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { emailOtp } from "./auth/emailOtp";
import { classcastPassword } from "./auth/password";


export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // classcastPassword is the ClassCast student desk sign-in (portal ID or
  // email + password, hashed server-side). See auth/password.ts.
  providers: [classcastPassword, emailOtp, Anonymous],
});