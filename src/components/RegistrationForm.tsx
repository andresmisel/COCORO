import React, { useState, useEffect } from "react";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { MembershipType, Status, PaymentMethod } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { Loader2, CheckCircle2, ChevronLeft, CreditCard, Banknote } from "lucide-react";

const SCOUT_GROUPS = [
  "ARISTIDES ROJAS",
  "BICENTENARIO",
  "DON BOSCO 21",
  "HENRI PITTIER",
  "LA SALLE LA COLINA",
  "NEPTUNO"
];

interface Props {
  onBack: () => void;
}

export default function RegistrationForm({ onBack }: Props) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    idNumber: "",
    email: "",
    membershipType: MembershipType.JOVEN,
    scoutGroup: "",
    bankReference: "",
    receiptNumber: "",
    paymentMethod: PaymentMethod.TRANSFER,
    exchangeRate: "",
    amount: "",
    paymentDate: new Date().toISOString().split('T')[0],
  });
  
  const [config, setConfig] = useState({ bankDetails: "Cargando...", cashDetails: "Cargando..." });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofData, setProofData] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "global"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          setConfig({
            bankDetails: data.bankDetails || "Datos de pago no disponibles.",
            cashDetails: data.cashDetails || "Pago en efectivo coordinado con el Jefe de Clan o Tesorería del evento."
          });
        } else {
          setConfig({
            bankDetails: "Datos de pago no disponibles.",
            cashDetails: "Pago en efectivo coordinado con el Jefe de Clan o Tesorería del evento."
          });
        }
      } catch (e) {
        console.error("Error fetching config", e);
      }
    };
    fetchConfig();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 800) { // Limit to 800KB due to Firestore 1MB limit
      setError("El archivo es muy pesado. Máximo 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProofData(event.target?.result as string);
      setProofName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.scoutGroup) {
      setError("Por favor seleccione un Grupo Scout.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        exchangeRate: formData.exchangeRate ? parseFloat(formData.exchangeRate) : undefined,
        adminStatus: Status.PENDING,
        opsStatus: Status.PENDING,
        proofUrl: proofData || "",
        proofName: proofName || "",
        checkedIn: false,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "registrations"), data);
      setSubmitted(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "registrations");
      setError("Hubo un error al procesar su solicitud. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-6">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
        <h2 className="text-3xl font-bold text-gray-900 uppercase italic">¡Datos Recibidos!</h2>
        <p className="text-gray-600">
          Su información ha sido registrada correctamente. Nuestro equipo administrativo verificará su pago y validación institucional.
        </p>
        <p className="font-medium text-primary">
          Puede consultar el status de su inscripción en la sección "Consultar" usando su número de cédula.
        </p>
        <button 
          onClick={onBack}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold uppercase hover:bg-primary-dark transition-all"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl space-y-8">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-400" />
        </button>
        <h2 className="text-3xl font-bold text-gray-900 uppercase italic tracking-tight">Registro de Participante</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Nombres</label>
            <input
              required
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej. Juan Andrés"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Apellidos</label>
            <input
              required
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej. Pérez García"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Cédula</label>
            <input
              required
              type="text"
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Ej. 12345678"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Correo Electrónico</label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="correo@ejemplo.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Tipo de Membresía</label>
            <select
              value={formData.membershipType}
              onChange={(e) => setFormData({ ...formData, membershipType: e.target.value as MembershipType })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none bg-white font-medium"
            >
              <option value={MembershipType.JOVEN}>Joven</option>
              <option value={MembershipType.ADULTO}>Adulto</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Grupo Scout</label>
            <select
              required
              value={formData.scoutGroup}
              onChange={(e) => setFormData({ ...formData, scoutGroup: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none bg-white font-medium"
            >
              <option value="" disabled>Seleccionar Grupo</option>
              {SCOUT_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-primary">
              <CreditCard className="w-5 h-5" />
              <h3 className="font-bold uppercase text-sm tracking-widest">Información de Pago</h3>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: PaymentMethod.TRANSFER })}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${formData.paymentMethod === PaymentMethod.TRANSFER ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Transferencia
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: PaymentMethod.CASH })}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${formData.paymentMethod === PaymentMethod.CASH ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Efectivo
              </button>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-primary/20 text-sm font-mono whitespace-pre-wrap">
            {formData.paymentMethod === PaymentMethod.TRANSFER ? config.bankDetails : config.cashDetails}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
            {formData.paymentMethod === PaymentMethod.TRANSFER ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-primary uppercase">Referencia</label>
                  <input
                    required
                    type="text"
                    value={formData.bankReference}
                    onChange={(e) => setFormData({ ...formData, bankReference: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                    placeholder="123456"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-primary uppercase">Tasa (Bs)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.exchangeRate}
                    onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-primary uppercase">Número de Recibo</label>
                <input
                  required
                  type="text"
                  value={formData.receiptNumber}
                  onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                  placeholder="Ej. R-001"
                />
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-primary uppercase">
                Monto ({formData.paymentMethod === PaymentMethod.TRANSFER ? 'Bs' : '$'})
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-primary uppercase">Fecha</label>
              <input
                required
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none transition-all"
              />
            </div>
          </div>

        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Adjuntar Comprobante (Máximo 800KB)</label>
            <input 
              type="file"
              onChange={handleFileChange}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
              accept="image/png, image/jpeg, image/jpg"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>Enviar Registro</span>
          )}
        </button>
      </form>
    </div>
  );
}
