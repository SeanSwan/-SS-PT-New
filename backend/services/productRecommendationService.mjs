// backend/services/productRecommendationService.mjs
import { Op } from 'sequelize';
import StorefrontItem from '../models/StorefrontItem.mjs';
import User from '../models/User.mjs';
import Order from '../models/Order.mjs';
import OrderItem from '../models/OrderItem.mjs';
import WorkoutSession from '../models/WorkoutSession.mjs';
import WorkoutExercise from '../models/WorkoutExercise.mjs';
import Exercise from '../models/Exercise.mjs';
import MuscleGroup from '../models/MuscleGroup.mjs';
import CartItem from '../models/CartItem.mjs';
import ShoppingCart from '../models/ShoppingCart.mjs';
import logger from '../utils/logger.mjs';

/**
 * Product Recommendation Service
 * 
 * This service provides personalized product recommendations based on various factors:
 * 1. User's previous purchases (past orders)
 * 2. User's workout history (exercises, muscle groups they focus on)
 * 3. User's browsing behavior (items added to cart but not purchased)
 * 4. Currently popular items across the platform
 * 5. Complementary items based on current cart contents
 */
class ProductRecommendationService {
  /**
   * Get personalized recommendations for a user
   * 
   * @param {string} userId - The user's ID
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Array of recommended StorefrontItems
   */
  async getPersonalizedRecommendations(userId, limit = 4) {
    try {
      // Get user details to understand their profile
      const user = await User.findByPk(userId);
      
      if (!user) {
        logger.warn(`Cannot generate recommendations for unknown user: ${userId}`);
        return this.getPopularItems(limit);
      }
      
      // Collect recommendation candidates from different strategies
      const [
        previousPurchases,
        workoutBasedItems,
        cartAbandonedItems
      ] = await Promise.all([
        this.getPreviouslyPurchasedItems(userId),
        this.getWorkoutBasedRecommendations(userId),
        this.getCartAbandonedItems(userId)
      ]);
      
      // Get IDs of items the user has already interacted with
      const userInteractedItemIds = new Set([
        ...previousPurchases.map(item => item.id),
        ...cartAbandonedItems.map(item => item.id)
      ]);
      
      // Get popular items but exclude ones the user has already interacted with
      const popularItems = await this.getPopularItems(limit * 2);
      const filteredPopularItems = popularItems.filter(item => !userInteractedItemIds.has(item.id));
      
      // Combine all recommendation sources and prioritize them
      const combinedRecommendations = [
        ...workoutBasedItems, // Highest priority: based on their actual workouts
        ...cartAbandonedItems, // Second priority: things they've considered buying
        ...filteredPopularItems // Lowest priority: generally popular items
      ];
      
      // Ensure we only include each item once
      const uniqueRecommendations = this.deduplicateItems(combinedRecommendations);
      
      // Return the requested number of recommendations
      return uniqueRecommendations.slice(0, limit);
    } catch (error) {
      logger.error(`Error generating personalized recommendations: ${error.message}`);
      // Fallback to popular items if there's an error
      return this.getPopularItems(limit);
    }
  }
  
  /**
   * Get complementary item recommendations based on a storefront item
   * 
   * @param {number} itemId - The storefront item ID
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Array of complementary StorefrontItems
   */
  async getComplementaryItems(itemId, limit = 3) {
    try {
      // Get the source item
      const sourceItem = await StorefrontItem.findByPk(itemId);
      
      if (!sourceItem) {
        logger.warn(`Cannot find complementary items for unknown item: ${itemId}`);
        return this.getPopularItems(limit);
      }
      
      let complementaryItems = [];
      
      // If this is a training package, recommend supplementary items or equipment
      if (sourceItem.packageType === 'fixed' || sourceItem.packageType === 'monthly') {
        // Get supplements, apparel, or equipment that complement training
        complementaryItems = await StorefrontItem.findAll({
          where: {
            id: { [Op.ne]: itemId }, // Not the source item
            // Look for items of a different type than the source
            [Op.or]: [
              { packageType: { [Op.ne]: sourceItem.packageType } },
              { itemType: { [Op.ne]: sourceItem.itemType } }
            ],
            isActive: true
          },
          limit: limit * 2
        });
      } 
      // If this is equipment or a supplement, recommend related training packages
      else {
        // Recommend training packages that would go well with this item
        complementaryItems = await StorefrontItem.findAll({
          where: {
            id: { [Op.ne]: itemId }, // Not the source item
            // Look for training packages
            [Op.or]: [
              { packageType: 'fixed' },
              { packageType: 'monthly' }
            ],
            isActive: true
          },
          limit: limit * 2
        });
      }
      
      // If we couldn't find specific complementary items, fall back to popular items
      if (complementaryItems.length < limit) {
        const popularItems = await this.getPopularItems(limit * 2);
        const filteredPopularItems = popularItems.filter(item => 
          item.id !== itemId && !complementaryItems.some(ci => ci.id === item.id)
        );
        
        complementaryItems = [
          ...complementaryItems,
          ...filteredPopularItems
        ];
      }
      
      // Deduplicate and limit results
      const uniqueRecommendations = this.deduplicateItems(complementaryItems);
      return uniqueRecommendations.slice(0, limit);
    } catch (error) {
      logger.error(`Error generating complementary recommendations: ${error.message}`);
      // Fallback to popular items if there's an error
      return this.getPopularItems(limit);
    }
  }
  
