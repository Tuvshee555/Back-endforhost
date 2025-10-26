// import { CategoriesModel } from "../../modules/categories.model.js";

// export const validateCategoriesId = async (req, res, next) => {
//   const { categoryName } = req.body;

//   try {
//     if (!categoryName) {
//       res
//         .status(303)
//         .json({ success: false, message: "id not provided invalid input" });
//     } else {
//       const Categories = await CategoriesModel.findById(categoryName);

//       if (!Categories) {
//         res
//           .status(404)
//           .json({ success: false, message: "Categories not found" });
//       } else {
//         next();
//       }
//     }
//   } catch (error) {
//     res.status(500).json({ success: false, message: `error, ${error}` });
//   }
// };
