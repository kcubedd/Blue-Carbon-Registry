import { Submission } from "../types";

/**
 * Validates the integrity of a submission before it's sent to the blockchain.
 * Ensures that the geo-tag and image hash are present and valid.
 */
export const validateSubmissionIntegrity = (submission: Submission, imageHash: string): { valid: boolean; error?: string } => {
  // 1. Check for coordinates
  if (submission.latitude === undefined || submission.longitude === undefined) {
    return { valid: false, error: "Missing geographical coordinates (latitude/longitude)." };
  }

  // 2. Validate coordinate ranges
  if (submission.latitude < -90 || submission.latitude > 90) {
    return { valid: false, error: "Invalid latitude. Must be between -90 and 90." };
  }
  if (submission.longitude < -180 || submission.longitude > 180) {
    return { valid: false, error: "Invalid longitude. Must be between -180 and 180." };
  }

  // 3. Check for image hash
  if (!imageHash || imageHash.length < 8) {
    return { valid: false, error: "Invalid or missing image integrity hash." };
  }

  // 4. Check for submission ID
  if (!submission.id) {
    return { valid: false, error: "Missing submission identifier." };
  }

  return { valid: true };
};

/**
 * Generates a simple deterministic hash for an image URL.
 * In a production environment, this should be a SHA-256 hash of the actual image bytes.
 */
export const generateImageHash = (imageUrl: string): string => {
  // For demo purposes, we use a base64 encoding of the URL
  // In a real app, you'd fetch the image and hash its content
  return btoa(imageUrl).substring(0, 32);
};
