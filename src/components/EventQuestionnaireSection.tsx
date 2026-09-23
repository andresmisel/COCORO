import React, { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { SCOUT_GROUPS } from "../constants";
import { Config, QuestionnaireResponse, QuestionnaireQuestion } from "../types";
import { Star, CheckCircle2, Loader2, AlertCircle, ClipboardSignature } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

interface Props {
  config: Config;
}

export default function EventQuestionnaireSection({ config }: Props) {
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "questionnaire_questions"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionnaireQuestion));
      setQuestions(list);
      setLoadingQuestions(false);
    });
    return () => unsub();
  }, []);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [hovers, setHovers] = useState<{ [key: string]: number }>({});

  const [whatLiked, setWhatLiked] = useState("");
  const [whatImprove, setWhatImprove] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const setRatingVal = (key: string, val: number) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  const setHoverVal = (key: string, val: number) => {
    setHovers((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) {
      setError("Por favor selecciona tu grupo scout.");
      return;
    }

    // Check if any rating is 0
    for (const q of questions) {
      if (!ratings[q.key] || ratings[q.key] === 0) {
        setError(`Por favor califica la pregunta: "${q.label}"`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response: QuestionnaireResponse = {
        scoutGroup: selectedGroup,
        responses: questions.map(q => ({ key: q.key, rating: ratings[q.key] })),
        whatLiked,
        whatImprove,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "responses_questionnaire"), response);
      setSuccess(true);
      // Reset form
      setSelectedGroup("");
      setRatings({});
      setWhatLiked("");
      setWhatImprove("");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "responses_questionnaire");
      setError("Ocurrió un error al guardar tu cuestionario.");
    } finally {
      setLoading(false);
    }
  };

  const isFormIncomplete = !selectedGroup || questions.some(q => !ratings[q.key] || ratings[q.key] === 0);

  if (loadingQuestions) return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  return (
    <div className="bg-gradient-to-br from-indigo-50/20 to-purple-50/10 p-8 md:p-12 rounded-[40px] border border-gray-150 shadow-sm mt-16 max-w-3xl mx-auto text-left" id="event-questionnaire-section">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="bg-indigo-100 p-4 rounded-3xl text-primary mb-4">
          <ClipboardSignature className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">
          {config.questionnaireTitle || "Cuestionario de Evaluación del Evento"}
        </h2>
        <p className="text-gray-500 mt-2 text-xs uppercase tracking-widest font-bold">
          {config.questionnaireInstructions || "Tu opinión es clave para seguir creciendo. Este cuestionario es completamente anónimo y confidencial."}
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-250 text-emerald-850 rounded-2xl flex items-start space-x-3 text-sm animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">¡Cuestionario enviado con éxito!</p>
            <p className="text-xs text-emerald-700 mt-1">Muchas gracias por tus respuestas. Tu feedback nos ayuda a mejorar futuras experiencias scouts.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-850 rounded-2xl flex items-start space-x-3 text-sm animate-in fade-in duration-300">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Scout Group Selection */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Identificar Grupo Scout (Anónimo)</label>
          <select
            required
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none bg-white font-bold text-sm tracking-wider"
          >
            <option value="" disabled>SELECCIONAR TU GRUPO SCOUT</option>
            {SCOUT_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Star Rating Questions */}
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const currentRating = ratings[q.key] || 0;
            const currentHover = hovers[q.key] || 0;

            return (
              <div key={q.key} className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-200 transition-all">
                <div className="space-y-1.5 max-w-lg">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Pregunta {idx + 1} de {questions.length}</span>
                  <label className="text-xs font-bold text-gray-800 tracking-wide block leading-relaxed">{q.label}</label>
                </div>
                <div className="flex space-x-1.5 shrink-0">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isLit = star <= (currentHover || currentRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingVal(q.key, star)}
                        onMouseEnter={() => setHoverVal(q.key, star)}
                        onMouseLeave={() => setHoverVal(q.key, 0)}
                        className="focus:outline-none transition-all hover:scale-110 p-0.5"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            isLit
                              ? q.colorClass
                              : "text-gray-200 hover:text-gray-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* What liked */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-gray-500 tracking-wider">¿Qué fue lo que más te gustó del evento? (Opcional)</label>
          <textarea
            value={whatLiked}
            onChange={(e) => setWhatLiked(e.target.value)}
            className="w-full h-24 p-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm leading-relaxed"
            placeholder="Comenta sobre la mística, actividades, ambiente, etc..."
          />
        </div>

        {/* What to improve */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-gray-500 tracking-wider">¿Qué aspectos podemos mejorar para futuros eventos? (Opcional)</label>
          <textarea
            value={whatImprove}
            onChange={(e) => setWhatImprove(e.target.value)}
            className="w-full h-24 p-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary text-sm leading-relaxed"
            placeholder="Logística, tiempos, comunicación, talleres, etc..."
          />
        </div>

        <button
          type="submit"
          disabled={loading || isFormIncomplete}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl py-4 font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-indigo-600/20 hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center space-x-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando Respuestas...</span>
            </>
          ) : (
            <span>Enviar Evaluación Anónima</span>
          )}
        </button>
      </form>
    </div>
  );
}
