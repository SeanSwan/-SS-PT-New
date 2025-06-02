/**
 * SOCIAL COMMERCE & MARKETPLACE MODELS - 7-STAR SOCIAL MEDIA
 * ===========================================================
 * Advanced social commerce with integrated shopping, marketplace,
 * product discovery, and seamless purchasing experiences.
 */

import { DataTypes } from 'sequelize';
import db from '../../../database.mjs';

// SOCIAL PRODUCT MODEL
// ====================
const SocialProduct = db.define('SocialProduct', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // SELLER INFORMATION
  // ==================
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sellerType: {
    type: DataTypes.ENUM('individual', 'creator', 'brand', 'verified_business'),
    defaultValue: 'individual'
  },
  
  // BASIC PRODUCT INFO
  // ==================
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [3, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 5000]
    }
  },
  shortDescription: {
    type: DataTypes.STRING(300),
    allowNull: true
  },
  
  // PRODUCT CATEGORIZATION
  // ======================
  category: {
    type: DataTypes.ENUM(
      'fitness_equipment', 'supplements', 'workout_gear', 'activewear',
      'nutrition', 'meal_plans', 'workout_programs', 'courses',
      'accessories', 'books', 'digital_content', 'services',
      'health_tech', 'recovery_tools', 'home_gym', 'other'
    ),
    allowNull: false
  },
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON, // Searchable product tags
    defaultValue: []
  },
  
  // PRICING & AVAILABILITY
  // ======================
  productType: {
    type: DataTypes.ENUM('physical', 'digital', 'service', 'subscription'),
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true // For showing discounts
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD'
  },
  
  // INVENTORY MANAGEMENT
  // ====================
  stockQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true // Null for unlimited/digital products
  },
  lowStockThreshold: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  },
  isInStock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  restockDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // VISUAL CONTENT
  // ==============
  images: {
    type: DataTypes.JSON, // Array of product images
    defaultValue: []
    // Format: [{ url: '', alt: '', order: 1, isMain: true }]
  },
  videos: {
    type: DataTypes.JSON, // Product videos/demos
    defaultValue: []
  },
  thumbnailImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // PRODUCT SPECIFICATIONS
  // ======================
  specifications: {
    type: DataTypes.JSON, // Technical specifications
    defaultValue: {}
  },
  dimensions: {
    type: DataTypes.JSON, // Size, weight, etc.
    defaultValue: {}
  },
  materials: {
    type: DataTypes.JSON, // Materials used
    defaultValue: []
  },
  colors: {
    type: DataTypes.JSON, // Available colors
    defaultValue: []
  },
  sizes: {
    type: DataTypes.JSON, // Available sizes
    defaultValue: []
  },
  
  // SOCIAL FEATURES
  // ===============
  isShoppable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  allowReviews: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  socialProof: {
    type: DataTypes.JSON, // Testimonials, user photos, etc.
    defaultValue: []
  },
  influencerEndorsements: {
    type: DataTypes.JSON, // Creator endorsements
    defaultValue: []
  },
  
  // ENGAGEMENT METRICS
  // ==================
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  likes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  shares: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  saves: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalSales: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // REVIEWS & RATINGS
  // =================
  averageRating: {
    type: DataTypes.DECIMAL(3, 2), // 0-5 stars
    defaultValue: 0.0
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  ratingDistribution: {
    type: DataTypes.JSON, // Distribution of star ratings
    defaultValue: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  },
  
  // SHIPPING & FULFILLMENT
  // ======================
  shippingRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  shippingWeight: {
    type: DataTypes.DECIMAL(8, 3), // Weight in kg
    allowNull: true
  },
  shippingDimensions: {
    type: DataTypes.JSON, // Shipping box dimensions
    defaultValue: null
  },
  freeShippingThreshold: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  estimatedDelivery: {
    type: DataTypes.STRING(100),
    allowNull: true // e.g., "3-5 business days"
  },
  
  // MARKETING & PROMOTION
  // =====================
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isOnSale: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  saleStartDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  saleEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  promotionalTags: {
    type: DataTypes.JSON, // "New", "Best Seller", "Limited Edition"
    defaultValue: []
  },
  
  // AI & PERSONALIZATION
  // ====================
  aiTags: {
    type: DataTypes.JSON, // AI-generated product tags
    defaultValue: []
  },
  recommendationScore: {
    type: DataTypes.DECIMAL(5, 3),
    defaultValue: 0.0
  },
  targetAudience: {
    type: DataTypes.JSON, // AI-defined target audience
    defaultValue: {}
  },
  relatedProducts: {
    type: DataTypes.JSON, // AI-suggested related products
    defaultValue: []
  },
  
  // MODERATION & COMPLIANCE
  // =======================
  moderationStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'flagged'),
    defaultValue: 'pending'
  },
  complianceChecks: {
    type: DataTypes.JSON, // Compliance verification results
    defaultValue: {}
  },
  reportCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // PRODUCT STATUS
  // ==============
  status: {
    type: DataTypes.ENUM('draft', 'active', 'inactive', 'discontinued', 'out_of_stock'),
    defaultValue: 'draft'
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastModified: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // TIMESTAMPS
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'SocialProducts',
  timestamps: true,
  indexes: [
    { fields: ['sellerId'], name: 'social_products_seller_idx' },
    { fields: ['category'], name: 'social_products_category_idx' },
    { fields: ['status'], name: 'social_products_status_idx' },
    { fields: ['price'], name: 'social_products_price_idx' },
    { fields: ['averageRating'], name: 'social_products_rating_idx' },
    { fields: ['totalSales'], name: 'social_products_sales_idx' },
    { fields: ['isFeatured'], name: 'social_products_featured_idx' },
    { fields: ['isOnSale'], name: 'social_products_sale_idx' },
    { fields: ['views'], name: 'social_products_views_idx' },
    {
      fields: ['category', 'status', 'averageRating'],
      name: 'social_products_discovery_idx'
    },
    {
      fields: ['sellerId', 'status', 'totalSales'],
      name: 'social_products_seller_performance_idx'
    }
  ]
});

