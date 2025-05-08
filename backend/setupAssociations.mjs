/**
 * Main associations setup file
 * ===========================
 * This wrapper imports and executes the model associations setup.
 */

import getModelsFunction from './models/associations.mjs';

// Global models container
let models = null;

/**
 * Set up database model associations
 * @returns {Promise<Object>} The models with associations
 */
export default async function setupAssociations() {
  // Only set up associations once
  if (models) {
    return models;
  }

  try {
    console.log('Setting up model associations...');
    models = await getModelsFunction();
    console.log('Model associations set up successfully');
    return models;
  } catch (error) {
    console.error('Error setting up model associations:', error);
    throw error;
  }
}

// Export a getModelsFromCache function instead of getModels to avoid naming conflicts
export function getModelsFromCache() {
  return models;
}
