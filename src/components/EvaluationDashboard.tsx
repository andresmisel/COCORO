import React, { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { QuestionnaireResponse, QuestionnaireQuestion, StaffRole } from "../types";
import { Download, Loader2, ClipboardCheck, Star, Trash2, Settings, BarChart3 } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import QuestionManager from "./QuestionManager";

interface Props {
  role: StaffRole;
}

interface QuestionDef {
  key: string;
  label: string;
  colorClass?: string;
  order?: number;
}

const DEFAULT_QUESTIONS: QuestionDef[] = [
  {
    key: "ratingSchedule",
    label: "1. Cumplimiento de Cronograma y Horarios",
    colorClass: "text-amber-500 fill-amber-400",
    order: 0,
  },
  {
    key: "ratingFood",
    label: "2. Calidad y Cantidad de Alimentación",
    colorClass: "text-orange-500 fill-orange-500",
    order: 1,
  },
  {
    key: "ratingCocoro",
    label: "3. Proceso de Registro (COCORO)",
    colorClass: "text-indigo-500 fill-indigo-400",
    order: 2,
  },
  {
    key: "ratingLocation",
    label: "4. Adecuación de Instalaciones",
    colorClass: "text-emerald-500 fill-emerald-400",
    order: 3,
  },
  {
    key: "ratingCommunication",
    label: "5. Comunicación del Equipo Organizador",
    colorClass: "text-teal-500 fill-teal-400",
    order: 4,
  },
  {
    key: "ratingChallenge",
    label: "6. Reto de Capacidades/Conocimientos",
    colorClass: "text-purple-500 fill-purple-500",
    order: 5,
  },
  {
    key: "ratingTeamwork",
    label: "7. Trabajo en Equipo e Integración",
    colorClass: "text-pink-500 fill-pink-400",
    order: 6,
  },
  {
    key: "ratingMystique",
    label: "8. Mística y Expectativas Cumplidas",
    colorClass: "text-yellow-500 fill-yellow-400",
    order: 7,
  },
  {
    key: "ratingPrice",
    label: "9. Justificación de Cuota de Participación",
    colorClass: "text-blue-500 fill-blue-400",
    order: 8,
  },
  {
    key: "ratingDiscussions",
    label: "10. Foros y Oportunidad de ser Escuchado",
    colorClass: "text-cyan-500 fill-cyan-400",
    order: 9,
  },
];

/**
 * Robust extractor to get the rating for a question from a questionnaire response.
 * Inspects:
 * 1. Direct field res[key] (e.g. res.ratingSchedule, res.rating_12345)
 * 2. res.responses array by matching key
 * 3. res.responses array by matching label
 * 4. res.responses array by index fallback
 * 5. res.ratings object if present
 */
export function getRatingValue(
  res: QuestionnaireResponse,
  key: string,
  index?: number,
  label?: string
): number {
  if (!res) return 0;

  // 1. Direct property
  const directVal = (res as any)[key];
  if (directVal !== undefined && directVal !== null && directVal !== "") {
    const num = Number(directVal);
    if (!isNaN(num) && num > 0) return num;
  }

  // 2. In responses array by matching key
  if (Array.isArray(res.responses) && res.responses.length > 0) {
    const byKey: any = res.responses.find(
      (r: any) => r && (r.key === key || r.questionKey === key || r.id === key)
    );
    if (byKey) {
      const val = byKey.rating ?? byKey.value ?? byKey.score;
      if (val !== undefined && val !== null && val !== "") {
        const num = Number(val);
        if (!isNaN(num) && num > 0) return num;
      }
    }

    // 3. In responses array by matching label
    if (label) {
      const byLabel: any = res.responses.find(
        (r: any) => r && r.label && r.label.trim().toLowerCase() === label.trim().toLowerCase()
      );
      if (byLabel) {
        const val = byLabel.rating ?? byLabel.value ?? byLabel.score;
        if (val !== undefined && val !== null && val !== "") {
          const num = Number(val);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }

    // 4. In responses array by index fallback
    if (index !== undefined && index >= 0 && index < res.responses.length) {
      const atIndex: any = res.responses[index];
      if (atIndex) {
        const val = atIndex.rating ?? atIndex.value ?? atIndex.score;
        if (val !== undefined && val !== null && val !== "") {
          const num = Number(val);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }
  }

  // 5. In ratings map
  if ((res as any).ratings && typeof (res as any).ratings === "object") {
    const val = (res as any).ratings[key];
    if (val !== undefined && val !== null && val !== "") {
      const num = Number(val);
      if (!isNaN(num) && num > 0) return num;
    }
  }

  return 0;
}

export default function EvaluationDashboard({ role }: Props) {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireResponse[]>([]);
  const [dbQuestions, setDbQuestions] = useState<QuestionDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"results" | "questions">("results");

  // Load configured questions
  useEffect(() => {
    const q = query(collection(db, "questionnaire_questions"), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setDbQuestions(DEFAULT_QUESTIONS);
        } else {
          const list = snap.docs.map((docSnap, idx) => {
            const d = docSnap.data();
            return {
              key: d.key || docSnap.id || `rating_${idx}`,
              label: d.label || `Pregunta ${idx + 1}`,
              colorClass: d.colorClass || "text-amber-500 fill-amber-400",
              order: d.order ?? idx,
            };
          });
          setDbQuestions(list);
        }
      },
      (err) => {
        console.error("Error loading questionnaire questions", err);
        setDbQuestions(DEFAULT_QUESTIONS);
      }
    );
    return () => unsub();
  }, []);

  // Load questionnaire responses
  useEffect(() => {
    setLoading(true);
    const q = collection(db, "responses_questionnaire");
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as QuestionnaireResponse)
        );
        // Sort by date descending
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setQuestionnaires(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading questionnaires", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const deleteQuestionnaire = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este reporte de evaluación?")) return;
    try {
      await deleteDoc(doc(db, "responses_questionnaire", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `responses_questionnaire/${id}`);
    }
  };

  // Determine active questions list
  const activeQuestions: QuestionDef[] = dbQuestions.length > 0 ? dbQuestions : DEFAULT_QUESTIONS;

  // Calculate global metrics
  let totalRatingsSum = 0;
  let totalRatingsCount = 0;

  questionnaires.forEach((res) => {
    activeQuestions.forEach((item, idx) => {
      const val = getRatingValue(res, item.key, idx, item.label);
      if (val > 0) {
        totalRatingsSum += val;
        totalRatingsCount++;
      }
    });
  });

  const globalAverage = totalRatingsCount > 0 ? totalRatingsSum / totalRatingsCount : 0;

  const downloadCSV = () => {
    if (questionnaires.length === 0) return;

    const headers = [
      "ID",
      "Grupo Scout",
      "Fecha Creacion",
      ...activeQuestions.map((q, idx) => `${idx + 1}. ${q.label}`),
      "Lo que mas gusto",
      "Aspectos a mejorar",
    ];

    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = questionnaires.map((q, index) => [
      q.id || `eval_${index + 1}`,
      q.scoutGroup,
      new Date(q.createdAt).toLocaleString("es-ES"),
      ...activeQuestions.map((item, idx) => getRatingValue(q, item.key, idx, item.label)),
      q.whatLiked || "",
      q.whatImprove || "",
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.map(escapeCSV).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Evaluaciones_Evento_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {role === "superadmin" && (
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setSubTab("results")}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-xs transition-all cursor-pointer ${
              subTab === "results" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Resultados y Métricas</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("questions")}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold uppercase text-xs transition-all cursor-pointer ${
              subTab === "questions" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Gestionar Preguntas ⚙️</span>
          </button>
        </div>
      )}

      {subTab === "questions" && role === "superadmin" ? (
        <QuestionManager />
      ) : (
        <>
          {/* Header & Download Options */}
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-150 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] bg-primary/10 text-primary font-black uppercase px-3 py-1 rounded-full tracking-wider">
                Evaluaciones del Evento 📝
              </span>
              <h3 className="font-black text-xl text-gray-900 uppercase italic mt-2">Métricas de Calidad del Evento</h3>
              <p className="text-xs text-gray-500">Resultados detallados y anónimos de los cuestionarios entregados por los participantes.</p>
            </div>
            {questionnaires.length > 0 && (
              <button
                type="button"
                onClick={downloadCSV}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/10 hover:-translate-y-0.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Resultados (.CSV)</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-24 bg-white rounded-3xl border border-gray-150 shadow-sm">
              <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
          ) : questionnaires.length === 0 ? (
            <div className="p-16 text-center bg-white border border-gray-150 rounded-3xl shadow-sm space-y-3">
              <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto" />
              <h4 className="text-lg font-bold text-gray-800">No hay cuestionarios cargados aún</h4>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Las evaluaciones anónimas presentadas por los participantes en la página principal se reflejarán instantáneamente en este panel.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Formularios Recibidos</p>
                    <p className="text-3xl font-black text-gray-900 mt-1 font-mono">{questionnaires.length}</p>
                  </div>
                  <div className="bg-indigo-50 px-4 py-2 rounded-2xl text-indigo-600 font-mono text-xs uppercase font-bold">
                    Encuestas
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Respuestas Procesadas</p>
                    <p className="text-3xl font-black text-indigo-600 mt-1 font-mono">{totalRatingsCount}</p>
                  </div>
                  <div className="bg-indigo-50 px-4 py-2 rounded-2xl text-indigo-600 font-mono text-xs uppercase font-bold">
                    Votos
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Promedio General del Evento</p>
                    <p className="text-3xl font-black text-amber-500 mt-1 font-mono">{globalAverage.toFixed(2)} / 5.0</p>
                  </div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(globalAverage) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Graphical distribution section for each question */}
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase italic tracking-wider mb-4 border-b pb-2">
                  Gráficos de Distribución por Pregunta Evaluada ({activeQuestions.length}) 📊
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeQuestions.map((item, idx) => {
                    const totalResponses = questionnaires.length;
                    const scores = questionnaires
                      .map((q) => getRatingValue(q, item.key, idx, item.label))
                      .filter((v) => v > 0);

                    const sum = scores.reduce((acc, v) => acc + v, 0);
                    const avg = scores.length > 0 ? sum / scores.length : 0;

                    // Calculate 1 to 5 stars dist
                    const starCounts = [5, 4, 3, 2, 1].map((starNum) => {
                      const count = questionnaires.filter(
                        (q) => getRatingValue(q, item.key, idx, item.label) === starNum
                      ).length;
                      const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                      return { starNum, count, pct };
                    });

                    return (
                      <div
                        key={item.key || `q_card_${idx}`}
                        className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between hover:border-gray-350 transition-all text-left"
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1 flex-1">
                              <span className="text-[9px] font-black uppercase tracking-widest text-primary font-mono">
                                Pregunta #{idx + 1}
                              </span>
                              <h5 className="text-xs font-bold text-gray-800 leading-relaxed">{item.label}</h5>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="text-xl font-black font-mono text-gray-900">{avg.toFixed(1)}</span>
                              <span className="text-[10px] text-gray-400 font-bold block">Promedio</span>
                            </div>
                          </div>

                          {/* Distribution bar chart */}
                          <div className="space-y-2 pt-2 border-t border-gray-50">
                            {starCounts.map((starStat) => (
                              <div key={starStat.starNum} className="flex items-center gap-3 text-[10px]">
                                <span className="w-8 shrink-0 font-bold text-gray-500 flex items-center gap-0.5 justify-end font-mono">
                                  {starStat.starNum} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                </span>
                                <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                                    style={{ width: `${starStat.pct}%` }}
                                  />
                                </div>
                                <span className="w-14 text-right text-gray-400 font-bold font-mono">
                                  {starStat.pct.toFixed(0)}% ({starStat.count})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feed lists */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-900 uppercase italic tracking-wider mb-2 border-b pb-2">
                  Listado de Cuestionarios y Retroalimentación Directa ({questionnaires.length}) 📝
                </h4>

                <div className="space-y-4">
                  {questionnaires.map((res, index) => {
                    return (
                      <div
                        key={res.id || `eval_item_${index}`}
                        className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-150 shadow-sm text-left relative group"
                      >
                        {role === "superadmin" && (
                          <button
                            type="button"
                            onClick={() => deleteQuestionnaire(res.id!)}
                            className="absolute top-6 right-6 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-transparent hover:border-red-100"
                            title="Eliminar reporte de evaluación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="px-3.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-full text-[10px] font-black uppercase tracking-wider">
                            {res.scoutGroup}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">
                            Entregado:{" "}
                            {new Date(res.createdAt).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* List of ratings in a responsive grid */}
                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                          {activeQuestions.map((item, qIdx) => {
                            const val = getRatingValue(res, item.key, qIdx, item.label);
                            return (
                              <div
                                key={item.key || `rating_box_${qIdx}`}
                                className="text-center p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between items-center"
                              >
                                <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider block text-center min-h-[16px] leading-[1.1]">
                                  {item.label.length > 25 ? `${item.label.substring(0, 25)}...` : item.label}
                                </span>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <span className="text-sm font-black font-mono text-gray-900">{val}</span>
                                  <div className="flex space-x-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-3 h-3 ${
                                          star <= val ? "fill-amber-400 text-amber-400" : "text-gray-200"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Open feedback comments */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                          <div>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">
                              Lo que más gustó 👍
                            </span>
                            <p className="mt-2 text-sm text-gray-700 leading-relaxed italic bg-emerald-50/20 p-4 rounded-2xl border border-emerald-50/50">
                              {res.whatLiked || <span className="text-gray-400">Ningún comentario extra.</span>}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block">
                              Aspectos a mejorar 🔧
                            </span>
                            <p className="mt-2 text-sm text-gray-700 leading-relaxed italic bg-rose-50/20 p-4 rounded-2xl border border-rose-50/50">
                              {res.whatImprove || <span className="text-gray-400">Ningún comentario extra.</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