// PRODUCT REVIEW MODEL
// =====================
const ProductReview = db.define('ProductReview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SocialProducts',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true, // Verify purchase
    references: {
      model: 'Orders',
      key: 'id'
    }
  },
  
  // REVIEW CONTENT
  // ==============
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 2000]
    }
  },
  
  // REVIEW DETAILS
  // ==============
  isVerifiedPurchase: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recommendsProduct: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  usageTime: {
    type: DataTypes.STRING(50),
    allowNull: true // How long they've used the product
  },
  
  // REVIEW MEDIA
  // ============
  images: {
    type: DataTypes.JSON, // Review images
    defaultValue: []
  },
  videos: {
    type: DataTypes.JSON, // Review videos
    defaultValue: []
  },
  
  // DETAILED RATINGS
  // ================
  qualityRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  valueRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  deliveryRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  serviceRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 }
  },
  
  // REVIEW INTERACTION
  // ==================
  helpfulVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  unhelpfulVotes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  replies: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // SELLER RESPONSE
  // ===============
  sellerResponse: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sellerResponseDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // MODERATION
  // ==========
  moderationStatus: {
    type: DataTypes.ENUM('approved', 'pending', 'flagged', 'removed'),
    defaultValue: 'approved'
  },
  reportCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // AI ANALYSIS
  // ===========
  aiSentiment: {
    type: DataTypes.ENUM('positive', 'neutral', 'negative'),
    allowNull: true
  },
  aiTags: {
    type: DataTypes.JSON, // AI-extracted topics/themes
    defaultValue: []
  },
  aiVerificationScore: {
    type: DataTypes.DECIMAL(3, 2), // AI authenticity score
    defaultValue: 0.0
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ProductReviews',
  timestamps: true,
  indexes: [
    { fields: ['productId'], name: 'product_reviews_product_idx' },
    { fields: ['userId'], name: 'product_reviews_user_idx' },
    { fields: ['rating'], name: 'product_reviews_rating_idx' },
    { fields: ['isVerifiedPurchase'], name: 'product_reviews_verified_idx' },
    { fields: ['moderationStatus'], name: 'product_reviews_moderation_idx' },
    { fields: ['helpfulVotes'], name: 'product_reviews_helpful_idx' },
    {
      unique: true,
      fields: ['productId', 'userId'],
      name: 'unique_product_user_review'
    }
  ]
});

