import express from "express";
import { getUsers } from "../controller/users/get-users.js";
import { deleteUser } from "../controller/users/delete-user.js";
import { updateUser } from "../controller/users/update-user.js";
import { createUser } from "../controller/users/create-user.js";
import { loginUser } from "../controller/users/login-user.js";
import { validateUserId } from "../middleware/users/validate-user-id.js";
import { forgotPassword } from "../controller/users/forgot-password.js";
import { resetPassword } from "../controller/users/reset-password.js";
import { googleAuth } from "../controller/users/google-auth.js";
import { facebookAuth } from "../controller/users/facebook-auth.js";



export const userRouter = express.Router();

// Standard CRUD
userRouter.get("/", getUsers);
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.put("/:id", validateUserId, updateUser);
userRouter.delete("/:id", validateUserId, deleteUser);

// Password recovery
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);

// Google OAuth
userRouter.post("/auth/google", googleAuth);

// Facebook OAuth
userRouter.post("/auth/facebook", facebookAuth);
