import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from "firebase/firestore";
import { QuestionnaireQuestion } from "../types";
import { Plus, Trash2, Edit3, Save, X, Loader2, Star, ArrowUp, ArrowDown, Sparkles, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

const COLOR_OPTIONS = [
  { name: "Ámbar / Dorado", value: "text-amber-500 fill-amber-400", bg: "bg-amber-100 text-amber-800" },
  { name: "Naranja", value: "text-orange-500 fill-orange-500", bg: "bg-orange-100 text-orange-800" },
  { name: "Índigo / Violeta", value: "text-indigo-500 fill-indigo-400", bg: "bg-indigo-100 text-indigo-800" },
  { name: "Esmeralda / Verde", value: "text-emerald-500 fill-emerald-400", bg: "bg-emerald-100 text-emerald-800" },
  { name: "Verde Azulado (Teal)", value: "text-teal-500 fill-teal-400", bg: "bg-teal-100 text-teal-800" },
  { name: "Púrpura", value: "text-purple-500 fill-purple-500", bg: "bg-purple-100 text-purple-800" },
  { name: "Rosa", value: "text-pink-500 fill-pink-400", bg: "bg-pink-100 text-pink-800" },
  { name: "Amarillo Intenso", value: "text-yellow-500 fill-yellow-400", bg: "bg-yellow-100 text-yellow-800" },
  { name: "Azul Real", value: "text-blue-500 fill-blue-400", bg: "bg-blue-100 text-blue-800" },
  { name: "Cian", value: "text-cyan-500 fill-cyan-400", bg: "bg-cyan-100 text-cyan-800" },
];

const DEFAULT_QUESTIONS = [
  {
    key: "ratingSchedule",
    label: "¿Cómo evalúas el cumplimiento del cronograma y los horarios del evento?",
    colorClass: "text-amber-500 fill-amber-400",
  },
  {
    key: "ratingFood",
    label: "¿Qué te pareció la calidad y cantidad de la alimentación?",
    colorClass: "text-orange-500 fill-orange-500",
  },
  {
    key: "ratingCocoro",
    label: "¿Qué tan fácil y amigable te resultó el proceso de inscripción y registro a través del Sistema COCORO?",
    colorClass: "text-indigo-500 fill-indigo-400",
  },
  {
    key: "ratingLocation",
    label: "¿Las instalaciones o espacios elegidos fueron adecuados?",
    colorClass: "text-emerald-500 fill-emerald-400",
  },
  {
    key: "ratingCommunication",
    label: "¿La comunicación previa y durante el evento por parte del equipo organizador fue clara y estuvo disponible a tiempo?",
    colorClass: "text-teal-500 fill-teal-400",
  },
  {
    key: "ratingChallenge",
    label: "¿Las actividades del evento desafiaron tus capacidades y conocimientos?",
    colorClass: "text-purple-500 fill-purple-500",
  },
  {
    key: "ratingTeamwork",
    label: "¿Las actividades fomentaron el trabajo en equipo y la integración entre los Clanes?",
    colorClass: "text-pink-500 fill-pink-400",
  },
  {
    key: "ratingMystique",
    label: "¿La \"Mística del evento\" cumplió con tus expectativas?",
    colorClass: "text-yellow-500 fill-yellow-400",
  },
  {
    key: "ratingPrice",
    label: "¿Consideras que la cuota de participación del evento se justificó plenamente con lo que recibiste?",
    colorClass: "text-blue-500 fill-blue-400",
  },
  {
    key: "ratingDiscussions",
    label: "¿Tuviste la oportunidad de debatir, dar tu punto de vista y ser escuchado durante los foros o actividades?",
    colorClass: "text-cyan-500 fill-cyan-400",
  },
];

export default function QuestionManager() {
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [newLabel, setNewLabel] = useState("");
  const [newColorClass, setNewColorClass] = useState(COLOR_OPTIONS[0].value);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColorClass, setEditColorClass] = useState("");

  // Deleting confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "questionnaire_questions"), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as QuestionnaireQuestion));
        setQuestions(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching questions", err);
        handleFirestoreError(err, OperationType.LIST, "questionnaire_questions");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const showNotification = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // Seed default 10 questions
  const seedDefaultQuestions = async () => {
    if (!window.confirm("¿Deseas cargar las 10 preguntas predeterminadas del cuestionario?")) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      DEFAULT_QUESTIONS.forEach((q, idx) => {
        const newDocRef = doc(collection(db, "questionnaire_questions"));
        batch.set(newDocRef, {
          key: q.key,
          label: q.label,
          colorClass: q.colorClass,
          order: idx,
        });
      });
      await batch.commit();
      showNotification("success", "¡10 preguntas iniciales cargadas exitosamente!");
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, "questionnaire_questions");
      showNotification("error", "Error al cargar las preguntas predeterminadas.");
    } finally {
      setSaving(false);
    }
  };

  // Add a new question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      showNotification("error", "Escribe el texto de la pregunta.");
      return;
    }

    setSaving(true);
    try {
      const newOrder = questions.length > 0 ? Math.max(...questions.map((q) => q.order ?? 0)) + 1 : 0;
      await addDoc(collection(db, "questionnaire_questions"), {
        key: `rating_${Date.now()}`,
        label: newLabel.trim(),
        colorClass: newColorClass,
        order: newOrder,
        createdAt: new Date().toISOString(),
      });
      setNewLabel("");
      showNotification("success", "Pregunta agregada con éxito.");
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, "questionnaire_questions");
      showNotification("error", "No se pudo agregar la pregunta.");
    } finally {
      setSaving(false);
    }
  };

  // Start editing
  const startEdit = (q: QuestionnaireQuestion) => {
    setEditingId(q.id);
    setEditLabel(q.label);
    setEditColorClass(q.colorClass || COLOR_OPTIONS[0].value);
  };

  // Save edit
  const handleSaveEdit = async (id: string) => {
    if (!editLabel.trim()) {
      showNotification("error", "El texto de la pregunta no puede estar vacío.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "questionnaire_questions", id), {
        label: editLabel.trim(),
        colorClass: editColorClass,
        updatedAt: new Date().toISOString(),
      });
      setEditingId(null);
      showNotification("success", "Pregunta actualizada correctamente.");
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `questionnaire_questions/${id}`);
      showNotification("error", "Error al actualizar la pregunta.");
    } finally {
      setSaving(false);
    }
  };

  // Delete question
  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, "questionnaire_questions", id));
      setDeleteConfirmId(null);
      showNotification("success", "Pregunta eliminada del cuestionario.");
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `questionnaire_questions/${id}`);
      showNotification("error", "No se pudo eliminar la pregunta.");
    } finally {
      setSaving(false);
    }
  };

  // Move Question Up/Down
  const moveQuestion = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    setSaving(true);
    try {
      const currentQ = questions[index];
      const targetQ = questions[targetIndex];

      const batch = writeBatch(db);
      batch.update(doc(db, "questionnaire_questions", currentQ.id), { order: targetIndex });
      batch.update(doc(db, "questionnaire_questions", targetQ.id), { order: index });
      await batch.commit();
      showNotification("success", "Orden de preguntas actualizado.");
    } catch (err) {
      console.error(err);
      showNotification("error", "Error al reordenar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 bg-white rounded-3xl border border-gray-150">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Cargando preguntas del cuestionario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-150 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black uppercase px-3 py-1 rounded-full tracking-wider border border-indigo-100">
              SuperAdmin • Configuración
            </span>
            <span className="text-[10px] bg-amber-50 text-amber-700 font-black uppercase px-3 py-1 rounded-full tracking-wider border border-amber-100">
              {questions.length} {questions.length === 1 ? "Pregunta Activa" : "Preguntas Activas"}
            </span>
          </div>
          <h3 className="font-black text-xl text-gray-900 uppercase italic mt-2">
            Gestión de Preguntas del Cuestionario ⚙️
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Personaliza las preguntas que los participantes evaluarán con estrellas (1 a 5). Puedes agregar nuevas preguntas, cambiar su redacción o color, reordenarlas o eliminarlas.
          </p>
        </div>

        {questions.length === 0 && (
          <button
            onClick={seedDefaultQuestions}
            disabled={saving}
            className="flex items-center space-x-2 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-95 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Cargar 10 Preguntas Predeterminadas</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-bold animate-in fade-in duration-200 border ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-850 border-emerald-250"
              : "bg-red-50 text-red-850 border-red-250"
          }`}
        >
          {msg.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Form to Add New Question */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-150 shadow-sm space-y-5">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-sm text-gray-900 uppercase italic">Agregar Nueva Pregunta al Cuestionario</h4>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Se mostrará con escala de calificación de 1 a 5 estrellas</p>
          </div>
        </div>

        <form onSubmit={handleAddQuestion} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
              Enunciado de la Pregunta <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ej: ¿Cómo evalúas la seguridad y atención médica durante el evento?"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-300"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Color de las Estrellas</label>
              <select
                value={newColorClass}
                onChange={(e) => setNewColorClass(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vista Previa:</span>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`w-5 h-5 ${newColorClass}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving || !newLabel.trim()}
              className="bg-primary hover:bg-primary-dark disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center space-x-2 shadow-md shadow-primary/20 transition-all cursor-pointer hover:-translate-y-0.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Crear y Añadir Pregunta</span>
            </button>
          </div>
        </form>
      </div>

      {/* Existing Questions List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h4 className="text-xs font-black text-gray-900 uppercase italic tracking-wider">
            Listado de Preguntas ({questions.length})
          </h4>
          {questions.length > 0 && (
            <button
              onClick={seedDefaultQuestions}
              disabled={saving}
              className="text-[10px] text-gray-400 hover:text-primary font-bold uppercase tracking-wider transition-colors"
            >
              ↻ Restaurar Preguntas por Defecto
            </button>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="p-16 text-center bg-white border border-gray-150 rounded-3xl space-y-4">
            <HelpCircle className="w-12 h-12 text-gray-300 mx-auto" />
            <div>
              <h4 className="text-base font-black text-gray-800 uppercase italic">No hay preguntas configuradas todavía</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                Para que los participantes puedan responder el cuestionario, debes agregar al menos una pregunta o cargar las 10 predeterminadas del evento.
              </p>
            </div>
            <button
              onClick={seedDefaultQuestions}
              disabled={saving}
              className="bg-primary text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-wider shadow-md hover:bg-primary-dark transition-all cursor-pointer"
            >
              Cargar 10 Preguntas Predeterminadas Ahora
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isEditing = editingId === q.id;
              const isDeleting = deleteConfirmId === q.id;

              return (
                <div
                  key={q.id}
                  className="bg-white p-5 md:p-6 rounded-3xl border border-gray-150 shadow-sm hover:border-gray-300 transition-all text-left"
                >
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-primary tracking-wider">
                          Modificar Pregunta {idx + 1}
                        </label>
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-primary/40 focus:ring-2 focus:ring-primary/20 text-sm font-medium outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Color de Estrellas</label>
                          <select
                            value={editColorClass}
                            onChange={(e) => setEditColorClass(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold outline-none bg-white"
                          >
                            {COLOR_OPTIONS.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center space-x-1 p-2 bg-gray-50 rounded-lg justify-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-4 h-4 ${editColorClass}`} />
                          ))}
                        </div>
                      </div>

                      <div className="flex space-x-2 justify-end pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={saving || !editLabel.trim()}
                          onClick={() => handleSaveEdit(q.id)}
                          className="px-5 py-2 rounded-xl text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 shadow-sm"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar Cambios</span>
                        </button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    <div className="p-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-red-50/50 rounded-2xl border border-red-150">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-red-900">¿Estás seguro de eliminar esta pregunta?</p>
                          <p className="text-[10px] text-red-700 italic">"{q.label}"</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase text-gray-500 hover:bg-gray-100"
                        >
                          No, Cancelar
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          disabled={saving}
                          className="px-4 py-1.5 rounded-lg text-xs font-black uppercase bg-red-600 hover:bg-red-700 text-white shadow-sm"
                        >
                          Sí, Borrar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1.5 flex-1 pr-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-md font-mono">
                            #{idx + 1}
                          </span>
                          <div className="flex space-x-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`w-3.5 h-3.5 ${q.colorClass || "text-amber-500 fill-amber-400"}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm font-bold text-gray-800 leading-relaxed">{q.label}</p>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                        {/* Move Order */}
                        <button
                          type="button"
                          disabled={idx === 0 || saving}
                          onClick={() => moveQuestion(idx, "up")}
                          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 rounded-xl transition-all"
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === questions.length - 1 || saving}
                          onClick={() => moveQuestion(idx, "down")}
                          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 rounded-xl transition-all"
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => startEdit(q)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center space-x-1"
                          title="Editar pregunta"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(q.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Borrar pregunta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
