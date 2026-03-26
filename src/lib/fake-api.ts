import { FormData } from "./types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function validateEmail(email: string): Promise<{ valid: boolean; message?: string }> {
  await delay(randomBetween(600, 1200));
  if (!email.includes("@")) {
    return { valid: false, message: "Please enter a valid email address" };
  }
  if (email.endsWith("@test.com")) {
    return { valid: false, message: "This email domain is not accepted" };
  }
  return { valid: true };
}

export async function validatePhone(phone: string): Promise<{ valid: boolean; message?: string }> {
  await delay(randomBetween(400, 800));
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.length < 10) {
    return { valid: false, message: "Phone number must be at least 10 digits" };
  }
  return { valid: true };
}

export async function checkEligibility(dateOfBirth: string): Promise<{ eligible: boolean; message?: string }> {
  await delay(randomBetween(800, 1500));
  if (!dateOfBirth) return { eligible: false, message: "Date of birth is required" };
  const age = Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 18) return { eligible: false, message: "You must be at least 18 years old to subscribe" };
  if (age > 85) return { eligible: false, message: "We currently don't offer new policies for applicants over 85" };
  return { eligible: true };
}

export async function calculatePremium(
  planType: string,
  paymentFrequency: string,
  smoker: boolean | null,
  dateOfBirth: string
): Promise<{ premium: number; discount?: string }> {
  await delay(randomBetween(1000, 2000));
  const basePrices: Record<string, Record<string, number>> = {
    basic: { monthly: 29.90, quarterly: 84.90, annual: 319.00 },
    standard: { monthly: 54.90, quarterly: 155.90, annual: 589.00 },
    premium: { monthly: 89.90, quarterly: 254.90, annual: 959.00 },
  };

  let premium = basePrices[planType]?.[paymentFrequency] || 0;
  let discount: string | undefined;

  if (smoker) {
    premium *= 1.15;
  }

  if (dateOfBirth) {
    const age = Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 30) {
      premium *= 0.9;
      discount = "10% youth discount applied";
    } else if (age > 60) {
      premium *= 1.2;
    }
  }

  if (paymentFrequency === "annual") {
    discount = (discount ? discount + " + " : "") + "Annual payment: 2 months free";
  }

  return { premium: Math.round(premium * 100) / 100, discount };
}

export async function uploadDocument(fileName: string): Promise<{ success: boolean; documentId?: string; error?: string }> {
  await delay(randomBetween(1500, 3000));
  if (Math.random() < 0.1) {
    return { success: false, error: "Upload failed. Please try again." };
  }
  return {
    success: true,
    documentId: `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  };
}

export async function submitApplication(formData: FormData): Promise<{
  success: boolean;
  applicationId?: string;
  error?: string;
}> {
  await delay(randomBetween(2000, 4000));

  if (Math.random() < 0.05) {
    return {
      success: false,
      error: "Our servers are experiencing high traffic. Please try again in a few moments.",
    };
  }

  return {
    success: true,
    applicationId: `INS-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  };
}

export async function saveProgress(formData: FormData, step: number): Promise<{ saved: boolean }> {
  await delay(randomBetween(300, 600));
  return { saved: true };
}
