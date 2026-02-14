/**
 * Vehicle API Service
 * Handles fetching car brands and models from external API
 */

// API service for car brands and models
const CAR_BRANDS_API = 'https://naqiago.com/api/car_brands_logos'
const CAR_MODELS_API = 'https://naqiago.com/api/car_models_names'
const BRANDS_API_KEY = 'Bearer a47c1d2f9b8e3a6c9d7e5f4a1b0c2d3e4f6a7b8c9d1e2f3a4b5c6d7e8f9a0b1'
const MODELS_API_KEY = 'Bearer 9f2e7b4c8a1d6e3f5b0c9a7d2e4f6b8c1d3a5f7e9b0c2d4f6a8b1c3d5e7f9a0'

/**
 * Fetch all car brands with logos
 * @returns {Promise<Array>} Array of car brands with id, name, and logo
 */
export async function getCarBrands() {
  try {
    const response = await fetch(CAR_BRANDS_API, {
      method: 'GET',
      headers: {
        'Authorization': BRANDS_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch car brands: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

/**
 * Fetch car models for a specific brand
 * @param {number|string} brandId - The car brand ID
 * @returns {Promise<Array>} Array of car models for the specified brand
 */
export async function getCarModels(brandId) {
  try {
    const response = await fetch(`${CAR_MODELS_API}/${brandId}`, {
      method: 'GET',
      headers: {
        'Authorization': MODELS_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch car models: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching car models:', error)
    throw error
  }
}

/**
 * Get full logo URL for a car brand
 * @param {string} logoPath - The relative logo path from API
 * @returns {string} Full URL to the logo
 */
export function getCarBrandLogoUrl(logoPath) {
  if (!logoPath) return null

  // If it's already a full URL, return as is
  if (logoPath.startsWith('http')) {
    return logoPath
  }

  // Construct full URL (Laravel stores public files under /storage/)
  return `https://naqiago.com/storage/${logoPath}`
}

/**
 * Helper function to get car model image URL
 * @param {string} imagePath - The relative image path from API
 * @returns {string} Full URL to the car model image
 */
export function getCarModelImageUrl(imagePath) {
  if (!imagePath) return null
  // If it's already a full URL, return it
  if (imagePath.startsWith('http')) return imagePath
  // Otherwise, construct the full URL (Laravel stores public files under /storage/)
  return `https://naqiago.com/storage/${imagePath}`
}

/**
 * Search car brands by name
 * @param {Array} brands - Array of car brands
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered car brands
 */
export function searchCarBrands(brands, searchTerm) {
  if (!searchTerm || !brands) return brands

  const term = searchTerm.toLowerCase().trim()
  return brands.filter(brand =>
    brand.car_brand_name.toLowerCase().includes(term)
  )
}

/**
 * Search car models by name
 * @param {Array} models - Array of car models
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered car models
 */
export function searchCarModels(models, searchTerm) {
  if (!searchTerm || !models) return models

  const term = searchTerm.toLowerCase().trim()
  return models.filter(model =>
    (model.car_model_name || '').toLowerCase().includes(term)
  )
}

/**
 * Get popular car brands (you can customize this list)
 * @returns {Promise<Array>} Array of popular car brands
 */
export async function getPopularCarBrands() {
  try {
    const allBrands = await getCarBrands()
    const popularBrandNames = ['TOYOTA', 'HONDA', 'FORD', 'BMW', 'MERCEDES', 'AUDI', 'VOLKSWAGEN', 'NISSAN']

    const popularBrands = allBrands.filter(brand =>
      popularBrandNames.includes(brand.car_brand_name.toUpperCase())
    )

    return popularBrands
  } catch (error) {
    console.error('Error getting popular brands:', error)
    throw error
  }
}
