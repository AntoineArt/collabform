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
        <h2 className="text-xl font-bold text-gray-900">Santé & Bénéficiaire</h2>
        <p className="text-sm text-gray-500 mt-1">Aidez-nous à personnaliser votre couverture</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Êtes-vous fumeur ? <span className="text-danger-500">*</span>
        </label>
        <div className="flex gap-3">
          {[
            { label: "Non, je ne fume pas", value: false },
            { label: "Oui, je fume", value: true },
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
            Note : Le tabagisme peut augmenter votre prime jusqu&apos;à 15%. Découvrez notre programme d&apos;aide au sevrage !
          </p>
        )}
      </div>

      <div className="space-y-5">
        <CollabField
          label="Antécédents médicaux"
          name="preExistingConditions"
          value={formData.preExistingConditions}
          onChange={(v) => updateField("preExistingConditions", v)}
          onFocus={focusField}
          onBlur={blurField}
          as="textarea"
          placeholder="Décrivez vos éventuels antécédents médicaux, traitements en cours ou médicaments..."
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("preExistingConditions")}
          hint="Ces informations sont strictement confidentielles"
        />

        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Informations du bénéficiaire</h3>
          <p className="text-xs text-gray-500 mb-4">Personne qui recevra les prestations en cas de sinistre</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CollabField
              label="Nom complet du bénéficiaire"
              name="beneficiaryName"
              value={formData.beneficiaryName}
              onChange={(v) => updateField("beneficiaryName", v)}
              onFocus={focusField}
              onBlur={blurField}
              placeholder="Marie Martin"
              role={role}
              otherUser={otherUser}
              recentActivity={recentActivity.get("beneficiaryName")}
            />
            <CollabField
              label="Lien de parenté"
              name="beneficiaryRelationship"
              value={formData.beneficiaryRelationship}
              onChange={(v) => updateField("beneficiaryRelationship", v)}
              onFocus={focusField}
              onBlur={blurField}
              as="select"
              options={[
                { value: "spouse", label: "Conjoint(e) / Partenaire" },
                { value: "child", label: "Enfant" },
                { value: "parent", label: "Parent" },
                { value: "sibling", label: "Frère / Sœur" },
                { value: "other", label: "Autre" },
              ]}
              placeholder="Sélectionner le lien..."
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
