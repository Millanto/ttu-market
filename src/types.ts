export interface User {
  name: string;
  phone: string;
  email?: string;
  department: string;
  year: string;
  profileImage: string;
  isVerified: boolean;
  studentIdImage?: string;
  earnedGHS: number;
  completedJobsCount: number;
  role?: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  priceType: 'fixed' | 'hourly' | 'item';
  rating: number;
  reviewsCount: number;
  sellerName: string;
  sellerDept: string;
  sellerImage: string;
  imageUrl: string;
  urgent: boolean;
  timestamp: string;
}

export interface UrgentNeed {
  id: string;
  title: string;
  description: string;
  budget: number;
  timeLeftText: string;
  timestamp: string;
  posterName: string;
  posterDept: string;
  posterImage: string;
  accepted: boolean;
  acceptedBy: string | null;
}

export interface Order {
  id: string;
  title: string;
  price: number;
  priceType: 'fixed' | 'hourly' | 'item';
  sellerName: string;
  buyerName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'delivered';
  timestamp: string;
  imageUrl: string;
  serviceId?: string;
  urgentNeedId?: string;
  disputed?: boolean;
  dispute_reason?: string;
  deliverable_url?: string;
  deliverable_filename?: string;
  escrowStatus?: string;
  paystackReference?: string;
}

export interface TopEarner {
  rank: number;
  name: string;
  department: string;
  amount: number;
  avatarUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}
