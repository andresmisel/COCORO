import React, { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { QuestionnaireResponse, StaffRole } from "../types";
import { Download, Loader2, ClipboardCheck, Star, Trash2 } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

interface Props {
  role: StaffRole;
}

export default function EvaluationDashboard({ role }: Props) {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = collection(db, "responses_questionnaire");
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionnaireResponse));
      // Sort by date descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setQuestionnaires(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading questionnaires", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const deleteQuestionnaire = async (id: string) => {
    try {
      await deleteDoc(doc(db, "responses_questionnaire", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `responses_questionnaire/${id}`);
    }
  };

  const keys: Array<{ label: string; key: "ratingSchedule" | "ratingFood" | "ratingCocoro" | "ratingLocation" | "ratingCommunication" | "ratingChallenge" | "ratingTeamwork" | "ratingMystique" | "ratingPrice" | "ratingDiscussions" }> = [
    { label: "Cronograma", key: "ratingSchedule" },
    { label: "Alimentación", key: "ratingFood" },
    { label: "COCORO", key: "ratingCocoro" },
    { label: "Instalaciones", key: "ratingLocation" },
    { label: "Comunicación", key: "ratingCommunication" },
    { label: "Desafío", key: "ratingChallenge" },
    { label: "Trabajo en Equipo", key: "ratingTeamwork" },
    { label: "Mística", key: "ratingMystique" },
    { label: "Cuota", key: "ratingPrice" },
    { label: "Debates/Escuchado", key: "ratingDiscussions" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Download Options */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-150 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] bg-primary/10 text-primary font-black uppercase px-3 py-1 rounded-full tracking-wider">
            Evaluaciones del Personal 📝
          </span>
          <h3 className="font-black text-xl text-gray-900 uppercase italic mt-2">Métricas de Calidad del Evento</h3>
          <p className="text-xs text-gray-500">Resultados detallados y anónimos de los cuestionarios entregados por los participantes.</p>
        </div>
        {questionnaires.length > 0 && (
          <button
            onClick={() => {
              const headers = [
                "ID",
                "Grupo Scout",
                "Fecha Creacion",
                "1. Cumplimiento Cronograma/Horarios",
                "2. Calidad/Cantidad Alimentacion",
                "3. Registro COCORO",
                "4. Instalaciones adecuadas",
                "5. Comunicacion organizadores",
                "6. Actividades desafiantes",
                "7. Actividades trabajo en equipo",
                "8. Mistica del evento",
                "9. Justificacion cuota",
                "10. Oportunidad debate/ser escuchado",
                "Lo que mas gusto",
                "Aspectos a mejorar"
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
                q.ratingSchedule || 0,
                q.ratingFood || 0,
                q.ratingCocoro || 0,
                q.ratingLocation || 0,
                q.ratingCommunication || 0,
                q.ratingChallenge || 0,
                q.ratingTeamwork || 0,
                q.ratingMystique || 0,
                q.ratingPrice || 0,
                q.ratingDiscussions || 0,
                q.whatLiked || "",
                q.whatImprove || ""
              ]);

              const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(escapeCSV).join(","))].join("\n");
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `Evaluaciones_Evento_${new Date().toISOString().split('T')[0]}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
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
        <div className="p-16 text-center bg-white border border-gray-150 rounded-3xl shadow-sm">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-gray-800">No hay cuestionarios cargados</h4>
          <p className="text-sm text-gray-400 mt-1">Las evaluaciones anónimas presentadas por los participantes se reflejarán aquí.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary stats */}
          {(() => {
            const total = questionnaires.length;
            const ratingKeys: Array<"ratingSchedule" | "ratingFood" | "ratingCocoro" | "ratingLocation" | "ratingCommunication" | "ratingChallenge" | "ratingTeamwork" | "ratingMystique" | "ratingPrice" | "ratingDiscussions"> = [
              "ratingSchedule", "ratingFood", "ratingCocoro", "ratingLocation", "ratingCommunication",
              "ratingChallenge", "ratingTeamwork", "ratingMystique", "ratingPrice", "ratingDiscussions"
            ];

            const globalSum = questionnaires.reduce((acc, q) => {
              let sum = 0;
              ratingKeys.forEach(k => sum += (q[k] || 0));
              return acc + sum;
            }, 0);

            const globalAverage = total > 0 ? (globalSum / (total * 10)) : 0;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Formularios Recibidos</p>
                    <p className="text-3xl font-black text-gray-900 mt-1 font-mono">{total}</p>
                  </div>
                  <div className="bg-indigo-50 px-4 py-2 rounded-2xl text-indigo-600 font-mono text-xs uppercase font-bold">
                    Encuestas
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Promedio General del Evento</p>
                    <p className="text-3xl font-black text-amber-500 mt-1 font-mono">{globalAverage.toFixed(2)} / 5.0</p>
                  </div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-6 h-6 ${star <= Math.round(globalAverage) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Graphical distribution section for each question */}
          <div>
            <h4 className="text-xs font-black text-gray-900 uppercase italic tracking-wider mb-4 border-b pb-2">
              Gráficos de Distribución por Pregunta Evaluada 📊
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: "ratingSchedule" as const, label: "1. Cumplimiento de Cronograma y Horarios", color: "amber" },
                { key: "ratingFood" as const, label: "2. Calidad y Cantidad de Alimentación", color: "orange" },
                { key: "ratingCocoro" as const, label: "3. Proceso de Registro (COCORO)", color: "indigo" },
                { key: "ratingLocation" as const, label: "4. Adecuación de Instalaciones", color: "emerald" },
                { key: "ratingCommunication" as const, label: "5. Comunicación del Equipo Organizador", color: "teal" },
                { key: "ratingChallenge" as const, label: "6. Reto de Capacidades/Conocimientos", color: "purple" },
                { key: "ratingTeamwork" as const, label: "7. Trabajo en Equipo e Integración", color: "pink" },
                { key: "ratingMystique" as const, label: "8. Mística y Expectativas Cumplidas", color: "yellow" },
                { key: "ratingPrice" as const, label: "9. Justificación de Cuota de Participación", color: "blue" },
                { key: "ratingDiscussions" as const, label: "10. Foros y Oportunidad de ser Escuchado", color: "cyan" },
              ].map((item) => {
                const totalResponses = questionnaires.length;
                const sum = questionnaires.reduce((acc, q) => acc + (q[item.key] || 0), 0);
                const avg = totalResponses > 0 ? sum / totalResponses : 0;

                // Calculate 1 to 5 stars dist
                const starCounts = [5, 4, 3, 2, 1].map(starNum => {
                  const count = questionnaires.filter(q => q[item.key] === starNum).length;
                  const pct = totalResponses > 0 ? (count / totalResponses) * 105 : 0; // standard bar styling percentage
                  const displayPct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                  return { starNum, count, pct, displayPct };
                });

                // Define bar color classes
                let progressColorClass = "bg-amber-500";
                if (item.color === "orange") progressColorClass = "bg-orange-500";
                if (item.color === "indigo") progressColorClass = "bg-indigo-500";
                if (item.color === "emerald") progressColorClass = "bg-emerald-550";
                if (item.color === "teal") progressColorClass = "bg-teal-500";
                if (item.color === "purple") progressColorClass = "bg-purple-500";
                if (item.color === "pink") progressColorClass = "bg-pink-500";
                if (item.color === "yellow") progressColorClass = "bg-yellow-500";
                if (item.color === "blue") progressColorClass = "bg-blue-500";
                if (item.color === "cyan") progressColorClass = "bg-cyan-500";

                return (
                  <div key={item.key} className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm flex flex-col justify-between hover:border-gray-350 transition-all">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <h5 className="text-xs font-black text-gray-800 uppercase tracking-wide leading-relaxed">{item.label}</h5>
                        <div className="shrink-0 text-right">
                          <span className="text-lg font-black font-mono text-gray-900">{avg.toFixed(1)}</span>
                          <span className="text-[10px] text-gray-400 font-bold block">Promedio</span>
                        </div>
                      </div>

                      {/* Mini distribution bar chart */}
                      <div className="space-y-2.5 pt-2 border-t border-gray-50">
                        {starCounts.map((starStat) => (
                          <div key={starStat.starNum} className="flex items-center gap-3 text-[10px]">
                            <span className="w-8 shrink-0 font-bold text-gray-500 flex items-center gap-0.5 justify-end font-mono">
                              {starStat.starNum} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            </span>
                            <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${progressColorClass} rounded-full transition-all duration-300`}
                                style={{ width: `${starStat.displayPct}%` }}
                              />
                            </div>
                            <span className="w-12 text-right text-gray-400 font-bold font-mono">
                              {starStat.displayPct.toFixed(0)}% ({starStat.count})
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
              Listado de Cuestionarios y Retroalimentación Directa 📝
            </h4>
            
            <div className="space-y-4">
              {questionnaires.map((res, index) => {
                return (
                  <div key={res.id || `eval_item_${index}`} className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-150 shadow-sm text-left relative group">
                    {role === "superadmin" && (
                      <button
                        type="button"
                        onClick={() => {
                          deleteQuestionnaire(res.id!);
                        }}
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
                        Entregado: {new Date(res.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* List of the 10 ratings in a grid */}
                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      {keys.map((k) => {
                        const val = res[k.key] || 0;
                        return (
                          <div key={k.key} className="text-center p-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between items-center">
                            <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider block text-center min-h-[16px] leading-[1.1]">{k.label}</span>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs font-black font-mono">{val}</span>
                              <Star className={`w-3.5 h-3.5 ${val > 0 ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Open feedback inputs */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Lo que más gustó 👍</span>
                        <p className="mt-2 text-sm text-gray-700 leading-relaxed italic bg-emerald-50/20 p-4 rounded-2xl border border-emerald-50/50">
                          {res.whatLiked || <span className="text-gray-400">Ningún comentario extra.</span>}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block">Aspectos a mejorar 🔧</span>
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
    </div>
  );
}
