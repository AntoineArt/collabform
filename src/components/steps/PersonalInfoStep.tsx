"use client";
import { useState, useCallback } from "react";
import { FormData, UserRole, CollaboratorPresence } from "@/lib/types";
import { validateEmail, validatePhone, checkEligibility } from "@/lib/fake-api";
import CollabField from "../CollabField";

interface PersonalInfoStepProps {
  formData: FormData;
  updateField: (field: keyof FormData, value: FormData[keyof FormData]) => void;
  focusField: (field: string) => void;
  blurField: () => void;
  role: UserRole;
  otherUser?: CollaboratorPresence;
  recentActivity: Map<string, { user: UserRole; timestamp: number }>;
}

export default function PersonalInfoStep({
  formData,
  updateField,
  focusField,
  blurField,
  role,
  otherUser,
  recentActivity,
}: PersonalInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [validated, setValidated] = useState<Record<string, boolean>>({});

  const validateEmailField = useCallback(
    async (email: string) => {
      if (!email) return;
      setValidating((v) => ({ ...v, email: true }));
      const result = await validateEmail(email);
      setValidating((v) => ({ ...v, email: false }));
      if (!result.valid) {
        setErrors((e) => ({ ...e, email: result.message || "Invalid email" }));
        setValidated((v) => ({ ...v, email: false }));
      } else {
        setErrors((e) => ({ ...e, email: "" }));
        setValidated((v) => ({ ...v, email: true }));
      }
    },
    []
  );

  const validatePhoneField = useCallback(
    async (phone: string) => {
      if (!phone) return;
      setValidating((v) => ({ ...v, phone: true }));
      const result = await validatePhone(phone);
      setValidating((v) => ({ ...v, phone: false }));
      if (!result.valid) {
        setErrors((e) => ({ ...e, phone: result.message || "Invalid phone" }));
        setValidated((v) => ({ ...v, phone: false }));
      } else {
        setErrors((e) => ({ ...e, phone: "" }));
        setValidated((v) => ({ ...v, phone: true }));
      }
    },
    []
  );

  const validateDOB = useCallback(
    async (dob: string) => {
      if (!dob) return;
      setValidating((v) => ({ ...v, dateOfBirth: true }));
      const result = await checkEligibility(dob);
      setValidating((v) => ({ ...v, dateOfBirth: false }));
      if (!result.eligible) {
        setErrors((e) => ({ ...e, dateOfBirth: result.message || "Not eligible" }));
        setValidated((v) => ({ ...v, dateOfBirth: false }));
      } else {
        setErrors((e) => ({ ...e, dateOfBirth: "" }));
        setValidated((v) => ({ ...v, dateOfBirth: true }));
      }
    },
    []
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
        <p className="text-sm text-gray-500 mt-1">Let&apos;s start with your basic details</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <CollabField
          label="First Name"
          name="firstName"
          value={formData.firstName}
          onChange={(v) => updateField("firstName", v)}
          onFocus={focusField}
          onBlur={blurField}
          placeholder="John"
          required
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("firstName")}
        />
        <CollabField
          label="Last Name"
          name="lastName"
          value={formData.lastName}
          onChange={(v) => updateField("lastName", v)}
          onFocus={focusField}
          onBlur={blurField}
          placeholder="Doe"
          required
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("lastName")}
        />
        <CollabField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={(v) => {
            updateField("email", v);
            setErrors((e) => ({ ...e, email: "" }));
            setValidated((ve) => ({ ...ve, email: false }));
          }}
          onFocus={focusField}
          onBlur={() => {
            blurField();
            validateEmailField(formData.email);
          }}
          placeholder="john.doe@example.com"
          required
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("email")}
          error={errors.email}
          validating={validating.email}
          validated={validated.email}
        />
        <CollabField
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={(v) => {
            updateField("phone", v);
            setErrors((e) => ({ ...e, phone: "" }));
            setValidated((ve) => ({ ...ve, phone: false }));
          }}
          onFocus={focusField}
          onBlur={() => {
            blurField();
            validatePhoneField(formData.phone);
          }}
          placeholder="+33 6 12 34 56 78"
          required
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("phone")}
          error={errors.phone}
          validating={validating.phone}
          validated={validated.phone}
          hint="Include country code"
        />
        <CollabField
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={(v) => {
            updateField("dateOfBirth", v);
            setErrors((e) => ({ ...e, dateOfBirth: "" }));
            setValidated((ve) => ({ ...ve, dateOfBirth: false }));
            validateDOB(v);
          }}
          onFocus={focusField}
          onBlur={blurField}
          required
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("dateOfBirth")}
          error={errors.dateOfBirth}
          validating={validating.dateOfBirth}
          validated={validated.dateOfBirth}
          hint="Must be 18-85 years old"
        />
        <div className="sm:col-span-2">
          <CollabField
            label="Address"
            name="address"
            value={formData.address}
            onChange={(v) => updateField("address", v)}
            onFocus={focusField}
            onBlur={blurField}
            placeholder="123 Rue de la Paix"
            required
            role={role}
            otherUser={otherUser}
            recentActivity={recentActivity.get("address")}
          />
        </div>
        <CollabField
          label="City"
          name="city"
          value={formData.city}
          onChange={(v) => updateField("city", v)}
          onFocus={focusField}
          onBlur={blurField}
          placeholder="Paris"
          required
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("city")}
        />
        <CollabField
          label="Postal Code"
          name="postalCode"
          value={formData.postalCode}
          onChange={(v) => updateField("postalCode", v)}
          onFocus={focusField}
          onBlur={blurField}
          placeholder="75001"
          required
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("postalCode")}
        />
      </div>
    </div>
  );
}
