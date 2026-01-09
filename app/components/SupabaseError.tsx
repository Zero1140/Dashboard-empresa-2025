"use client";

import { SUPABASE_ERROR_MESSAGE } from "../utils/supabaseError";

interface SupabaseErrorProps {
  type: "NOT_CONFIGURED" | "CONNECTION_ERROR";
}

export default function SupabaseError({ type }: SupabaseErrorProps) {
  const error = SUPABASE_ERROR_MESSAGE[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] border-2 border-red-500 rounded-xl p-8 max-w-2xl w-full shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-5xl">{type === "NOT_CONFIGURED" ? "⚠️" : "❌"}</div>
          <div>
            <h2 className="text-3xl font-bold text-red-400 mb-2">{error.title}</h2>
            <p className="text-gray-300 text-lg">{error.message}</p>
          </div>
        </div>

        <div className="bg-[#0f1419] rounded-lg p-6 mb-6 border border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">📋 Instrucciones para solucionar:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            {error.instructions.map((instruction, index) => (
              <li key={index} className="text-base leading-relaxed">
                {instruction}
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
          <p className="text-blue-200 text-sm">
            <strong>Nota:</strong> El sistema requiere una conexión activa a Supabase para funcionar. 
            Sin esta configuración, no se puede garantizar la sincronización de datos ni la persistencia.
          </p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg"
          >
            🔄 Recargar Página
          </button>
        </div>
      </div>
    </div>
  );
}