// SOCIAL SHOPPING CART MODEL
// ===========================
const SocialShoppingCart = db.define('SocialShoppingCart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // CART MANAGEMENT
  // ===============
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  cartType: {
    type: DataTypes.ENUM('regular', 'wishlist', 'saved_for_later', 'gift'),
    defaultValue: 'regular'
  },
  
  // PRICING SUMMARY
  // ===============
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  shipping: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  discounts: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  
  // APPLIED DISCOUNTS
  // =================
  couponCodes: {
    type: DataTypes.JSON, // Applied coupon codes
    defaultValue: []
  },
  creatorDiscounts: {
    type: DataTypes.JSON, // Creator-specific discounts
    defaultValue: []
  },
  
  // SHIPPING INFO
  // =============
  shippingAddress: {
    type: DataTypes.JSON,
    defaultValue: null
  },
  shippingMethod: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estimatedDelivery: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // SOCIAL FEATURES
  // ===============
  isShared: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sharedWith: {
    type: DataTypes.JSON, // Users cart is shared with
    defaultValue: []
  },
  giftMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // ABANDONMENT TRACKING
  // ====================
  lastInteraction: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  isAbandoned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  abandonmentReminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // CONVERSION TRACKING
  // ===================
  source: {
    type: DataTypes.STRING(100),
    allowNull: true // Where items were added from
  },
  campaign: {
    type: DataTypes.STRING(100),
    allowNull: true // Marketing campaign
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'SocialShoppingCarts',
  timestamps: true,
  indexes: [
    { fields: ['userId'], name: 'social_shopping_carts_user_idx' },
    { fields: ['isActive'], name: 'social_shopping_carts_active_idx' },
    { fields: ['cartType'], name: 'social_shopping_carts_type_idx' },
    { fields: ['isAbandoned'], name: 'social_shopping_carts_abandoned_idx' },
    { fields: ['lastInteraction'], name: 'social_shopping_carts_interaction_idx' }
  ]
});

// SOCIAL CART ITEM MODEL
// =======================
const SocialCartItem = db.define('SocialCartItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  cartId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SocialShoppingCarts',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SocialProducts',
      key: 'id'
    }
  },
  
  // ITEM DETAILS
  // ============
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  
  // PRODUCT VARIANTS
  // ================
  selectedVariants: {
    type: DataTypes.JSON, // Size, color, etc.
    defaultValue: {}
  },
  customizations: {
    type: DataTypes.JSON, // Custom options
    defaultValue: {}
  },
  
  // SOCIAL CONTEXT
  // ==============
  addedFrom: {
    type: DataTypes.ENUM('product_page', 'post', 'story', 'recommendation', 'search', 'creator_link'),
    defaultValue: 'product_page'
  },
  referrerId: {
    type: DataTypes.UUID,
    allowNull: true, // Creator/influencer who referred
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  sourcePostId: {
    type: DataTypes.UUID,
    allowNull: true, // Post where item was discovered
    references: {
      model: 'EnhancedSocialPosts',
      key: 'id'
    }
  },
  
  // ITEM STATUS
  // ===========
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  savedForLater: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // PRICING & DISCOUNTS
  // ===================
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  discountType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  addedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'SocialCartItems',
  timestamps: true,
  indexes: [
    { fields: ['cartId'], name: 'social_cart_items_cart_idx' },
    { fields: ['productId'], name: 'social_cart_items_product_idx' },
    { fields: ['referrerId'], name: 'social_cart_items_referrer_idx' },
    { fields: ['addedFrom'], name: 'social_cart_items_source_idx' },
    { fields: ['isAvailable'], name: 'social_cart_items_available_idx' },
    {
      unique: true,
      fields: ['cartId', 'productId', 'selectedVariants'],
      name: 'unique_cart_product_variant'
    }
  ]
});

