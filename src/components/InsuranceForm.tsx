"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { UserRole } from "@/lib/types";
import { submitApplication, saveProgress } from "@/lib/fake-api";
import { useCollaboration } from "@/hooks/useCollaboration";
import StepIndicator from "./StepIndicator";
import PresenceBar from "./PresenceBar";
import ChatPanel from "./ChatPanel";
import ToastContainer from "./ToastContainer";
import PersonalInfoStep from "./steps/PersonalInfoStep";
import InsurancePlanStep from "./steps/InsurancePlanStep";
import HealthInfoStep from "./steps/HealthInfoStep";
import FinalizeStep from "./steps/FinalizeStep";
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon, LoadingSpinner, ShieldIcon } from "./Icons";

interface InsuranceFormProps {
  role: UserRole;
  sessionId: string;
}

export default function InsuranceForm({ role, sessionId }: InsuranceFormProps) {
  const {
    formData,
    updateField,
    focusField,
    blurField,
    presence,
    otherUser,
    chatMessages,
    sendMessage,
    recentActivity,
    toasts,
    addToast,
    removeToast,
    navigateStep,
    remoteStep,
  } = useCollaboration(role);

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync step when the other user navigates
  useEffect(() => {
    if (remoteStep !== null && remoteStep !== currentStep) {
      // Mark intermediate steps as completed
      if (remoteStep > currentStep) {
        setCompletedSteps((prev) => {
          const next = new Set(prev);
          for (let i = currentStep; i < remoteStep; i++) next.add(i);
          return next;
        });
      }
      setCurrentStep(remoteStep);
      addToast({
        type: "info",
        title: "Navigation synchronisée",
        message: `${otherUser?.name || "L'autre participant"} a changé d'étape`,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteStep]);

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSaving(true);
      await saveProgress(formData, currentStep);
      setSaving(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, currentStep]);

  // Toast when other user comes online
  const otherWasOnlineRef = useRef(false);
  useEffect(() => {
    const isOnline = otherUser?.isOnline ?? false;
    if (isOnline && !otherWasOnlineRef.current) {
      addToast({
        type: "info",
        title: role === "client" ? "Conseiller connecté" : "Client connecté",
        message: `${otherUser?.name} a rejoint la session`,
      });
    }
    otherWasOnlineRef.current = isOnline;
  }, [otherUser?.isOnline, otherUser?.name, role, addToast]);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email && formData.phone && formData.dateOfBirth);
      case 2:
        return !!(formData.planType && formData.paymentFrequency && formData.coverageStart);
      case 3:
        return formData.smoker !== null;
      case 4:
        return !!(formData.idUploaded && formData.termsAccepted && formData.dataConsentAccepted && formData.electronicSignature);
      default:
        return false;
    }
  }, [currentStep, formData]);

  const handleNext = useCallback(() => {
    if (currentStep < 4) {
      const nextStep = currentStep + 1;
      setCompletedSteps((prev) => new Set(prev).add(currentStep));
      setCurrentStep(nextStep);
      navigateStep(nextStep);
      addToast({
        type: "success",
        title: "Étape validée",
        message: `Étape ${currentStep} enregistrée avec succès`,
      });
    }
  }, [currentStep, addToast, navigateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      navigateStep(prevStep);
    }
  }, [currentStep, navigateStep]);

  const handleSubmit = useCallback(async () => {
    if (!canProceed()) {
      addToast({
        type: "warning",
        title: "Formulaire incomplet",
        message: "Veuillez remplir tous les champs obligatoires avant de soumettre",
      });
      return;
    }

    setSubmitting(true);
    addToast({
      type: "info",
      title: "Envoi en cours",
      message: "Veuillez patienter pendant le traitement de votre dossier...",
    });

    const result = await submitApplication(formData);

    if (result.success) {
      setSubmitted(true);
      setApplicationId(result.applicationId!);
      setCompletedSteps(new Set([1, 2, 3, 4]));
    } else {
      addToast({
        type: "error",
        title: "Échec de l'envoi",
        message: result.error || "Une erreur est survenue. Veuillez réessayer.",
      });
    }
    setSubmitting(false);
  }, [formData, canProceed, addToast]);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PresenceBar presence={presence} currentRole={role} sessionId={sessionId} />
        <div className="max-w-2xl mx-auto px-4 py-20">
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-accent-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-accent-600" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
                <path className="animate-check-mark" strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dossier envoyé !</h1>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Votre demande d&apos;assurance a été reçue et est en cours de traitement. Vous recevrez un email de confirmation sous peu.
            </p>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 text-left max-w-sm mx-auto">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">N° de dossier</p>
                  <p className="font-mono font-bold text-primary-700">{applicationId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Souscripteur</p>
                  <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Formule</p>
                  <p className="font-medium capitalize">{formData.planType} — {formData.paymentFrequency === "monthly" ? "mensuel" : formData.paymentFrequency === "quarterly" ? "trimestriel" : "annuel"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Statut</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-warm-100 text-warm-700 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-warm-500 rounded-full animate-pulse" />
                    En cours d&apos;examen
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setCurrentStep(1);
                setCompletedSteps(new Set());
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2"
            >
              Démarrer un nouveau dossier
            </button>
          </div>
        </div>
        <ChatPanel messages={chatMessages} onSendMessage={sendMessage} role={role} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PresenceBar presence={presence} currentRole={role} sessionId={sessionId} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-1.5 rounded-full text-xs font-medium mb-4">
            <ShieldIcon className="w-3.5 h-3.5" />
            {role === "seller" ? "Vue conseiller — Assistance au client" : "Session collaborative — Votre conseiller vous accompagne"}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Souscription d&apos;assurance</h1>
          <p className="text-sm text-gray-500 mt-2">
            {role === "seller"
              ? "Guidez votre client dans le processus de souscription"
              : "Complétez votre dossier d'assurance avec l'aide de votre conseiller en temps réel"}
          </p>
        </div>

        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-6">
          {currentStep === 1 && (
            <PersonalInfoStep
              formData={formData}
              updateField={updateField}
              focusField={focusField}
              blurField={blurField}
              role={role}
              otherUser={otherUser}
              recentActivity={recentActivity}
            />
          )}
          {currentStep === 2 && (
            <InsurancePlanStep
              formData={formData}
              updateField={updateField}
              focusField={focusField}
              blurField={blurField}
              role={role}
              otherUser={otherUser}
              recentActivity={recentActivity}
            />
          )}
          {currentStep === 3 && (
            <HealthInfoStep
              formData={formData}
              updateField={updateField}
              focusField={focusField}
              blurField={blurField}
              role={role}
              otherUser={otherUser}
              recentActivity={recentActivity}
            />
          )}
          {currentStep === 4 && (
            <FinalizeStep
              formData={formData}
              updateField={updateField}
              focusField={focusField}
              blurField={blurField}
              role={role}
              otherUser={otherUser}
              recentActivity={recentActivity}
              addToast={addToast}
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Retour
          </button>

          <div className="flex items-center gap-3">
            {saving && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 animate-fade-in">
                <LoadingSpinner className="w-3 h-3" />
                Sauvegarde...
              </span>
            )}

            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 shadow-sm shadow-primary-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Continuer
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                className="flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl hover:from-accent-600 hover:to-accent-700 shadow-md shadow-accent-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner className="w-4 h-4" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Envoyer le dossier
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <ChatPanel messages={chatMessages} onSendMessage={sendMessage} role={role} />
    </div>
  );
}
