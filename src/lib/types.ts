export type UserRole = "seller" | "client";

export interface FormData {
  // Step 1: Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  postalCode: string;

  // Step 2: Insurance Plan
  planType: "basic" | "standard" | "premium" | "";
  coverageStart: string;
  paymentFrequency: "monthly" | "quarterly" | "annual" | "";

  // Step 3: Health & Beneficiaries
  smoker: boolean | null;
  preExistingConditions: string;
  beneficiaryName: string;
  beneficiaryRelationship: string;

  // Step 4: Documents & Consent
  idUploaded: boolean;
  termsAccepted: boolean;
  dataConsentAccepted: boolean;
  electronicSignature: string;
}

export interface FieldActivity {
  field: string;
  user: UserRole;
  timestamp: number;
}

export interface CollaboratorPresence {
  role: UserRole;
  name: string;
  avatar: string;
  isOnline: boolean;
  currentField: string | null;
  lastSeen: number;
}

export interface ChatMessage {
  id: string;
  sender: UserRole;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
}

export const PLAN_DETAILS = {
  basic: {
    name: "Essential",
    price: { monthly: 29.90, quarterly: 84.90, annual: 319.00 },
    features: ["Hospital coverage", "GP visits (70%)", "Basic dental", "Emergency care"],
    color: "primary",
  },
  standard: {
    name: "Comfort",
    price: { monthly: 54.90, quarterly: 155.90, annual: 589.00 },
    features: ["Full hospital", "Specialist visits (90%)", "Dental & optical", "Mental health", "Physiotherapy"],
    color: "accent",
    popular: true,
  },
  premium: {
    name: "Premium",
    price: { monthly: 89.90, quarterly: 254.90, annual: 959.00 },
    features: ["Private hospital room", "100% coverage", "Full dental & optical", "Global coverage", "Wellness programs", "24/7 teleconsultation"],
    color: "warm",
  },
} as const;

export const INITIAL_FORM_DATA: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  address: "",
  city: "",
  postalCode: "",
  planType: "",
  coverageStart: "",
  paymentFrequency: "",
  smoker: null,
  preExistingConditions: "",
  beneficiaryName: "",
  beneficiaryRelationship: "",
  idUploaded: false,
  termsAccepted: false,
  dataConsentAccepted: false,
  electronicSignature: "",
};

export const STEPS = [
  { id: 1, title: "Personal Info", icon: "user" },
  { id: 2, title: "Insurance Plan", icon: "shield" },
  { id: 3, title: "Health Info", icon: "heart" },
  { id: 4, title: "Finalize", icon: "check" },
] as const;
