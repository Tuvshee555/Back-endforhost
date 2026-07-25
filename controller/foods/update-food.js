// controller/foods/update-food.js
import { prisma } from "../../prismaClient.js";
import { normalizeSizeInput } from "../../utils/sizes.js";
import { invalidateCatalog } from "../../utils/cache.js";

export const updateFood = async (req, res) => {
  const { id } = req.params;
  const {
    foodName,
    price: rawPrice,
    oldPrice: rawOldPrice,
    discount: rawDiscount,
    image,
    extraImages,
    ingredients,
    categoryId,
    address,
    video,
    sizes,
    isFeatured,
    salesCount, // optional manual override
  } = req.body;

  if (!id) return res.status(400).json({ error: "Missing food ID" });

  try {
    // Parse numbers if present
    const provided = {
      price: typeof rawPrice !== "undefined" && rawPrice !== null && rawPrice !== "" ? parseFloat(rawPrice) : undefined,
      oldPrice: typeof rawOldPrice !== "undefined" && rawOldPrice !== null && rawOldPrice !== "" ? parseFloat(rawOldPrice) : undefined,
      discount:
        typeof rawDiscount !== "undefined" && rawDiscount !== null && rawDiscount !== "" ? parseInt(rawDiscount, 10) : undefined,
    };

    // sanitize discount bounds if provided
    if (typeof provided.discount === "number") {
      if (provided.discount < 0) provided.discount = 0;
      if (provided.discount > 100) provided.discount = 100;
    }

    let computedPrice = provided.price;
    let computedOldPrice = provided.oldPrice;
    let computedDiscount = typeof provided.discount === "number" ? provided.discount : undefined;

    // Compute missing values according to inputs
    // 1) If price missing but oldPrice + discount present -> compute price
    if (typeof computedPrice === "undefined") {
      if (typeof computedOldPrice === "number" && typeof computedDiscount === "number") {
        computedPrice = Number((computedOldPrice * (1 - computedDiscount / 100)).toFixed(2));
      } else if (typeof computedOldPrice === "number" && typeof computedDiscount === "undefined") {
        // if only oldPrice provided, treat price == oldPrice (no discount)
        computedPrice = Number(computedOldPrice);
        computedDiscount = 0;
      }
    }

    // 2) If oldPrice missing but price + discount provided -> compute oldPrice
    if (typeof computedOldPrice === "undefined") {
      if (typeof computedPrice === "number" && typeof computedDiscount === "number") {
        if (computedDiscount >= 100) {
          // avoid division by zero
          computedOldPrice = computedPrice;
        } else {
          computedOldPrice = Number((computedPrice / (1 - computedDiscount / 100)).toFixed(2));
        }
      }
    }

    // 3) If discount missing but oldPrice + price provided -> compute discount
    if (typeof computedDiscount === "undefined") {
      if (typeof computedOldPrice === "number" && typeof computedPrice === "number" && computedOldPrice > 0) {
        computedDiscount = Math.round(((computedOldPrice - computedPrice) / computedOldPrice) * 100);
        if (computedDiscount < 0) computedDiscount = 0;
        if (computedDiscount > 100) computedDiscount = 100;
      }
    }

    // Build update payload, only including fields that were explicitly provided or computed above.
    const updateData = {
      foodName: typeof foodName === "string" ? foodName : undefined,
      price: typeof computedPrice === "number" ? Number(computedPrice) : undefined,
      oldPrice: typeof computedOldPrice === "number" ? Number(computedOldPrice) : undefined,
      discount: typeof computedDiscount === "number" ? computedDiscount : undefined,
      image: typeof image === "string" ? image : undefined,
      extraImages: Array.isArray(extraImages) ? extraImages : undefined,
      ingredients: typeof ingredients === "string" ? ingredients : undefined,
      address: typeof address === "string" ? address : undefined,
      categoryId: typeof categoryId === "string" ? categoryId : undefined,
      video: typeof video === "string" ? video : undefined,
      isFeatured: typeof isFeatured === "boolean" ? isFeatured : undefined,
      salesCount: typeof salesCount === "number" ? salesCount : undefined,
    };

    // sizes: replace sizes if provided, but PRESERVE existing stock for a size
    // whose stock isn't part of this edit (the label-only admin form must not
    // silently wipe inventory when re-saving a food).
    if (sizes && Array.isArray(sizes)) {
      const incoming = normalizeSizeInput(sizes);

      const existingSizes = await prisma.foodSize.findMany({
        where: { foodId: id },
        select: { label: true, stock: true },
      });
      const priorStock = new Map(existingSizes.map((s) => [s.label, s.stock]));

      const merged = incoming.map((s) => ({
        label: s.label,
        stock:
          s.stock !== null
            ? s.stock
            : priorStock.has(s.label)
            ? priorStock.get(s.label)
            : null,
      }));

      updateData.sizes = {
        deleteMany: {},
        create: merged,
      };
    }

    const updatedFood = await prisma.food.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        sizes: true,
      },
    });

    invalidateCatalog();

    return res.json(updatedFood);
  } catch (error) {
    console.error("Error updating food:", error);
    return res.status(500).json({
      error: "Failed to update food",
      details: error.message,
    });
  }
};
