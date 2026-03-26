"use client";
import { useState, useEffect, useCallback } from "react";
import { FormData, UserRole, CollaboratorPresence, PLAN_DETAILS } from "@/lib/types";
import { calculatePremium } from "@/lib/fake-api";
import { CheckIcon, SparklesIcon, LoadingSpinner } from "../Icons";
import CollabField from "../CollabField";

interface InsurancePlanStepProps {
  formData: FormData;
  updateField: (field: keyof FormData, value: FormData[keyof FormData]) => void;
  focusField: (field: string) => void;
  blurField: () => void;
  role: UserRole;
  otherUser?: CollaboratorPresence;
  recentActivity: Map<string, { user: UserRole; timestamp: number }>;
}

export default function InsurancePlanStep({
  formData,
  updateField,
  focusField,
  blurField,
  role,
  otherUser,
  recentActivity,
}: InsurancePlanStepProps) {
  const [premium, setPremium] = useState<number | null>(null);
  const [discount, setDiscount] = useState<string | undefined>();
  const [calculating, setCalculating] = useState(false);

  const recalculate = useCallback(async () => {
    if (formData.planType && formData.paymentFrequency) {
      setCalculating(true);
      const result = await calculatePremium(
        formData.planType,
        formData.paymentFrequency,
        formData.smoker,
        formData.dateOfBirth
      );
      setPremium(result.premium);
      setDiscount(result.discount);
      setCalculating(false);
    }
  }, [formData.planType, formData.paymentFrequency, formData.smoker, formData.dateOfBirth]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  const planEntries = Object.entries(PLAN_DETAILS) as [keyof typeof PLAN_DETAILS, (typeof PLAN_DETAILS)[keyof typeof PLAN_DETAILS]][];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Choisissez votre formule</h2>
        <p className="text-sm text-gray-500 mt-1">Sélectionnez la couverture qui correspond à vos besoins</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {planEntries.map(([key, plan]) => {
          const isSelected = formData.planType === key;
          const isOtherUserSelecting = otherUser?.currentField === "planType";
          const freq = (formData.paymentFrequency || "monthly") as keyof typeof plan.price;
          const price = plan.price[freq];

          return (
            <button
              key={key}
              onClick={() => {
                updateField("planType", key);
                focusField("planType");
                setTimeout(blurField, 500);
              }}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 hover:shadow-md ${
                isSelected
                  ? "border-primary-500 bg-primary-50/50 shadow-md shadow-primary-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {"popular" in plan && plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" /> Le plus populaire
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
                {isSelected && (
                  <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>

              <div className="mb-4">
                <span className="text-2xl font-bold text-gray-900">{price.toFixed(2)}€</span>
                <span className="text-sm text-gray-500">/{freq === "monthly" ? "mois" : freq === "quarterly" ? "trim." : "an"}</span>
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-gray-600">
                    <CheckIcon className="w-3.5 h-3.5 text-accent-500 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isOtherUserSelecting && !isSelected && (
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-accent-300 pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <CollabField
          label="Fréquence de paiement"
          name="paymentFrequency"
          value={formData.paymentFrequency}
          onChange={(v) => updateField("paymentFrequency", v)}
          onFocus={focusField}
          onBlur={blurField}
          as="select"
          options={[
            { value: "monthly", label: "Mensuel" },
            { value: "quarterly", label: "Trimestriel (économisez 5%)" },
            { value: "annual", label: "Annuel (2 mois offerts)" },
          ]}
          placeholder="Choisir la fréquence..."
          required
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("paymentFrequency")}
        />
        <CollabField
          label="Date de début de couverture"
          name="coverageStart"
          type="date"
          value={formData.coverageStart}
          onChange={(v) => updateField("coverageStart", v)}
          onFocus={focusField}
          onBlur={blurField}
          required
          role={role}
          otherUser={otherUser}
          recentActivity={recentActivity.get("coverageStart")}
          hint="La couverture débute à cette date"
        />
      </div>

      {formData.planType && formData.paymentFrequency && (
        <div className="bg-gradient-to-br from-gray-50 to-primary-50/30 rounded-2xl p-5 border border-gray-200 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Prime estimée</p>
              {discount && (
                <p className="text-xs text-accent-600 mt-0.5 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" /> {discount}
                </p>
              )}
            </div>
            {calculating ? (
              <div className="flex items-center gap-2 text-gray-400">
                <LoadingSpinner className="w-5 h-5" />
                <span className="text-sm">Calcul en cours...</span>
              </div>
            ) : (
              premium !== null && (
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">
                    {premium.toFixed(2)}
                    <span className="text-lg text-gray-500">€</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    par {formData.paymentFrequency === "monthly" ? "mois" : formData.paymentFrequency === "quarterly" ? "trimestre" : "an"}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
