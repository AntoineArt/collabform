"use client";
import { useState, useCallback } from "react";
import { FormData, UserRole, CollaboratorPresence, PLAN_DETAILS } from "@/lib/types";
import { uploadDocument } from "@/lib/fake-api";
import { CloudUploadIcon, CheckIcon, DocumentIcon, LoadingSpinner } from "../Icons";
import CollabField from "../CollabField";

interface FinalizeStepProps {
  formData: FormData;
  updateField: (field: keyof FormData, value: FormData[keyof FormData]) => void;
  focusField: (field: string) => void;
  blurField: () => void;
  role: UserRole;
  otherUser?: CollaboratorPresence;
  recentActivity: Map<string, { user: UserRole; timestamp: number }>;
  addToast: (toast: { type: "success" | "error" | "warning" | "info"; title: string; message: string }) => void;
}

export default function FinalizeStep({
  formData,
  updateField,
  focusField,
  blurField,
  role,
  otherUser,
  recentActivity,
  addToast,
}: FinalizeStepProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<string | null>(null);

  const handleUpload = useCallback(async () => {
    setUploading(true);
    focusField("idUploaded");
    const result = await uploadDocument("piece_identite.pdf");
    setUploading(false);
    blurField();

    if (result.success) {
      updateField("idUploaded", true);
      setUploadedDoc(result.documentId!);
      addToast({
        type: "success",
        title: "Document envoyé",
        message: `Votre pièce d'identité a été téléchargée (${result.documentId})`,
      });
    } else {
      addToast({
        type: "error",
        title: "Échec de l'envoi",
        message: result.error || "Veuillez réessayer",
      });
    }
  }, [updateField, focusField, blurField, addToast]);

  const selectedPlan = formData.planType ? PLAN_DETAILS[formData.planType as keyof typeof PLAN_DETAILS] : null;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Vérification & Signature</h2>
        <p className="text-sm text-gray-500 mt-1">C&apos;est presque fini ! Vérifiez vos informations et signez</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-5 py-3">
          <h3 className="text-sm font-semibold text-white">Récapitulatif du dossier</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Souscripteur</p>
              <p className="font-medium text-gray-900">{formData.firstName} {formData.lastName || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Email</p>
              <p className="font-medium text-gray-900">{formData.email || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Formule</p>
              <p className="font-medium text-gray-900">{selectedPlan?.name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Paiement</p>
              <p className="font-medium text-gray-900 capitalize">
                {formData.paymentFrequency === "monthly" ? "Mensuel" : formData.paymentFrequency === "quarterly" ? "Trimestriel" : formData.paymentFrequency === "annual" ? "Annuel" : "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Début de couverture</p>
              <p className="font-medium text-gray-900">{formData.coverageStart || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Bénéficiaire</p>
              <p className="font-medium text-gray-900">{formData.beneficiaryName || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pièce d&apos;identité <span className="text-danger-500">*</span>
        </label>
        {formData.idUploaded ? (
          <div className="flex items-center gap-3 bg-accent-50 border border-accent-200 rounded-xl px-4 py-3 animate-fade-in">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <DocumentIcon className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-accent-900">Document envoyé</p>
              <p className="text-xs text-accent-600">{uploadedDoc}</p>
            </div>
            <CheckIcon className="w-5 h-5 text-accent-500 ml-auto" />
          </div>
        ) : (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl px-6 py-8 text-center hover:border-primary-400 hover:bg-primary-50/50 transition-all group disabled:opacity-60"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner className="w-8 h-8 text-primary-500" />
                <p className="text-sm text-gray-500">Envoi du document...</p>
                <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full animate-shimmer" style={{ width: "60%" }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <CloudUploadIcon className="w-8 h-8 text-gray-400 group-hover:text-primary-500 transition-colors" />
                <p className="text-sm font-medium text-gray-600 group-hover:text-primary-700">
                  Cliquez pour envoyer votre pièce d&apos;identité
                </p>
                <p className="text-xs text-gray-400">Passeport, permis de conduire ou carte d&apos;identité</p>
              </div>
            )}
          </button>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={(e) => updateField("termsAccepted", e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded-md border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
          <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
            J&apos;ai lu et j&apos;accepte les{" "}
            <span className="text-primary-600 underline underline-offset-2">Conditions Générales</span>{" "}
            et la{" "}
            <span className="text-primary-600 underline underline-offset-2">Police d&apos;Assurance</span>
            <span className="text-danger-500 ml-0.5">*</span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.dataConsentAccepted}
            onChange={(e) => updateField("dataConsentAccepted", e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded-md border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
          <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
            Je consens au traitement de mes données personnelles conformément à la{" "}
            <span className="text-primary-600 underline underline-offset-2">Politique de Confidentialité</span> (RGPD)
            <span className="text-danger-500 ml-0.5">*</span>
          </span>
        </label>
      </div>

      <CollabField
        label="Signature électronique"
        name="electronicSignature"
        value={formData.electronicSignature}
        onChange={(v) => updateField("electronicSignature", v)}
        onFocus={focusField}
        onBlur={blurField}
        placeholder="Tapez votre nom complet comme signature"
        required
        role={role}
        otherUser={otherUser}
        recentActivity={recentActivity.get("electronicSignature")}
        hint="En tapant votre nom, vous signez électroniquement ce dossier"
      />
    </div>
  );
}
