import React, { useState, useEffect } from "react";
import { Registration, MembershipType, Status, Payment, PaymentMethod, Candidate, GroupAttachment, QuestionnaireResponse } from "../types";
import { updateDoc, doc, deleteDoc, getDoc, addDoc, getDocs, collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Trash2, Edit3, Save, X, Download, AlertTriangle, Settings, Loader2, CreditCard, User, Eye, Vote, ShieldAlert, FileText, ClipboardCheck, Star } from "lucide-react";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import ProofViewer from "./ProofViewer";

interface Props {
  registrations: Registration[];
  payments: Payment[];
  onExport: () => void;
  staffName: string;
}

export default function SuperAdminPanel({ registrations, payments, onExport, staffName }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<"registration" | "payment" | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [viewProof, setViewProof] = useState<Payment | null>(null);
  
  const [config, setConfig] = useState({ 
    eventName: "",
    headerTagline: "",
    eventDescription: "",
    bankDetails: "", 
    cashDetails: "",
    totalCostUSD: 0,
    currency: "$" as "$" | "€",
    registrationDeadline: "",
    photoAlbumUrl: "",
    votingActive: false,
    votingTitle: "",
    votingQuestion: "",
    votingDeadline: "",
    votingTargetUnit: "Ambos" as "Joven" | "Adulto" | "Ambos",
    showVotingResults: false
  });
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [view, setView] = useState<"users" | "payments" | "voting" | "attachments" | "questionnaires">("users");

  const [attachments, setAttachments] = useState<GroupAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireResponse[]>([]);
  const [questionnairesLoading, setQuestionnairesLoading] = useState(false);

  // Voting-specific admin states
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidate, setNewCandidate] = useState({ firstName: "", lastName: "" });
  const [candidatePhoto, setCandidatePhoto] = useState<string>("");
  const [votesAudit, setVotesAudit] = useState<any[]>([]);
  const [voteCountMap, setVoteCountMap] = useState<{ [candId: string]: number }>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [votingLoading, setVotingLoading] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "global"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          setConfig({
            eventName: data.eventName || "Congreso de Comunidad Rover",
            headerTagline: data.headerTagline || "Caracas 2026",
            eventDescription: data.eventDescription || "",
            bankDetails: data.bankDetails || "",
            cashDetails: data.cashDetails || "",
            totalCostUSD: data.totalCostUSD || 0,
            currency: data.currency || "$",
            registrationDeadline: data.registrationDeadline || "",
            photoAlbumUrl: data.photoAlbumUrl || "",
            votingActive: data.votingActive || false,
            votingTitle: data.votingTitle || "",
            votingQuestion: data.votingQuestion || "",
            votingDeadline: data.votingDeadline || "",
            votingTargetUnit: data.votingTargetUnit || "Ambos",
            showVotingResults: data.showVotingResults || false
          });
        }
      } catch (e) {
        console.error("Error fetching config", e);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (view === "voting") {
      const fetchVotingData = async () => {
        setVotingLoading(true);
        try {
          // get candidates
          const candSnap = await getDocs(collection(db, "candidates"));
          const candList = candSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
          setCandidates(candList);

          // get votes audit
          const auditSnap = await getDocs(collection(db, "votes_audit"));
          const auditList = auditSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setVotesAudit(auditList);

          // get votes ballot
          const ballotSnap = await getDocs(collection(db, "votes_ballot"));
          const ballots = ballotSnap.docs.map(doc => doc.data());
          setTotalVotes(ballots.length);

          const counts: { [id: string]: number } = {};
          ballots.forEach(b => {
            counts[b.candidateId] = (counts[b.candidateId] || 0) + 1;
          });
          setVoteCountMap(counts);
        } catch (e) {
          console.error("Error fetching voting data:", e);
        } finally {
          setVotingLoading(false);
        }
      };
      
      fetchVotingData();
    }
  }, [view]);

  useEffect(() => {
    let unsub = () => {};
    if (view === "attachments") {
      setAttachmentsLoading(true);
      const q = collection(db, "group_attachments");
      unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupAttachment));
        // Sort by date descending
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAttachments(list);
        setAttachmentsLoading(false);
      }, (err) => {
        console.error("Error loading attachments", err);
        setAttachmentsLoading(false);
      });
    }
    return () => unsub();
  }, [view]);

  useEffect(() => {
    let unsub = () => {};
    if (view === "questionnaires") {
      setQuestionnairesLoading(true);
      const q = collection(db, "responses_questionnaire");
      unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionnaireResponse));
        // Sort by date descending
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setQuestionnaires(list);
        setQuestionnairesLoading(false);
      }, (err) => {
        console.error("Error loading questionnaires", err);
        setQuestionnairesLoading(false);
      });
    }
    return () => unsub();
  }, [view]);

  const addCandidate = async () => {
    if (!newCandidate.firstName || !newCandidate.lastName) {
      alert("Por favor ingrese nombre y apellido del candidato.");
      return;
    }
    try {
      await addDoc(collection(db, "candidates"), {
        firstName: newCandidate.firstName,
        lastName: newCandidate.lastName,
        photo: candidatePhoto,
        createdAt: new Date().toISOString()
      });
      
      // refresh candidate list
      const candSnap = await getDocs(collection(db, "candidates"));
      const candList = candSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
      setCandidates(candList);
      
      setNewCandidate({ firstName: "", lastName: "" });
      setCandidatePhoto("");
      alert("Candidato agregado correctamente");
    } catch (e) {
      console.error(e);
      alert("Error al cargar candidato");
    }
  };

  const deleteCandidate = async (id: string) => {
    try {
      await deleteDoc(doc(db, "candidates", id));
      setCandidates(candidates.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
      alert("Error al eliminar candidato");
    }
  };

  const deleteAttachment = async (id: string) => {
    try {
      await deleteDoc(doc(db, "group_attachments", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `group_attachments/${id}`);
    }
  };

  const deleteQuestionnaire = async (id: string) => {
    try {
      await deleteDoc(doc(db, "responses_questionnaire", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `responses_questionnaire/${id}`);
    }
  };

  const handleCandidatePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 300) { // Limit to 300KB
      alert("El archivo es demasiado pesado. Máximo 300KB para fotos.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCandidatePhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetAllVotes = async () => {
    try {
      const auditSnap = await getDocs(collection(db, "votes_audit"));
      for (const d of auditSnap.docs) {
        await deleteDoc(doc(db, "votes_audit", d.id));
      }

      const ballotSnap = await getDocs(collection(db, "votes_ballot"));
      for (const d of ballotSnap.docs) {
        await deleteDoc(doc(db, "votes_ballot", d.id));
      }

      setVotesAudit([]);
      setVoteCountMap({});
      setTotalVotes(0);
      alert("¡Votaciones reseteadas con éxito!");
    } catch (e) {
      console.error(e);
      alert("Error al resetear votación");
    }
  };

  const saveConfig = async () => {
    setConfigLoading(true);
    try {
      await updateDoc(doc(db, "config", "global"), config);
      setIsEditingConfig(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, "config/global");
    } finally {
      setConfigLoading(false);
    }
  };

  const updatePaymentStatus = async (id: string, status: Status) => {
    try {
      await updateDoc(doc(db, "payments", id), { status });
      if (viewProof && viewProof.id === id) setViewProof(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `payments/${id}`);
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    try {
      const reg = registrations.find(r => r.id === id);
      await deleteDoc(doc(db, "registrations", id));
      
      const userPayments = payments.filter(p => p.idNumber === reg?.idNumber);
      for (const p of userPayments) {
        await deleteDoc(doc(db, "payments", p.id!));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `registrations/${id}`);
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deleteDoc(doc(db, "payments", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `payments/${id}`);
    }
  };

  const startEditRegistration = (reg: Registration) => {
    setEditingId(reg.id);
    setEditType("registration");
    setEditValues({
      firstName: reg.firstName,
      lastName: reg.lastName,
      idNumber: reg.idNumber,
      email: reg.email,
      scoutGroup: reg.scoutGroup,
      membershipType: reg.membershipType,
      tshirtSize: reg.tshirtSize || "",
    });
  };

  const startEditPayment = (pay: Payment) => {
    setEditingId(pay.id!);
    setEditType("payment");
    setEditValues({
      amount: pay.amount,
      exchangeRate: pay.exchangeRate || 0,
      paymentDate: pay.paymentDate,
    });
  };

  const handleSave = async () => {
    if (!editingId || !editType) return;
    
    try {
      if (editType === "registration") {
        await updateDoc(doc(db, "registrations", editingId), {
          ...editValues,
          validatedBy: `${staffName} (Edit)`
        });
      } else {
        // Recalculate USD if rate or amount changed
        const payment = payments.find(p => p.id === editingId);
        if (payment) {
          let amountUSD = editValues.amount;
          if (payment.paymentMethod === PaymentMethod.TRANSFER && editValues.exchangeRate > 0) {
            amountUSD = editValues.amount / editValues.exchangeRate;
          }
          await updateDoc(doc(db, "payments", editingId), {
            ...editValues,
            amountUSD,
            approvedBy: `${staffName} (Edit)`
          });
        }
      }
      setEditingId(null);
      setEditType(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${editType}s/${editingId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Config Sections */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-primary">
            <Settings className="w-5 h-5" />
            <h3 className="font-bold uppercase text-xs tracking-widest">Maestro</h3>
          </div>
          <button 
            onClick={() => isEditingConfig ? saveConfig() : setIsEditingConfig(true)}
            disabled={configLoading}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold uppercase text-[10px] hover:bg-primary/20 transition-all"
          >
            {configLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isEditingConfig ? <Save className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            <span>{isEditingConfig ? "Guardar" : "Editar"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nombre del Evento</label>
            <input 
              type="text"
              disabled={!isEditingConfig}
              value={config.eventName}
              onChange={e => setConfig({...config, eventName: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Eslogan / Tagline</label>
            <input 
              type="text"
              disabled={!isEditingConfig}
              value={config.headerTagline}
              onChange={e => setConfig({...config, headerTagline: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Link Álbum de Fotos</label>
            <input 
              type="text"
              disabled={!isEditingConfig}
              value={config.photoAlbumUrl}
              onChange={e => setConfig({...config, photoAlbumUrl: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all font-mono"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Descripción del Evento</label>
          <textarea 
            disabled={!isEditingConfig}
            value={config.eventDescription}
            onChange={e => setConfig({...config, eventDescription: e.target.value})}
            className="w-full h-20 px-4 py-3 rounded-2xl border border-gray-100 text-xs outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all resize-none"
            placeholder="Descripción corta..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Costo Evento</label>
            <input 
              type="number"
              disabled={!isEditingConfig}
              value={config.totalCostUSD}
              onChange={e => setConfig({...config, totalCostUSD: parseFloat(e.target.value)})}
              className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Moneda</label>
            <select
              disabled={!isEditingConfig}
              value={config.currency}
              onChange={e => setConfig({...config, currency: e.target.value as "$" | "€"})}
              className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all"
            >
              <option value="$">$ (Dólar)</option>
              <option value="€">€ (Euro)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Fecha Límite</label>
            <input 
              type="date"
              disabled={!isEditingConfig}
              value={config.registrationDeadline}
              onChange={e => setConfig({...config, registrationDeadline: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <p className="text-[10px] text-gray-400 italic">Configure el costo del evento y la moneda.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Instrucciones de Transferencia</label>
            <textarea 
              disabled={!isEditingConfig}
              value={config.bankDetails}
              onChange={e => setConfig({...config, bankDetails: e.target.value})}
              className="w-full h-32 px-4 py-3 rounded-2xl border border-gray-100 text-xs font-mono outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all resize-none"
              placeholder="Datos bancarios..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Instrucciones de Efectivo</label>
            <textarea 
              disabled={!isEditingConfig}
              value={config.cashDetails}
              onChange={e => setConfig({...config, cashDetails: e.target.value})}
              className="w-full h-32 px-4 py-3 rounded-2xl border border-gray-100 text-xs font-mono outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all resize-none"
              placeholder="Instrucciones para pago en efectivo..."
            />
          </div>
        </div>

        {/* Voting System Configuration */}
        <div className="border-t border-gray-100 pt-6 mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-primary uppercase italic tracking-[0.2em] flex items-center space-x-2">
              <Vote className="w-4 h-4 text-primary" />
              <span>Configuración del Sistema de Votación</span>
            </h4>
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Activar Votación:</span>
                <button
                  type="button"
                  disabled={!isEditingConfig}
                  onClick={() => setConfig({ ...config, votingActive: !config.votingActive })}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${config.votingActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {config.votingActive ? 'Visible (SÍ)' : 'Invisible (NO)'}
                </button>
              </div>

              <div className="flex items-center space-x-2 border-l border-gray-200 pl-3">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Resultados Públicos:</span>
                <button
                  type="button"
                  disabled={!isEditingConfig}
                  onClick={() => setConfig({ ...config, showVotingResults: !config.showVotingResults })}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${config.showVotingResults ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {config.showVotingResults ? 'Visible (SÍ)' : 'Invisible (NO)'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Título de la Elección</label>
              <input 
                type="text"
                disabled={!isEditingConfig}
                value={config.votingTitle}
                onChange={e => setConfig({...config, votingTitle: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all"
                placeholder="Ej. Elección del Coordinador Rover"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Pregunta / Propuesta</label>
              <input 
                type="text"
                disabled={!isEditingConfig}
                value={config.votingQuestion}
                onChange={e => setConfig({...config, votingQuestion: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all"
                placeholder="Ej. ¿Quién deseas que sea el representante?"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Cierre de Votación (Fecha/Hora)</label>
              <input 
                type="datetime-local"
                disabled={!isEditingConfig}
                value={config.votingDeadline}
                onChange={e => setConfig({...config, votingDeadline: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 transition-all"
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 block mb-1">Padrón de Membresía Autorizado:</label>
              <div className="flex gap-2">
                {(["Joven", "Adulto", "Ambos"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    disabled={!isEditingConfig}
                    onClick={() => setConfig({ ...config, votingTargetUnit: unit })}
                    className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${config.votingTargetUnit === unit ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {unit === "Ambos" ? "Todos (Jóvenes y Adultos)" : unit}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex bg-gray-50 p-1 rounded-xl w-full lg:w-auto flex-wrap gap-1">
          <button 
            onClick={() => setView("users")}
            className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${view === 'users' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
          >
            <User className="w-3 h-3" />
            <span>Usuarios</span>
          </button>
          <button 
            onClick={() => setView("payments")}
            className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${view === 'payments' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
          >
            <CreditCard className="w-3 h-3" />
            <span>Pagos</span>
          </button>
          <button 
            onClick={() => setView("voting")}
            className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${view === 'voting' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
          >
            <Vote className="w-3 h-3" />
            <span>Votación 🗳️</span>
          </button>
          <button 
            onClick={() => setView("attachments")}
            className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${view === 'attachments' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
          >
            <FileText className="w-3 h-3" />
            <span>Adjuntos Grupo 📁</span>
          </button>
          <button 
            onClick={() => setView("questionnaires")}
            className={`flex-1 lg:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${view === 'questionnaires' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}
          >
            <ClipboardCheck className="w-3 h-3" />
            <span>Cuestionarios 📝</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center space-x-2 text-red-500 italic bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span className="font-bold uppercase text-[8px] md:text-[10px] tracking-widest leading-tight">Borrado omitido por seguridad</span>
          </div>
          <button 
            onClick={onExport}
            className="flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px] hover:bg-black transition-all shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Data</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {view === "users" && (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Participante</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Grupo</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {editingId === reg.id && editType === "registration" ? (
                        <div className="space-y-2 max-w-xs">
                          <input 
                            className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary uppercase font-bold"
                            value={editValues.firstName} 
                            onChange={e => setEditValues({...editValues, firstName: e.target.value})}
                          />
                          <input 
                            className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary uppercase font-bold"
                            value={editValues.lastName} 
                            onChange={e => setEditValues({...editValues, lastName: e.target.value})}
                          />
                          <input 
                            className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary font-mono"
                            value={editValues.idNumber} 
                            onChange={e => setEditValues({...editValues, idNumber: e.target.value})}
                          />
                          <select 
                            className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary uppercase font-bold bg-white"
                            value={editValues.tshirtSize || ""} 
                            onChange={e => setEditValues({...editValues, tshirtSize: e.target.value})}
                          >
                            <option value="">Seleccionar Talla</option>
                            <option value="XS">XS</option>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="XXL">XXL</option>
                          </select>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-gray-900 uppercase text-sm">{reg.firstName} {reg.lastName}</p>
                              <p className="text-xs text-gray-500 font-mono">
                                V-{reg.idNumber} {reg.tshirtSize && `• Talla: ${reg.tshirtSize}`}
                              </p>
                            </div>
                            {reg.validatedBy && (
                              <span className="text-[8px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter self-start mt-0.5">
                                Val: {reg.validatedBy.replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops")}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       {editingId === reg.id && editType === "registration" ? (
                         <select 
                          className="w-full px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary uppercase font-bold bg-white"
                          value={editValues.scoutGroup}
                          onChange={e => setEditValues({...editValues, scoutGroup: e.target.value})}
                         >
                           {["ARISTIDES ROJAS", "BICENTENARIO", "DON BOSCO 21", "HENRI PITTIER", "LA SALLE LA COLINA", "NEPTUNO"].map(g => (
                             <option key={g} value={g}>{g}</option>
                           ))}
                         </select>
                       ) : (
                         <p className="text-xs font-bold text-gray-800 uppercase">{reg.scoutGroup}</p>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                         {editingId === reg.id && editType === "registration" ? (
                           <>
                            <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded-xl" title="Guardar"><Save className="w-5 h-5" /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl" title="Cancelar"><X className="w-5 h-5" /></button>
                           </>
                         ) : (
                           <>
                            <button onClick={() => startEditRegistration(reg)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Editar"><Edit3 className="w-5 h-5" /></button>
                            <button onClick={() => handleDeleteRegistration(reg.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                           </>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === "payments" && (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Cédula</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Monto</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Tasa</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Fecha</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono font-bold">
                      {p.idNumber}
                      {p.approvedBy && (
                        <div className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">
                           Admin: {p.approvedBy.replace("Sistema (Leindenz)", "Sistema Admin").replace("Sistema (Andres)", "Sistema Ops")}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === p.id && editType === "payment" ? (
                        <input 
                          type="number"
                          className="w-24 px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary font-mono"
                          value={editValues.amount} 
                          onChange={e => setEditValues({...editValues, amount: parseFloat(e.target.value)})}
                        />
                      ) : (
                        <p className="text-xs font-bold">{p.amount} {p.paymentMethod === PaymentMethod.TRANSFER ? "Bs" : "$"}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === p.id && editType === "payment" ? (
                        <input 
                          type="number"
                          className="w-24 px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary font-mono"
                          value={editValues.exchangeRate} 
                          onChange={e => setEditValues({...editValues, exchangeRate: parseFloat(e.target.value)})}
                        />
                      ) : (
                        <p className="text-xs text-gray-500">{p.exchangeRate || "-"}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       {editingId === p.id && editType === "payment" ? (
                        <input 
                          type="date"
                          className="w-32 px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-primary"
                          value={editValues.paymentDate} 
                          onChange={e => setEditValues({...editValues, paymentDate: e.target.value})}
                        />
                      ) : (
                        <p className="text-xs">{p.paymentDate}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                         {editingId === p.id && editType === "payment" ? (
                           <>
                            <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded-xl" title="Guardar"><Save className="w-5 h-5" /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl" title="Cancelar"><X className="w-5 h-5" /></button>
                           </>
                         ) : (
                           <>
                            {p.proofUrl && <button onClick={() => setViewProof(p)} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all" title="Ver Comprobante"><Eye className="w-5 h-5" /></button>}
                            <button onClick={() => startEditPayment(p)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all" title="Editar"><Edit3 className="w-5 h-5" /></button>
                            <button onClick={() => handleDeletePayment(p.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Eliminar"><Trash2 className="w-5 h-5" /></button>
                           </>
                         )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Voting View Panel */}
          {view === "voting" && (
            <div className="p-6 md:p-8 space-y-8">
              {/* 1. Header with Reset Votes */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-55 p-4 rounded-2xl border border-gray-100 gap-4">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 uppercase italic">Control Electoral del Evento</h3>
                  <p className="text-xs text-gray-400">Configura candidatos, monitorea el padrón electoral secreto y sigue resultados oficiales.</p>
                </div>
                <button
                  type="button"
                  onClick={resetAllVotes}
                  className="flex items-center space-x-2 bg-red-50 hover:bg-red-100 font-bold uppercase text-[10px] text-red-600 px-4 py-2 rounded-xl border border-red-100 cursor-pointer transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reiniciar Votaciones</span>
                </button>
              </div>

              {votingLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="animate-spin w-8 h-8 text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                  {/* Left Column (2/3 width on desktop): Results, Candidates & Audit Log */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Results Chart */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                      <div>
                        <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Resultados Oficiales</span>
                        <h4 className="text-xl font-black text-gray-900 uppercase italic leading-none">{config.votingTitle || "Elección sin Título"}</h4>
                        <p className="text-xs text-gray-400 mt-1">{config.votingQuestion || "¿Quién es tu candidato de elección?"}</p>
                      </div>

                      {candidates.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-xs uppercase font-medium">No hay candidatos cargados para calcular resultados.</div>
                      ) : (
                        <div className="space-y-4">
                          {(() => {
                            const eligibleDelegatesCount = registrations.filter(r => {
                              if (r.votingRole !== "Delegado") return false;
                              if (r.opsStatus !== Status.APPROVED) return false;
                              if (config.votingTargetUnit && config.votingTargetUnit !== "Ambos") {
                                if (r.membershipType !== config.votingTargetUnit) return false;
                              }
                              return true;
                            }).length;
                            const pct = eligibleDelegatesCount > 0 ? (totalVotes / eligibleDelegatesCount) * 100 : 0;

                            return (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest pl-1">Votantes Habilitados (Delegados)</p>
                                  <p className="text-2xl font-black font-mono text-primary mt-1">
                                    {eligibleDelegatesCount}
                                  </p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                  <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest pl-1">Votos Emitidos</p>
                                  <p className="text-2xl font-black font-mono text-green-700 mt-1">{totalVotes}</p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 col-span-2 md:col-span-1">
                                  <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest pl-1">Nivel de Participación</p>
                                  <p className="text-2xl font-black font-mono text-amber-700 mt-1">{pct.toFixed(1)}%</p>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="space-y-3">
                            {candidates.map((cand) => {
                              const votes = voteCountMap[cand.id] || 0;
                              const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                              return (
                                <div key={cand.id} className="space-y-1.5 p-3 rounded-2xl border border-gray-50 hover:bg-gray-50/50 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      {cand.photo ? (
                                        <img src={cand.photo} className="w-8 h-8 rounded-full object-cover border" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                                          {cand.firstName[0]}
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-xs font-bold text-gray-900 uppercase">{cand.firstName} {cand.lastName}</p>
                                        <p className="text-[9px] text-gray-400 font-mono italic">ID Ref: {cand.id}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-black text-gray-900 font-mono">{votes} votos</span>
                                      <span className="text-[10px] text-gray-400 pl-2 font-mono">({pct.toFixed(1)}%)</span>
                                    </div>
                                  </div>
                                  {/* Percentage Bar */}
                                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-primary h-full transition-all duration-500 rounded-full"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Audit Log */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                      <div>
                        <span className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] flex items-center space-x-1.5">
                          <ShieldAlert className="w-4 h-4" />
                          <span>Bitácora de Auditoría Electoral</span>
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          Auditoría de electores que han firmado su papeleta digital. Los votos en la urna electrónica son anónimos, pero el registro de votantes garantiza que no ocurra doble votación.
                        </p>
                      </div>

                      {votesAudit.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-xs uppercase font-medium">Nadie ha votado en este proceso todavía.</div>
                      ) : (
                        <div className="overflow-x-auto max-h-60 overflow-y-auto border border-gray-50 rounded-2xl">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                              <tr>
                                <th className="px-4 py-3 border-b">Elector Habilitado</th>
                                <th className="px-4 py-3 border-b">Cédula</th>
                                <th className="px-4 py-3 border-b">Grupo Scout</th>
                                <th className="px-4 py-3 border-b text-right">Fecha/Hora</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {votesAudit.map((audit) => (
                                <tr key={audit.id} className="text-xs hover:bg-gray-50/50">
                                  <td className="px-4 py-3 uppercase font-bold text-gray-800">{audit.name || "Elector Registrado"}</td>
                                  <td className="px-4 py-3 font-mono text-gray-500">V-{audit.idNumber}</td>
                                  <td className="px-4 py-3 text-gray-600 uppercase font-black text-[9px]">{audit.scoutGroup}</td>
                                  <td className="px-4 py-3 text-right text-gray-400 text-[10px] font-mono">
                                    {audit.votedAt ? new Date(audit.votedAt).toLocaleString() : "N/A"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (1/3 width): Add Candidate & Candidate List */}
                  <div className="space-y-8">
                    {/* Create Candidate */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-sm font-black text-gray-900 uppercase italic">Agregar Nuevo Candidato</h4>
                        <p className="text-[10px] text-gray-400">Registra un participante oficial para aparecer en la cédula electoral.</p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Primer Nombre</label>
                          <input 
                            type="text"
                            value={newCandidate.firstName}
                            onChange={e => setNewCandidate({...newCandidate, firstName: e.target.value})}
                            className="w-full px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Ej. María"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Primer Apellido</label>
                          <input 
                            type="text"
                            value={newCandidate.lastName}
                            onChange={e => setNewCandidate({...newCandidate, lastName: e.target.value})}
                            className="w-full px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Ej. Gonzalez"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">Foto / Retrato (Max 300KB)</label>
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={handleCandidatePhotoChange}
                            className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-primary/5 file:text-primary hover:file:bg-primary/10 file:cursor-pointer"
                          />
                        </div>

                        {candidatePhoto && (
                          <div className="flex items-center justify-center p-2 border border-gray-100 rounded-2xl bg-gray-50 relative group">
                            <img src={candidatePhoto} className="w-20 h-20 object-cover rounded-full border shadow" />
                            <button 
                              type="button"
                              onClick={() => setCandidatePhoto("")}
                              className="absolute top-1 right-1 p-1 bg-white border rounded-full text-red-500 shadow hover:bg-gray-50"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={addCandidate}
                          className="w-full bg-primary text-white py-2 rounded-xl font-bold uppercase text-xs hover:bg-primary-dark transition-all mt-2 cursor-pointer"
                        >
                          Registrar
                        </button>
                      </div>
                    </div>

                    {/* Candidates List */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                      <h4 className="text-sm font-black text-gray-900 uppercase italic">Padrón de Candidatos ({candidates.length})</h4>
                      
                      {candidates.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-xs uppercase font-medium">No se han registrado candidatos oficiales.</div>
                      ) : (
                        <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto space-y-2">
                          {candidates.map((cand) => (
                            <div key={cand.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                              <div className="flex items-center space-x-3">
                                {cand.photo ? (
                                  <img src={cand.photo} className="w-10 h-10 rounded-full object-cover border" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                    {cand.firstName[0]}
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-bold text-gray-900 uppercase">{cand.firstName} {cand.lastName}</p>
                                  <p className="text-[10px] text-gray-400">Candidato</p>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => deleteCandidate(cand.id)}
                                className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                title="Eliminar candidato"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {view === "attachments" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-sm text-gray-900 uppercase italic">Archivos y Documentos Adjuntos por Grupo Scout</h3>
              <p className="text-xs text-gray-400">Consulta los informes, listados o constancias cargadas por cada Grupo Scout para el evento.</p>
            </div>
            <div className="bg-indigo-50 text-indigo-750 px-4 py-2 rounded-2xl border border-indigo-150 font-bold text-xs uppercase">
              Total Adjuntados: {attachments.length}
            </div>
          </div>

          {attachmentsLoading ? (
            <div className="flex justify-center items-center py-24 bg-white rounded-3xl border">
              <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
          ) : attachments.length === 0 ? (
            <div className="p-16 text-center bg-white border border-gray-100 rounded-3xl">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-gray-800">No hay archivos adjuntos aún</h4>
              <p className="text-sm text-gray-400 mt-1">Cuando los grupos carguen sus documentos PDF o Imágenes, aparecerán aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {attachments.map((att) => (
                <div key={att.id} className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-wider">
                      {att.scoutGroup}
                    </span>
                    <div className="flex items-start space-x-3">
                      <div className="bg-red-50 p-2.5 rounded-xl text-red-500 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate" title={att.fileName}>{att.fileName}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">{att.fileType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400 font-bold uppercase">
                      {new Date(att.createdAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex items-center space-x-2">
                      <a
                        href={att.fileData}
                        download={att.fileName}
                        className="flex items-center space-x-1.5 bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>Descargar</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteAttachment(att.id!)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-100"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "questionnaires" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header & Download Options */}
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-150 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] bg-primary/10 text-primary font-black uppercase px-3 py-1 rounded-full tracking-wider">
                Evaluaciones de Calidad 📝
              </span>
              <h3 className="font-black text-lg text-gray-900 uppercase italic mt-2">Respuestas de Cuestionarios COCORO</h3>
              <p className="text-xs text-gray-400">Analiza las evaluaciones detalladas de cada elemento del evento y descarga el reporte en formato CSV.</p>
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

          {questionnairesLoading ? (
            <div className="flex justify-center items-center py-24 bg-white rounded-3xl border">
              <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
          ) : questionnaires.length === 0 ? (
            <div className="p-16 text-center bg-white border border-gray-100 rounded-3xl">
              <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-gray-800">No hay cuestionarios cargados</h4>
              <p className="text-sm text-gray-400 mt-1">Las evaluaciones anónimas presentadas por los participantes se reflejarán instantáneamente en este panel.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary stats */}
              {(() => {
                const total = questionnaires.length;
                const keys: Array<"ratingSchedule" | "ratingFood" | "ratingCocoro" | "ratingLocation" | "ratingCommunication" | "ratingChallenge" | "ratingTeamwork" | "ratingMystique" | "ratingPrice" | "ratingDiscussions"> = [
                  "ratingSchedule", "ratingFood", "ratingCocoro", "ratingLocation", "ratingCommunication",
                  "ratingChallenge", "ratingTeamwork", "ratingMystique", "ratingPrice", "ratingDiscussions"
                ];

                const globalSum = questionnaires.reduce((acc, q) => {
                  let sum = 0;
                  keys.forEach(k => sum += (q[k] || 0));
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
                      <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-500 font-mono text-xs uppercase font-bold">
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
                      const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                      return { starNum, count, pct };
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
                                    style={{ width: `${starStat.pct}%` }}
                                  />
                                </div>
                                <span className="w-12 text-right text-gray-400 font-bold font-mono">
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
                  Listado de Cuestionarios y Retroalimentación Directa 📝
                </h4>
                
                <div className="space-y-4">
                  {questionnaires.map((res, index) => {
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
                      <div key={res.id || `eval_item_${index}`} className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-150 shadow-sm text-left relative group">
                        <button
                          type="button"
                          onClick={() => deleteQuestionnaire(res.id!)}
                          className="absolute top-6 right-6 p-2 text-red-450 hover:text-red-700 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-transparent hover:border-red-100"
                          title="Eliminar reporte de evaluación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

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
                                <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider block">{k.label}</span>
                                <span className="font-mono text-sm font-black text-gray-900 mt-1 flex items-center gap-1">
                                  {val} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 inline" />
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {res.whatLiked && (
                          <div className="mt-4 p-4 rounded-2xl border bg-emerald-50/10 border-emerald-50">
                            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-800">Lo que más le gustó del evento:</p>
                            <p className="text-sm text-gray-700 mt-1 leading-relaxed">{res.whatLiked}</p>
                          </div>
                        )}

                        {res.whatImprove && (
                          <div className="mt-4 p-4 rounded-2xl border bg-amber-50/10 border-amber-50">
                            <p className="text-[10px] font-black uppercase tracking-wide text-amber-800 font-bold">Aspectos a mejorar para futuros eventos:</p>
                            <p className="text-sm text-gray-700 mt-1 leading-relaxed">{res.whatImprove}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Proof Viewing Modal */}
      {viewProof && (
        <ProofViewer 
          payment={viewProof} 
          onClose={() => setViewProof(null)} 
          onApprove={(id) => updatePaymentStatus(id, Status.APPROVED)} 
          onReject={(id) => updatePaymentStatus(id, Status.REJECTED)} 
        />
      )}
    </div>
  );
}
