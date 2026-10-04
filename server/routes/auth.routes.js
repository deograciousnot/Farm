import { Router } from "express";

import { changePassword, deleteAccount, getSession, loginUser, registerUser } from "../controllers/auth.controller.js";
import { completePhoneSignup, requestCode, verifyCode } from "../controllers/phone-auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { loginLimiter, loginNetworkLimiter, otpLimiter, registerLimiter } from "../middleware/rate-limit.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const authRouter = Router();

authRouter.post("/register", registerLimiter, upload.single("avatar"), registerUser);
authRouter.post("/login", loginNetworkLimiter, loginLimiter, loginUser);
// Phone sign-in: request a code, verify it, and (for new numbers) finish the profile.
authRouter.post("/otp/request", otpLimiter, requestCode);
authRouter.post("/otp/verify", loginNetworkLimiter, loginLimiter, verifyCode);
authRouter.post("/phone/register", registerLimiter, completePhoneSignup);
authRouter.get("/session", requireAuth, getSession);
authRouter.patch("/password", requireAuth, changePassword);
authRouter.delete("/account", requireAuth, deleteAccount);

export default authRouter;
