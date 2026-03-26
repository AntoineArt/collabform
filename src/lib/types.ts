export type UserRole = "seller" | "client";

export interface FormData {
  // Etape 1 : Informations personnelles
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  postalCode: string;

  // Etape 2 : Formule d'assurance
  planType: "basic" | "standard" | "premium" | "";
  coverageStart: string;
  paymentFrequency: "monthly" | "quarterly" | "annual" | "";

  // Etape 3 : Santé & Bénéficiaires
  smoker: boolean | null;
  preExistingConditions: string;
  beneficiaryName: string;
  beneficiaryRelationship: string;

  // Etape 4 : Documents & Consentement
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

export interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface CollaboratorPresence {
  role: UserRole;
  name: string;
  avatar: string;
  isOnline: boolean;
  currentField: string | null;
  lastSeen: number;
  cursor: CursorPosition | null;
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
    name: "Essentiel",
    price: { monthly: 29.90, quarterly: 84.90, annual: 319.00 },
    features: ["Hospitalisation", "Consultations généraliste (70%)", "Soins dentaires de base", "Urgences"],
    color: "primary",
  },
  standard: {
    name: "Confort",
    price: { monthly: 54.90, quarterly: 155.90, annual: 589.00 },
    features: ["Hospitalisation complète", "Spécialistes (90%)", "Dentaire & optique", "Santé mentale", "Kinésithérapie"],
    color: "accent",
    popular: true,
  },
  premium: {
    name: "Premium",
    price: { monthly: 89.90, quarterly: 254.90, annual: 959.00 },
    features: ["Chambre privée", "Remboursement 100%", "Dentaire & optique complets", "Couverture mondiale", "Programmes bien-être", "Téléconsultation 24/7"],
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
  { id: 1, title: "Infos personnelles", icon: "user" },
  { id: 2, title: "Formule", icon: "shield" },
  { id: 3, title: "Santé", icon: "heart" },
  { id: 4, title: "Finalisation", icon: "check" },
] as const;
