/**
 * API configuration for the frontend.
 * Uses NEXT_PUBLIC_API_URL if set (production), otherwise defaults to local /api.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// If API_BASE_URL is empty, it means we are using the Next.js proxy/rewrites or local routes.
// In the current setup, we'll use it as a prefix for all API calls.
