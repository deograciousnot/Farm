import { Product } from "../models/product.model.js";
import { AppError } from "../utils/app-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { uploadManyToCloudinary } from "../utils/media-upload.js";
import { recalculateTrustScoreForUser } from "../utils/trust-score.js";

export const getMarketplaceOverview = asyncHandler(async (_req, res) => {
  const [featuredProducts, totalListings, verifiedSellerListings, wholesaleListings] = await Promise.all([
    Product.find({ featured: true }).populate("seller", "name verificationStatus location role avatarUrl").limit(4),
    Product.countDocuments(),
    Product.countDocuments({ sellerType: "farmer" }),
    Product.countDocuments({ stock: { $gte: 100 } }),
  ]);

  res.json({
    filters: ["All produce", "Vegetables", "Fruits", "Grains", "Farm inputs", "Wholesale"],
    shortcuts: [
      { label: "Fast delivery", value: `${featuredProducts.length} featured` },
      { label: "Verified sellers", value: `${verifiedSellerListings} listings` },
      { label: "Bulk buyers", value: `${wholesaleListings} wholesale-ready` },
    ],
    featuredProducts,
    totals: {
      listings: totalListings,
      featured: featuredProducts.length,
    },
  });
});

export const getProducts = asyncHandler(async (req, res) => {
  const { category, location, search, featured } = req.query;
  const filters = {};

  if (category) {
    filters.category = category;
  }

  if (location) {
    filters.location = location;
  }

  if (featured === "true") {
    filters.featured = true;
  }

  if (search) {
    filters.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  const products = await Product.find(filters)
    .populate("seller", "name verificationStatus location role avatarUrl")
    .sort({ featured: -1, createdAt: -1 });

  res.json({ items: products });
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(
    "seller",
    "name verificationStatus location role bio trustScore phone avatarUrl"
  );

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  res.json({ item: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, category, description, unit, price, stock, location, sellerType = "farmer", isOrganic = false } =
    req.body;

  if (!name || !category || !description || !unit || price == null || stock == null || !location) {
    throw new AppError("Name, category, description, unit, price, stock, and location are required.", 400);
  }

  const uploadedMedia = await uploadManyToCloudinary(req.files, {
    folder: "farmconnect/products",
  });

  const product = await Product.create({
    seller: req.user._id,
    name,
    category,
    description,
    unit,
    price,
    stock,
    location,
    sellerType,
    isOrganic,
    mediaUrls: uploadedMedia.map((item) => item.url),
  });

  const populatedProduct = await Product.findById(product._id).populate(
    "seller",
    "name verificationStatus location role avatarUrl"
  );

  await recalculateTrustScoreForUser(req.user._id);

  res.status(201).json({
    message: "Product listing created successfully.",
    item: populatedProduct,
  });
});
