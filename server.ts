import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import net from "net";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import dotenv from "dotenv";
import Razorpay from "razorpay";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// ABI for the BlueCarbonRegistry contract
const ABI = [
  "function storeRecord(string _submissionId, string _userId, int256 _latitude, int256 _longitude, uint256 _timestamp, uint256 _credits, string _imageHash) external",
  "function getRecord(string _submissionId) external view returns (tuple(string submissionId, string userId, int256 latitude, int256 longitude, uint256 timestamp, uint256 credits, string imageHash))",
  "function recordExists(string _submissionId) external view returns (bool)"
];

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.POLYGON_RPC_URL;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Razorpay Setup
const rzp = process.env.RAZORPAY_KEY_ID ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null;

// API Route for Blockchain Verification
app.post("/api/blockchain/verify", async (req, res) => {
  try {
    const { submissionId, userId, latitude, longitude, timestamp, credits, imageHash } = req.body;

    if (!submissionId || !userId || latitude === undefined || longitude === undefined || !timestamp || credits === undefined || !imageHash) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!ADMIN_PRIVATE_KEY || !RPC_URL || !CONTRACT_ADDRESS) {
      // For demo purposes, if keys are missing, return a mock success
      console.warn("Blockchain keys missing, returning mock success for demo");
      return res.json({ 
        success: true, 
        txHash: "0x" + Math.random().toString(16).slice(2, 66),
        status: "mocked"
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    const exists = await contract.recordExists(submissionId);
    if (exists) {
      return res.status(400).json({ error: "Record already exists on-chain" });
    }

    const lat = Math.round(latitude * 1000000);
    const lng = Math.round(longitude * 1000000);

    const tx = await contract.storeRecord(
      submissionId,
      userId,
      lat,
      lng,
      timestamp,
      credits,
      imageHash
    );

    res.json({ 
      success: true, 
      txHash: tx.hash,
      status: "pending"
    });

  } catch (error: any) {
    console.error("Blockchain error:", error);
    res.status(500).json({ 
      error: "Blockchain transaction failed", 
      details: error.message 
    });
  }
});

// API Route for Razorpay Payouts
app.post("/api/payouts/create", async (req, res) => {
  try {
    const { withdrawalId, userId, amountINR, bankDetails } = req.body;

    if (!withdrawalId || !userId || !amountINR || !bankDetails) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!rzp) {
      // Mock payout for demo
      console.warn("Razorpay keys missing, returning mock success for demo");
      return res.json({
        success: true,
        payoutId: "pout_" + Math.random().toString(36).slice(2, 11),
        status: "processed",
        mode: "mock"
      });
    }

    // In a real Razorpay X implementation, you would:
    // 1. Create a Contact
    // 2. Create a Fund Account
    // 3. Create a Payout

    // This is a simplified version of the Payout API call
    // Note: Razorpay X Payouts require a different set of APIs than standard Razorpay
    // For this demo, we'll simulate the response structure
    
    const payout = await (rzp as any).payouts.create({
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      amount: amountINR * 100, // amount in paise
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      fund_account: {
        account_type: "bank_account",
        bank_account: {
          name: bankDetails.accountHolderName,
          ifsc: bankDetails.ifsc,
          account_number: bankDetails.accountNumber,
        },
        contact: {
          name: bankDetails.accountHolderName,
          type: "customer",
        },
      },
      queue_if_low_balance: true,
      reference_id: withdrawalId,
    });

    res.json({
      success: true,
      payoutId: payout.id,
      status: payout.status,
    });

  } catch (error: any) {
    console.error("Payout error:", error);
    res.status(500).json({
      error: "Payout processing failed",
      details: error.message
    });
  }
});

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 20; port += 1) {
    const isFree = await new Promise<boolean>((resolve) => {
      const tester = net.createServer();

      tester.once("error", (err: NodeJS.ErrnoException) => {
        resolve(err.code !== "EADDRINUSE");
      });

      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });

      tester.listen(port, "0.0.0.0");
    });

    if (isFree) {
      return port;
    }
  }

  throw new Error(`No available ports found starting from ${startPort}`);
}

// Vite middleware for development
async function startServer() {
  const selectedPort = await findAvailablePort(PORT);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(selectedPort, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${selectedPort}`);
  });
}

startServer();