// PRODUCT WISHLIST MODEL
// =======================
const ProductWishlist = db.define('ProductWishlist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'SocialProducts',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // WISHLIST DETAILS
  // ================
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  priceWhenAdded: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  // NOTIFICATIONS
  // =============
  notifyOnDiscount: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notifyOnRestock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notifyOnPriceChange: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // SHARING
  // =======
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sharedWith: {
    type: DataTypes.JSON, // Specific users to share with
    defaultValue: []
  },
  
  addedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ProductWishlists',
  timestamps: false, // Using custom addedAt
  indexes: [
    { fields: ['userId'], name: 'product_wishlists_user_idx' },
    { fields: ['productId'], name: 'product_wishlists_product_idx' },
    { fields: ['priority'], name: 'product_wishlists_priority_idx' },
    { fields: ['isPublic'], name: 'product_wishlists_public_idx' },
    {
      unique: true,
      fields: ['userId', 'productId'],
      name: 'unique_user_product_wishlist'
    }
  ]
});

// =====================
// CLASS METHODS
// =====================

/**
 * Create a new social product
 */
SocialProduct.createProduct = async function(sellerId, productData) {
  return this.create({
    ...productData,
    sellerId,
    status: 'draft',
    moderationStatus: 'pending'
  });
};

/**
 * Get trending products
 */
SocialProduct.getTrendingProducts = async function(options = {}) {
  const { limit = 20, category = null, timeframe = '7d' } = options;
  
  const whereClause = {
    status: 'active',
    moderationStatus: 'approved'
  };
  
  if (category) {
    whereClause.category = category;
  }
  
  return this.findAll({
    where: whereClause,
    limit,
    order: [
      [db.Sequelize.literal('(views * 0.3 + totalSales * 0.4 + likes * 0.2 + saves * 0.1)'), 'DESC'],
      ['averageRating', 'DESC']
    ],
    include: [
      {
        model: db.models.User,
        as: 'seller',
        attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'isVerified']
      }
    ]
  });
};

/**
 * Add product to cart
 */
SocialCartItem.addToCart = async function(userId, productId, quantity = 1, options = {}) {
  // Get or create active cart
  let cart = await SocialShoppingCart.findOne({
    where: { userId, isActive: true, cartType: 'regular' }
  });
  
  if (!cart) {
    cart = await SocialShoppingCart.create({ userId });
  }
  
  // Get product info
  const product = await SocialProduct.findByPk(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  
  // Check if item already in cart
  const existingItem = await this.findOne({
    where: { 
      cartId: cart.id, 
      productId,
      selectedVariants: options.selectedVariants || {}
    }
  });
  
  if (existingItem) {
    // Update quantity
    return existingItem.update({
      quantity: existingItem.quantity + quantity,
      totalPrice: (existingItem.quantity + quantity) * product.price
    });
  } else {
    // Add new item
    return this.create({
      cartId: cart.id,
      productId,
      quantity,
      unitPrice: product.price,
      totalPrice: quantity * product.price,
      selectedVariants: options.selectedVariants || {},
      addedFrom: options.addedFrom || 'product_page',
      referrerId: options.referrerId,
      sourcePostId: options.sourcePostId
    });
  }
};

/**
 * Add product to wishlist
 */
ProductWishlist.addToWishlist = async function(userId, productId, options = {}) {
  const product = await SocialProduct.findByPk(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  
  return this.create({
    userId,
    productId,
    priceWhenAdded: product.price,
    notes: options.notes,
    priority: options.priority || 'medium',
    notifyOnDiscount: options.notifyOnDiscount !== false,
    notifyOnRestock: options.notifyOnRestock !== false
  });
};

/**
 * Create product review
 */
ProductReview.createReview = async function(userId, productId, reviewData, orderId = null) {
  // Verify user purchased the product if orderId provided
  let isVerifiedPurchase = false;
  if (orderId) {
    const order = await db.models.Order.findOne({
      where: { id: orderId, userId },
      include: [{
        model: db.models.OrderItem,
        where: { productId }
      }]
    });
    isVerifiedPurchase = !!order;
  }
  
  return this.create({
    ...reviewData,
    userId,
    productId,
    orderId,
    isVerifiedPurchase
  });
};

export { SocialProduct, ProductReview, SocialShoppingCart, SocialCartItem, ProductWishlist };
