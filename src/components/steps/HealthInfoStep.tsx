"use client";
import { FormData, UserRole, CollaboratorPresence } from "@/lib/types";
import CollabField from "../CollabField";

interface HealthInfoStepProps {
  formData: FormData;
  updateField: (field: keyof FormData, value: FormData[keyof FormData]) => void;
  focusField: (field: string) => void;
  blurField: () => void;
  role: UserRole;
  otherUser?: CollaboratorPresence;
  recentActivity: Map<string, { user: UserRole; timestamp: number }>;
}

export default function HealthInfoStep({
  formData,
  updateField,
  focusField,
  blurField,
  role,
  otherUser,
  recentActivity,
}: HealthInfoStepProps) {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Health & Beneficiary</h2>
        <p className="text-sm text-gray-500 mt-1">Help us personalize your coverage</p>
      </div>

      {/* Smoker Toggle */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Do you smoke? <span className="text-danger-500">*</span>
        </label>
        <div className="flex gap-3">
          {[
            { label: "No, I don't smoke", value: false },
            { label: "Yes, I smoke", value: true },
          ].map((option) => (
            <button
              key={String(option.value)}
              onClick={() => {
                updateField("smoker", option.value);
                focusField("smoker");
                setTimeout(blurField, 300);
              }}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                formData.smoker === option.value
                  ? option.value
                    ? "border-warm-400 bg-warm-50 text-warm-700"
                    : "border-accent-400 bg-accent-50 text-accent-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="mr-2">{option.value ? "🚬" : "🚭"}</span>
              {option.label}
            </button>
          ))}
        </div>
        {formData.smoker === true && (
          <p className="mt-2 text-xs text-warm-600 bg-warm-50 px-3 py-2 rounded-lg animate-fade-in">
            Note: Smoking may affect your premium by up to 15%. Consider our wellness program to help you quit!
          </p>
        )}
      </div>

      <div className="space-y-5">
        <CollabField
          label="Pre-existing Conditions"
          name="preExistingConditions"
          value={formData.preExistingConditions}
          onChange={(v) => updateField("preExistingConditions", v)}
          onFocus={focusField}
          onBlur={blurField}
          as="textarea"
          placeholder="Please describe any pre-existing medical conditions, ongoing treatments, or medications..."
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("preExistingConditions")}
          hint="This information is kept strictly confidential"
        />

        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Beneficiary Information</h3>
          <p className="text-xs text-gray-500 mb-4">Person who will receive benefits in case of a claim</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CollabField
              label="Beneficiary Full Name"
              name="beneficiaryName"
              value={formData.beneficiaryName}
              onChange={(v) => updateField("beneficiaryName", v)}
              onFocus={focusField}
              onBlur={blurField}
              placeholder="Jane Doe"
              role={role}
              otherUser={otherUser}
              recentActivity={recentActivity.get("beneficiaryName")}
            />
            <CollabField
              label="Relationship"
              name="beneficiaryRelationship"
              value={formData.beneficiaryRelationship}
              onChange={(v) => updateField("beneficiaryRelationship", v)}
              onFocus={focusField}
              onBlur={blurField}
              as="select"
              options={[
                { value: "spouse", label: "Spouse / Partner" },
                { value: "child", label: "Child" },
                { value: "parent", label: "Parent" },
                { value: "sibling", label: "Sibling" },
                { value: "other", label: "Other" },
              ]}
              placeholder="Select relationship..."
              role={role}
              otherUser={otherUser}
              recentActivity={recentActivity.get("beneficiaryRelationship")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
