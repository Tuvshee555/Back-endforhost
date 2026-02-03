import express from "express";
import { getUsers } from "../controller/users/get-users.js";
import { deleteUser } from "../controller/users/delete-user.js";
import { updateUser } from "../controller/users/update-user.js";
import { createUser } from "../controller/users/create-user.js";
import { loginUser } from "../controller/users/login-user.js";
import { forgotPassword } from "../controller/users/forgot-password.js";
import { resetPassword } from "../controller/users/reset-password.js";
import { googleAuth } from "../controller/users/google-auth.js";
import { facebookAuth } from "../controller/users/facebook-auth.js";
import { validateUserId } from "../middleware/validate-user-id.js";
import { getUserById } from "../controller/users/get-user-by-id.js";
import { createGuestUser } from "../controller/users/create-guest.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";



export const userRouter = express.Router();

// Standard CRUD
userRouter.get("/", requireAdmin, getUsers);
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.put("/:id", requireAuth, validateUserId , updateUser);
userRouter.delete("/:id", requireAuth, validateUserId , deleteUser);
userRouter.get("/:id", requireAuth, validateUserId, getUserById);
userRouter.post("/guest", createGuestUser);


// Password recovery
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);

// Google OAuth
userRouter.post("/auth/google", googleAuth);

// Facebook OAuth
userRouter.post("/auth/facebook", facebookAuth);


