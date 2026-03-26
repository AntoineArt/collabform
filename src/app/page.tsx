"use client";
import { useState } from "react";
import { UserRole } from "@/lib/types";
import InsuranceForm from "@/components/InsuranceForm";
import { ShieldIcon, UserIcon, SparklesIcon } from "@/components/Icons";

export default function Home() {
  const [role, setRole] = useState<UserRole | null>(null);
  const sessionId = "SC-7X3K9";

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50/20 to-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
              <ShieldIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">AssurConnect</h1>
            <p className="text-gray-500 mt-2 text-sm">Plateforme collaborative de souscription d&apos;assurance</p>
          </div>

          {/* Session Info */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 bg-accent-50 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-accent-700">Session active</span>
              </div>
              <code className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">{sessionId}</code>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Choisissez votre rôle pour rejoindre la session collaborative. Les deux participants voient le même formulaire en temps réel.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Seller Card */}
              <button
                onClick={() => setRole("seller")}
                className="group relative p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">Conseiller</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Accompagnez le client dans sa souscription. Aidez-le à remplir les champs, répondez à ses questions et validez le dossier.
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Rejoindre en tant que conseiller
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </button>

              {/* Client Card */}
              <button
                onClick={() => setRole("client")}
                className="group relative p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-50 transition-all duration-300 text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">Client</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Souscrivez à votre assurance avec l&apos;assistance en temps réel de votre conseiller dédié.
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Rejoindre en tant que client
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] text-gray-400">
            Ceci est un prototype de démonstration. Aucune donnée réelle n&apos;est collectée ou stockée.
          </p>
        </div>
      </div>
    );
  }

  return <InsuranceForm role={role} sessionId={sessionId} />;
}
