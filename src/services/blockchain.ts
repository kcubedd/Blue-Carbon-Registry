import { Submission } from "../types";

// ABI for the BlueCarbonRegistry contract (for view functions ONLY)
const ABI = [
  "function getRecord(string _submissionId) external view returns (tuple(string submissionId, string userId, int256 latitude, int256 longitude, uint256 timestamp, uint256 credits, string imageHash))",
  "function recordExists(string _submissionId) external view returns (bool)"
];

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const RPC_URL = import.meta.env.VITE_POLYGON_RPC_URL || "https://rpc-mumbai.maticvigil.com";

/**
 * Calls the backend API to store a record on the blockchain.
 * This ensures the admin private key is never exposed to the client.
 */
export const storeOnBlockchain = async (submission: Submission, imageHash: string) => {
  try {
    const response = await fetch("/api/blockchain/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionId: submission.id,
        userId: submission.userId,
        latitude: submission.latitude,
        longitude: submission.longitude,
        timestamp: Math.floor(new Date(submission.createdAt).getTime() / 1000),
        credits: submission.creditsAssigned || 0,
        imageHash: imageHash
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to store on blockchain");
    }

    const data = await response.json();
    return data.txHash;
  } catch (error: any) {
    console.error("Error storing on blockchain:", error);
    throw error;
  }
};

/**
 * Generates a link to the Polygon explorer for a given transaction hash.
 */
export const getExplorerUrl = (txHash: string) => {
  // Amoy testnet explorer example
  return `https://amoy.polygonscan.com/tx/${txHash}`;
};
