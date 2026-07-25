import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { publicCache } from "../middleware/publicCache.js";
import { getFoodReviews } from "../controller/reviews/get-food-reviews.js";
import { createFoodReview } from "../controller/reviews/create-food-review.js";
import { updateReview } from "../controller/reviews/update-review.js";
import { deleteReview } from "../controller/reviews/delete-review.js";


export const reviewRouter = Router();

// public
reviewRouter.get("/food/:foodId", publicCache(), getFoodReviews);

// protected
reviewRouter.post("/food/:foodId", requireAuth, createFoodReview);
reviewRouter.put("/:reviewId", requireAuth, updateReview);
reviewRouter.delete("/:reviewId", requireAuth, deleteReview);
