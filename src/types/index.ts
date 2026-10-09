export type UserRole = 'user' | 'official' | 'government';

export interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  totalCredits: number;
  restorationsCount?: number;
  bankDetails?: BankDetails;
  createdAt: string;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type RestorationType = 'mangrove' | 'seagrass' | 'wetland' | 'cleanup';

export interface Submission {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  imageUrl: string;
  description: string;
  type: RestorationType;
  latitude: number;
  longitude: number;
  date: string;
  status: SubmissionStatus;
  creditsAssigned: number;
  createdAt: string;
  blockchainTxHash?: string;
  blockchainVerified?: boolean;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface Withdrawal {
  id: string;
  userId: string;
  userName: string;
  creditsRequested: number;
  amountINR: number;
  status: WithdrawalStatus;
  bankDetails: BankDetails;
  payoutId?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: RestorationType;
  participants: string[];
  creditsReward: number;
  imageUrl: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'withdrawal';
  referenceId: string;
  description: string;
  createdAt: string;
}
