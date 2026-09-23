import React, { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { QuestionnaireQuestion } from "../types";
import { Plus, Trash2, Edit3, Save, X, Loader2 } from "lucide-react";

export default function QuestionManager() {
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState({ label: "", colorClass: "text-primary fill-primary" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ label: "", colorClass: "" });

  useEffect(() => {
    const q = query(collection(db, "questionnaire_questions"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionnaireQuestion));
      setQuestions(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addQuestion = async () => {
    if (!newQuestion.label) return;
    await addDoc(collection(db, "questionnaire_questions"), {
      label: newQuestion.label,
      key: `rating_${Date.now()}`,
      colorClass: newQuestion.colorClass,
      order: questions.length
    });
    setNewQuestion({ label: "", colorClass: "text-primary fill-primary" });
  };

  const deleteQuestion = async (id: string) => {
    await deleteDoc(doc(db, "questionnaire_questions", id));
  };

  const startEdit = (q: QuestionnaireQuestion) => {
    setEditingId(q.id);
    setEditValues({ label: q.label, colorClass: q.colorClass });
  };

  const saveEdit = async (id: string) => {
    await updateDoc(doc(db, "questionnaire_questions", id), {
      label: editValues.label,
      colorClass: editValues.colorClass
    });
    setEditingId(null);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin w-8 h-8 text-primary mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-gray-900 uppercase italic">Agregar Nueva Pregunta</h3>
        <div className="flex gap-2">
            <input 
              value={newQuestion.label}
              onChange={e => setNewQuestion({...newQuestion, label: e.target.value})}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-primary"
              placeholder="Texto de la pregunta..."
            />
            <button onClick={addQuestion} className="bg-primary text-white px-4 py-2 rounded-xl font-bold uppercase text-xs flex items-center space-x-1 hover:bg-primary-dark">
              <Plus className="w-4 h-4" /> <span>Agregar</span>
            </button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
            {editingId === q.id ? (
              <div className="flex-1 flex gap-2">
                <input value={editValues.label} onChange={e => setEditValues({...editValues, label: e.target.value})} className="flex-1 px-2 py-1 border rounded text-sm" />
                <button onClick={() => saveEdit(q.id)} className="p-2 text-green-600"><Save className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="p-2 text-gray-400"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold">{idx + 1}. {q.label}</p>
                <div className="flex space-x-2">
                  <button onClick={() => startEdit(q)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => deleteQuestion(q.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