  /**
   * Get recommendations based on items in the user's current cart
   * 
   * @param {string} userId - The user's ID
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Array of recommended StorefrontItems
   */
  async getCartBasedRecommendations(userId, limit = 3) {
    try {
      // Get the user's active cart
      const cart = await ShoppingCart.findOne({
        where: { 
          userId, 
          status: 'active' 
        },
        include: [{
          model: CartItem,
          as: 'cartItems',
          include: [{
            model: StorefrontItem,
            as: 'storefrontItem'
          }]
        }]
      });
      
      if (!cart || !cart.cartItems || cart.cartItems.length === 0) {
        // No cart or empty cart, fall back to personalized recommendations
        return this.getPersonalizedRecommendations(userId, limit);
      }
      
      // Get complementary items for each item in the cart
      const cartItemIds = cart.cartItems.map(item => item.storefrontItemId);
      let allComplementaryItems = [];
      
      // For each cart item, get complementary recommendations
      for (const itemId of cartItemIds) {
        const complementaryItems = await this.getComplementaryItems(itemId, limit);
        allComplementaryItems = [...allComplementaryItems, ...complementaryItems];
      }
      
      // Filter out items already in the cart
      const filteredItems = allComplementaryItems.filter(item => 
        !cartItemIds.includes(item.id)
      );
      
      // Deduplicate and limit results
      const uniqueRecommendations = this.deduplicateItems(filteredItems);
      return uniqueRecommendations.slice(0, limit);
    } catch (error) {
      logger.error(`Error generating cart-based recommendations: ${error.message}`);
      // Fallback to popular items if there's an error
      return this.getPopularItems(limit);
    }
  }
  
