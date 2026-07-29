// backend/services/foodScannerService.mjs
import axios from 'axios';
import logger from '../utils/logger.mjs';
import FoodProduct from '../models/FoodProduct.mjs';
import FoodIngredient from '../models/FoodIngredient.mjs';
import FoodScanHistory from '../models/FoodScanHistory.mjs';
import { Op } from 'sequelize';
import { isFatSecretConfigured, findByBarcode as fatSecretBarcode } from './fatSecretService.mjs';

/**
 * Service to handle food product scanning and ingredient analysis
 * Combines data from external APIs with our internal database
 */
class FoodScannerService {
  /**
   * The base URL for the Open Food Facts API
   * @private
   */
  #openFoodFactsBaseUrl = 'https://world.openfoodfacts.org/api/v0/product/';

  /**
   * Search for a product by barcode in our database and external sources
   * 
   * @param {string} barcode - The UPC/EAN barcode to search for
   * @param {string} userId - The user ID performing the scan (if authenticated)
   * @returns {Promise<Object>} - The product information and analysis
   */
  async getProductByBarcode(barcode, userId = null) {
    try {
      logger.info(`Searching for product with barcode: ${barcode}`);

      // First check our database for the product
      let product = await FoodProduct.findOne({
        where: { barcode }
      });

      // If product is not in our database, search external API and save it
      if (!product) {
        logger.info(`Product with barcode ${barcode} not found in database, searching external API`);
        const externalProduct = await this.#fetchProductFromExternalApi(barcode);
        
        if (externalProduct) {
          product = await this.#saveProductToDatabase(externalProduct);
        }
      } else {
        // Update the scan count for the existing product
        await product.increment('scanCount');
        logger.info(`Incremented scan count for product ${product.id} (${product.name})`);
      }

      // If we still don't have a product, return null
      if (!product) {
        logger.warn(`Product with barcode ${barcode} not found`);
        return null;
      }

      // If user is authenticated, record the scan in their history
      if (userId && product) {
        await this.#recordScanHistory(userId, product, barcode);
      }

      // Attach ingredient analysis if we have ingredients data
      const productWithAnalysis = await this.#enrichProductWithAnalysis(product);
      
      return productWithAnalysis;
    } catch (error) {
      logger.error(`Error getting product by barcode: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Search for products by name, brand, or category
   * 
   * @param {Object} options - Search options
   * @param {string} options.query - The search query
   * @param {string} options.category - Optional category filter
   * @param {string} options.healthRating - Optional health rating filter ('good', 'bad', 'okay')
   * @param {boolean} options.organic - Filter for organic products
   * @param {boolean} options.nonGMO - Filter for non-GMO products
   * @param {number} options.limit - Maximum number of results to return
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Object>} - Search results with pagination info
   */
  async searchProducts(options) {
    try {
      const {
        query = '',
        category,
        healthRating,
        organic,
        nonGMO,
        limit = 10,
        offset = 0
      } = options;

      // Build the where clause based on the search parameters
      const whereClause = {};
      
      if (query) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${query}%` } },
          { brand: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } }
        ];
      }
      
      if (category) {
        whereClause.category = { [Op.iLike]: `%${category}%` };
      }
      
      if (healthRating) {
        whereClause.overallRating = healthRating;
      }
      
      if (organic) {
        whereClause.isOrganic = true;
      }
      
      if (nonGMO) {
        whereClause.isNonGMO = true;
      }

      // Execute the search query
      const { count, rows } = await FoodProduct.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['scanCount', 'DESC'], ['name', 'ASC']]
      });

      return {
        products: rows,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error(`Error searching products: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a user's scan history
   * 
   * @param {string} userId - The user ID
   * @param {Object} options - Pagination options
   * @param {number} options.limit - Maximum number of results to return
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Object>} - Scan history with pagination info
   */
  async getUserScanHistory(userId, options = {}) {
    try {
      const {
        limit = 10,
        offset = 0
      } = options;

      // No favorites filter and no product include: food_scan_history has neither an isFavorite
      // column nor a productId FK — rows carry productName/productCode/imageUrl directly
      // (rule 58, verified 2026-07-29). The route rejects favorites=true explicitly.
      const { count, rows } = await FoodScanHistory.findAndCountAll({
        where: { userId },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['scanDate', 'DESC']]
      });

      return {
        scans: rows,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error(`Error getting user scan history: ${error.message}`, error);
      throw error;
    }
  }

  // NOTE: updateScanHistory was removed 2026-07-29 (rule 58). Every field it allowed
  // (notes/userRating/isFavorite/wasConsumed) was a phantom column — food_scan_history has no
  // user-editable columns, so the method could only ever no-op or crash. The route now returns
  // an explicit 400. Restoring scan edits requires an additive migration first (SWA-87).

  /**
   * Analyze ingredients in a product and determine health rating
   * 
   * @param {string} ingredientsList - Raw ingredients list from packaging
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzeIngredients(ingredientsList) {
    try {
      if (!ingredientsList) {
        return {
          ingredients: [],
          overallRating: 'okay',
          concerns: [],
          gmoCount: 0,
          processedCount: 0,
          goodCount: 0,
          badCount: 0,
          okayCount: 0
        };
      }

      // Parse the ingredients list into individual ingredients
      const ingredientNames = this.#parseIngredientsString(ingredientsList);
      
      // Look up each ingredient in our database
      const ingredients = [];
      let gmoCount = 0;
      let processedCount = 0;
      let goodCount = 0;
      let badCount = 0;
      let okayCount = 0;
      const concerns = new Set();
      let iarcCount = 0;
      let euBannedCount = 0;

      for (const name of ingredientNames) {
        const ingredient = await FoodIngredient.findOne({
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: name } },
              { name: { [Op.iLike]: `%${name}%` } }
            ]
          }
        });

        if (ingredient) {
          // Build enriched ingredient object with safety fields
          const enriched = {
            name: ingredient.name,
            healthRating: ingredient.healthRating,
            isGMO: ingredient.isGMO,
            isProcessed: ingredient.isProcessed,
            category: ingredient.category || null,
            description: ingredient.description || null,
            iarcGroup: ingredient.iarcGroup || null,
            isEUBanned: ingredient.isEUBanned || false,
            bannedRegions: ingredient.bannedRegions || [],
            healthConcerns: ingredient.healthConcerns || [],
            healthierAlternatives: ingredient.healthierAlternatives || [],
          };
          ingredients.push(enriched);

          if (ingredient.isGMO) gmoCount++;
          if (ingredient.isProcessed) processedCount++;
          if (ingredient.iarcGroup && ['1', '2A'].includes(ingredient.iarcGroup)) iarcCount++;
          if (ingredient.isEUBanned) euBannedCount++;

          if (ingredient.healthRating === 'good') goodCount++;
          else if (ingredient.healthRating === 'bad') badCount++;
          else okayCount++;

          // Add health concerns
          if (ingredient.healthConcerns && Array.isArray(ingredient.healthConcerns)) {
            for (const concern of ingredient.healthConcerns) {
              concerns.add(concern);
            }
          }

          // Flag IARC carcinogens and EU-banned in concerns
          if (ingredient.iarcGroup === '1') {
            concerns.add(`${ingredient.name}: IARC Group 1 carcinogen (confirmed)`);
          } else if (ingredient.iarcGroup === '2A') {
            concerns.add(`${ingredient.name}: IARC Group 2A (probably carcinogenic)`);
          }
          if (ingredient.isEUBanned) {
            concerns.add(`${ingredient.name}: Banned in the EU`);
          }
        } else {
          // If ingredient not found, add a placeholder with unknown status
          ingredients.push({
            name,
            healthRating: 'okay',
            isGMO: false,
            isProcessed: false,
            iarcGroup: null,
            isEUBanned: false,
            bannedRegions: [],
            healthConcerns: [],
            healthierAlternatives: [],
          });

          okayCount++;
        }
      }

      // Determine overall rating — IARC 1/2A or EU-banned forces 'bad'
      let overallRating = 'okay';

      if (badCount > 0 || iarcCount > 0 || euBannedCount > 0 || gmoCount / ingredientNames.length > 0.3) {
        overallRating = 'bad';
      } else if (goodCount > badCount && goodCount / ingredientNames.length > 0.7) {
        overallRating = 'good';
      }

      return {
        ingredients,
        overallRating,
        concerns: Array.from(concerns),
        gmoCount,
        processedCount,
        goodCount,
        badCount,
        okayCount,
        iarcCount,
        euBannedCount,
      };
    } catch (error) {
      logger.error(`Error analyzing ingredients: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Fetch a product from the Open Food Facts API
   * 
   * @param {string} barcode - The UPC/EAN barcode
   * @returns {Promise<Object>} - Product data from the API
   * @private
   */
  async #fetchProductFromExternalApi(barcode) {
    try {
      const url = `${this.#openFoodFactsBaseUrl}${barcode}.json`;
      logger.info(`Fetching product data from external API: ${url}`);
      
      const response = await axios.get(url);
      
      if (response.data && response.data.status === 1 && response.data.product) {
        return response.data.product;
      }
      
      logger.info(`Product with barcode ${barcode} not found in Open Food Facts, trying FatSecret`);

      // Fallback: try FatSecret barcode lookup
      if (isFatSecretConfigured()) {
        const fsProduct = await fatSecretBarcode(barcode);
        if (fsProduct) {
          logger.info(`Found product via FatSecret barcode: ${fsProduct.name}`);
          // Convert FatSecret format to Open Food Facts-like shape for saveProductToDatabase
          return {
            code: barcode,
            product_name: fsProduct.name,
            brands: fsProduct.brand,
            ingredients_text: null, // FatSecret doesn't provide ingredients list
            categories: null,
            image_url: null,
            nutriments: fsProduct.primaryServing ? {
              'energy-kcal_100g': fsProduct.primaryServing.calories,
              fat_100g: fsProduct.primaryServing.fat,
              'saturated-fat_100g': fsProduct.primaryServing.saturatedFat,
              carbohydrates_100g: fsProduct.primaryServing.carbs,
              sugars_100g: fsProduct.primaryServing.sugar,
              proteins_100g: fsProduct.primaryServing.protein,
              fiber_100g: fsProduct.primaryServing.fiber,
              sodium_100g: fsProduct.primaryServing.sodium,
            } : null,
            labels: null,
            _source: 'FatSecret',
          };
        }
      }

      logger.warn(`Product with barcode ${barcode} not found in any external API`);
      return null;
    } catch (error) {
      logger.error(`Error fetching product from external API: ${error.message}`, error);
      return null;
    }
  }

  /**
   * Save a product from external API to our database
   * 
   * @param {Object} externalProduct - Product data from external API
   * @returns {Promise<Object>} - Saved product from our database
   * @private
   */
  async #saveProductToDatabase(externalProduct) {
    try {
      // Extract relevant data from the external API response
      const {
        code: barcode,
        product_name: name,
        brands: brand,
        ingredients_text: ingredientsList,
        categories,
        image_url: imageUrl,
        nutriments,
        labels
      } = externalProduct;

      // Check for organic and non-GMO certifications in labels
      const isOrganic = labels ? 
        labels.toLowerCase().includes('organic') : false;
      
      const isNonGMO = labels ? 
        labels.toLowerCase().includes('non-gmo') : false;

      // Analyze ingredients to determine health rating
      const ingredientAnalysis = await this.analyzeIngredients(ingredientsList);

      // Create a new product record
      const newProduct = await FoodProduct.create({
        barcode,
        name: name || 'Unknown Product',
        brand: brand || null,
        description: categories || null,
        ingredientsList,
        nutritionalInfo: nutriments || null,
        overallRating: ingredientAnalysis.overallRating,
        ratingReasons: [],
        healthConcerns: ingredientAnalysis.concerns,
        isOrganic,
        isNonGMO,
        category: categories ? categories.split(', ')[0] : null,
        imageUrl,
        dataSource: externalProduct._source || 'Open Food Facts',
        lastVerified: new Date(),
        scanCount: 1
      });

      logger.info(`Saved new product to database: ${newProduct.id} (${newProduct.name})`);
      return newProduct;
    } catch (error) {
      logger.error(`Error saving product to database: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Record a scan in the user's history
   * 
   * @param {string} userId - The user ID
   * @param {Object} product - The FoodProduct row that was scanned
   * @param {string} barcode - The scanned barcode
   * @returns {Promise<Object>} - The created scan history record
   * @private
   */
  async #recordScanHistory(userId, product, barcode) {
    try {
      // food_scan_history is a denormalized log: productName/productCode are copied at scan
      // time; there is no product FK column (rule 58, verified 2026-07-29). The previous write
      // sent productId/barcode/wasConsumed — three phantom columns — while omitting the
      // NOT NULL productName, so every insert failed and was swallowed below.
      const scan = await FoodScanHistory.create({
        userId,
        productName: product.name,
        productCode: barcode ?? product.barcode ?? null,
        scanDate: new Date(),
        imageUrl: product.imageUrl ?? null
      });

      logger.info(`Recorded scan history for user ${userId}, product ${product.id}`);
      return scan;
    } catch (error) {
      logger.error(`Error recording scan history: ${error.message}`, error);
      // Don't throw here - we still want to return the product even if recording history fails
      return null;
    }
  }

  /**
   * Enrich a product with detailed analysis
   * 
   * @param {Object} product - Product from database
   * @returns {Promise<Object>} - Product with additional analysis
   * @private
   */
  async #enrichProductWithAnalysis(product) {
    try {
      // If we don't have ingredients list, return the product as is
      if (!product.ingredientsList) {
        return product;
      }

      // Analyze the ingredients if we don't already have an analysis
      if (!product.ingredients) {
        const ingredientAnalysis = await this.analyzeIngredients(product.ingredientsList);
        
        // Update the product with the analysis results
        await product.update({
          ingredients: ingredientAnalysis.ingredients.map(i => ({
            name: i.name,
            healthRating: i.healthRating,
            isGMO: i.isGMO,
            isProcessed: i.isProcessed,
            iarcGroup: i.iarcGroup || null,
            isEUBanned: i.isEUBanned || false,
            bannedRegions: i.bannedRegions || [],
            healthConcerns: i.healthConcerns || [],
            healthierAlternatives: i.healthierAlternatives || [],
          })),
          overallRating: ingredientAnalysis.overallRating,
          healthConcerns: ingredientAnalysis.concerns
        });
      }

      return product;
    } catch (error) {
      logger.error(`Error enriching product with analysis: ${error.message}`, error);
      return product;
    }
  }

  /**
   * Parse a raw ingredients string into individual ingredients
   * 
   * @param {string} ingredientsString - Raw ingredients list from packaging
   * @returns {string[]} - Array of individual ingredient names
   * @private
   */
  #parseIngredientsString(ingredientsString) {
    if (!ingredientsString) return [];

    // Common separators in ingredients lists
    const ingredients = ingredientsString
      .replace(/\([^)]*\)/g, '') // Remove parenthetical content
      .split(/,|\.|;/)            // Split by common separators
      .map(item => item.trim())
      .filter(item => item.length > 0);

    return ingredients;
  }
}

// Export a singleton instance
const foodScannerService = new FoodScannerService();
export default foodScannerService;