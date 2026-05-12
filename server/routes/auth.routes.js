import { Router } from "express";

import { changePassword, deleteAccount, getSession, loginUser, registerUser } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const authRouter = Router();

authRouter.post("/register", upload.single("avatar"), registerUser);
authRouter.post("/login", loginUser);
authRouter.get("/session", requireAuth, getSession);
authRouter.patch("/password", requireAuth, changePassword);
authRouter.delete("/account", requireAuth, deleteAccount);

export default authRouter;