  /**
   * Get items the user has previously purchased
   * 
   * @param {string} userId - The user's ID
   * @returns {Promise<Array>} - Array of previously purchased StorefrontItems
   */
  async getPreviouslyPurchasedItems(userId) {
    try {
      // Get the user's completed orders
      const orders = await Order.findAll({
        where: { 
          userId,
          status: 'completed'
        },
        include: [{
          model: OrderItem,
          as: 'orderItems',
          include: [{
            model: StorefrontItem,
            as: 'storefrontItem'
          }]
        }]
      });
      
      if (!orders || orders.length === 0) {
        return [];
      }
      
      // Extract and deduplicate items from all orders
      const purchasedItems = orders.flatMap(order => 
        order.orderItems
          .map(item => item.storefrontItem)
          .filter(item => item !== null)
      );
      
      return this.deduplicateItems(purchasedItems);
    } catch (error) {
      logger.error(`Error retrieving previous purchases: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get recommendations based on user's workout history
   * 
   * @param {string} userId - The user's ID
   * @returns {Promise<Array>} - Array of recommended StorefrontItems
   */
  async getWorkoutBasedRecommendations(userId) {
    try {
      // Get the user's recent workout sessions and exercises
      const workoutSessions = await WorkoutSession.findAll({
        where: { userId },
        include: [{
          model: WorkoutExercise,
          as: 'exercises',
          include: [{
            model: Exercise,
            as: 'exercise',
            include: [{
              model: MuscleGroup,
              as: 'muscleGroups'
            }]
          }]
        }],
        order: [['createdAt', 'DESC']],
        limit: 10 // Only consider recent sessions
      });
      
      if (!workoutSessions || workoutSessions.length === 0) {
        return [];
      }
      
      // Extract all muscle groups the user has worked on
      const muscleGroups = new Set();
      workoutSessions.forEach(session => {
        session.exercises.forEach(exercise => {
          if (exercise.exercise && exercise.exercise.muscleGroups) {
            exercise.exercise.muscleGroups.forEach(muscleGroup => {
              muscleGroups.add(muscleGroup.name.toLowerCase());
            });
          }
        });
      });
      
      // If no muscle groups found, return empty array
      if (muscleGroups.size === 0) {
        return [];
      }
      
      // Look for products that match the user's focus areas
      // This requires storefront items to have tags or descriptions that mention muscle groups
      const muscleGroupsArray = Array.from(muscleGroups);
      const recommendations = await StorefrontItem.findAll({
        where: {
          [Op.or]: muscleGroupsArray.map(muscleGroup => ({
            [Op.or]: [
              { name: { [Op.iLike]: `%${muscleGroup}%` } },
              { description: { [Op.iLike]: `%${muscleGroup}%` } }
            ]
          })),
          isActive: true
        },
        limit: 10
      });
      
      return recommendations;
    } catch (error) {
      logger.error(`Error generating workout-based recommendations: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get items the user has added to cart but not purchased
   * 
   * @param {string} userId - The user's ID
   * @returns {Promise<Array>} - Array of abandoned cart StorefrontItems
   */
  async getCartAbandonedItems(userId) {
    try {
      // Get abandoned carts (status 'completed' but via expiration, not purchase)
      const abandonedCarts = await ShoppingCart.findAll({
        where: { 
          userId,
          status: 'active',
          checkoutSessionExpired: true
        },
        include: [{
          model: CartItem,
          as: 'cartItems',
          include: [{
            model: StorefrontItem,
            as: 'storefrontItem',
            where: {
              isActive: true // Only include items that are still active
            }
          }]
        }],
        order: [['updatedAt', 'DESC']],
        limit: 5 // Only consider recent abandoned carts
      });
      
      if (!abandonedCarts || abandonedCarts.length === 0) {
        return [];
      }
      
      // Extract items from abandoned carts
      const abandonedItems = abandonedCarts.flatMap(cart => 
        cart.cartItems.map(item => item.storefrontItem).filter(item => item !== null)
      );
      
      return this.deduplicateItems(abandonedItems);
    } catch (error) {
      logger.error(`Error retrieving abandoned cart items: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get the most popular items based on order frequency
   * 
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} - Array of popular StorefrontItems
   */
  async getPopularItems(limit = 6) {
    try {
      // Query the database for order items and group by storefrontItemId
      const orderItems = await OrderItem.findAll({
        attributes: [
          'storefrontItemId',
          [sequelize.fn('COUNT', sequelize.col('storefrontItemId')), 'orderCount']
        ],
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem',
          where: {
            isActive: true // Only include active items
          }
        }],
        group: ['storefrontItemId', 'storefrontItem.id'],
        order: [[sequelize.fn('COUNT', sequelize.col('storefrontItemId')), 'DESC']],
        limit
      });
      
      if (!orderItems || orderItems.length === 0) {
        // Fallback to fetching all active items if no order data is available
        const activeItems = await StorefrontItem.findAll({
          where: { isActive: true },
          limit
        });
        
        return activeItems;
      }
      
      // Extract the StorefrontItems from the results
      return orderItems.map(item => item.storefrontItem);
    } catch (error) {
      logger.error(`Error retrieving popular items: ${error.message}`);
      
      // Fallback to fetching all active items on error
      try {
        const activeItems = await StorefrontItem.findAll({
          where: { isActive: true },
          limit
        });
        
        return activeItems;
      } catch (fallbackError) {
        logger.error(`Failed to fetch fallback items: ${fallbackError.message}`);
        return [];
      }
    }
  }
  
  /**
   * Get recommendations for a specific category
   * 
   * @param {string} category - The category to filter by
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} - Array of category-specific StorefrontItems
   */
  async getCategoryRecommendations(category, limit = 6) {
    try {
      // Query items by category
      const categoryItems = await StorefrontItem.findAll({
        where: {
          category: { [Op.iLike]: `%${category}%` },
          isActive: true
        },
        limit
      });
      
      if (categoryItems.length < limit) {
        // If we didn't find enough items by exact category match, try looser matching
        const additionalItems = await StorefrontItem.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${category}%` } },
              { description: { [Op.iLike]: `%${category}%` } }
            ],
            id: { [Op.notIn]: categoryItems.map(item => item.id) }, // Exclude already found items
            isActive: true
          },
          limit: limit - categoryItems.length
        });
        
        return [...categoryItems, ...additionalItems];
      }
      
      return categoryItems;
    } catch (error) {
      logger.error(`Error retrieving category recommendations: ${error.message}`);
      return this.getPopularItems(limit);
    }
  }
  
  /**
   * Helper function to deduplicate items by ID
   * 
   * @param {Array} items - Array of items that may contain duplicates
   * @returns {Array} - Array with duplicates removed
   */
  deduplicateItems(items) {
    const seen = new Set();
    return items.filter(item => {
      if (!item || !item.id || seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }
}

// Export a singleton instance of the service
const productRecommendationService = new ProductRecommendationService();
export default productRecommendationService;