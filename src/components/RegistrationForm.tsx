import React, { useState, useEffect } from "react";
import { collection, addDoc, doc, getDoc, query, where, getDocs, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { MembershipType, Status, PaymentMethod, Config } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { Loader2, CheckCircle2, ChevronLeft, CreditCard, Banknote, UserPlus, AlertCircle, Stethoscope, HeartPulse } from "lucide-react";

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
    medical: {
      bloodType: "",
      weight: "",
      height: "",
      allergies: "",
      intolerances: "",
      disability: {
        has: false,
        description: ""
      },
      antecedents: "",
      medications: "",
      emergencyContactName: "",
      emergencyContactPhone: ""
    }
  });
  
  const [medicalAlreadyExists, setMedicalAlreadyExists] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofData, setProofData] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [userExists, setUserExists] = useState(false);
  const [totalApprovedUSD, setTotalApprovedUSD] = useState(0);
  const [deadlinePassed, setDeadlinePassed] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "global"));
        if (configDoc.exists()) {
          const data = configDoc.data() as Config;
          setConfig(data);
          
          if (data.registrationDeadline) {
            const deadline = new Date(data.registrationDeadline);
            if (new Date() > deadline) {
              setDeadlinePassed(true);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching config", e);
      }
    };
    fetchConfig();
  }, []);

  const checkUserExists = async (id: string) => {
    if (!id || id.length < 5) return;
    setCheckingUser(true);
    try {
      // Check Registration
      const q = query(collection(db, "registrations"), where("idNumber", "==", id));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        setFormData(prev => ({
          ...prev,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          membershipType: userData.membershipType,
          scoutGroup: userData.scoutGroup,
          medical: userData.medicalData || {
            bloodType: "",
            weight: "",
            height: "",
            allergies: "",
            intolerances: "",
            disability: { has: false, description: "" },
            antecedents: "",
            medications: "",
            emergencyContactName: "",
            emergencyContactPhone: ""
          }
        }));
        setUserExists(true);
        if (userData.medicalData && userData.medicalData.bloodType) {
          setMedicalAlreadyExists(true);
        } else {
          setMedicalAlreadyExists(false);
        }

        // Check total approved payments
        const qPay = query(collection(db, "payments"), where("idNumber", "==", id), where("status", "==", Status.APPROVED));
        const paySnap = await getDocs(qPay);
        const total = paySnap.docs.reduce((acc, d) => acc + (d.data().amountUSD || 0), 0);
        setTotalApprovedUSD(total);
      } else {
        setUserExists(false);
        setTotalApprovedUSD(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingUser(false);
    }
  };

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

    if (deadlinePassed && !userExists) {
      setError("El periodo de inscripciones ha finalizado.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isPaymentComplete = config && totalApprovedUSD >= config.totalCostUSD;

      if (!isPaymentComplete) {
        const amountValue = parseFloat(formData.amount);
        if (isNaN(amountValue) || amountValue <= 0) {
          setError("Por favor ingrese un monto válido.");
          setLoading(false);
          return;
        }

        let amountUSD = 0;

        if (formData.paymentMethod === PaymentMethod.CASH) {
          amountUSD = amountValue;
        } else {
          const rate = parseFloat(formData.exchangeRate);
          if (isNaN(rate) || rate <= 0) {
            setError("Por favor ingrese una tasa de cambio válida para reportar transferencias.");
            setLoading(false);
            return;
          }
          amountUSD = amountValue / rate;
        }
        
        if (!formData.bankReference && formData.paymentMethod === PaymentMethod.TRANSFER) {
          setError("La referencia bancaria es obligatoria para transferencias.");
          setLoading(false);
          return;
        }

        if (!formData.receiptNumber && formData.paymentMethod === PaymentMethod.CASH) {
          setError("El número de recibo es obligatorio para pagos en efectivo.");
          setLoading(false);
          return;
        }

        // Add Payment record
        const paymentData = {
          idNumber: formData.idNumber,
          paymentMethod: formData.paymentMethod,
          bankReference: formData.bankReference || "",
          receiptNumber: formData.receiptNumber || "",
          exchangeRate: formData.exchangeRate ? parseFloat(formData.exchangeRate) : 0,
          amount: amountValue,
          amountUSD: amountUSD,
          paymentDate: formData.paymentDate,
          proofUrl: proofData || "",
          proofName: proofName || "",
          status: Status.PENDING,
          createdAt: new Date().toISOString(),
        };

        await addDoc(collection(db, "payments"), paymentData);
      }

      // 1. Ensure Participant exists or update medical
      const userRef = query(collection(db, "registrations"), where("idNumber", "==", formData.idNumber));
      const userSnap = await getDocs(userRef);
      
      if (userSnap.empty && !userExists) {
        // Double check scoutGroup before creating
        if (!formData.scoutGroup) {
          setError("Por favor seleccione un Grupo Scout.");
          setLoading(false);
          return;
        }

        await addDoc(collection(db, "registrations"), {
          firstName: formData.firstName,
          lastName: formData.lastName,
          idNumber: formData.idNumber,
          email: formData.email,
          membershipType: formData.membershipType,
          scoutGroup: formData.scoutGroup,
          medicalData: formData.medical,
          opsStatus: Status.PENDING,
          checkedIn: false,
          createdAt: new Date().toISOString(),
        });
      } else if (userSnap.docs.length > 0) {
        // Update medical data if it was missing or being added now
        const docId = userSnap.docs[0].id;
        if (!medicalAlreadyExists) {
          await setDoc(doc(db, "registrations", docId), {
            medicalData: formData.medical
          }, { merge: true });
        }
      }

      setSubmitted(true);
    } catch (e) {
      console.error("Submission error:", e);
      handleFirestoreError(e, OperationType.CREATE, "payments");
      setError("Hubo un error al procesar su solicitud. Por favor intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (deadlinePassed && !userExists) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-6">
        <AlertCircle className="w-20 h-20 text-amber-500 mx-auto" />
        <h2 className="text-3xl font-bold text-gray-900 uppercase italic">Inscripciones Cerradas</h2>
        <p className="text-gray-600">
          Lo sentimos, la fecha límite para nuevas inscripciones ha pasado ({config?.registrationDeadline && new Date(config.registrationDeadline).toLocaleDateString()}).
        </p>
        <p className="font-medium text-primary">
          Si ya estás inscrito y necesitas reportar una cuota adicional, por favor ingresa tu cédula a continuación para continuar.
        </p>
        <div className="space-y-4 max-w-xs mx-auto">
          <input
            type="text"
            placeholder="Introduce tu Cédula"
            onChange={(e) => {
              if (e.target.value.length >= 6) checkUserExists(e.target.value);
            }}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center font-bold"
          />
          <button 
            onClick={onBack}
            className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold uppercase"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const isPaymentComplete = config && totalApprovedUSD >= config.totalCostUSD;
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-6">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
        <h2 className="text-3xl font-bold text-gray-900 uppercase italic">{isPaymentComplete ? "¡Datos Actualizados!" : "¡Pago Reportado!"}</h2>
        <p className="text-gray-600">
          {isPaymentComplete 
            ? "Su ficha médica ha sido actualizada correctamente. No requiere reportar más pagos ya que su inscripción está solvente."
            : `Su reporte de pago ha sido recibido y será procesado por nuestro equipo administrativo.${userExists ? " Se ha añadido un nuevo abono a su perfil." : " Su perfil ha sido creado exitosamente con este primer pago."}`}
        </p>
        <p className="font-medium text-primary">
          Puede consultar su status en la sección correspondiente usando su cédula.
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

  const isPaymentComplete = config && userExists && totalApprovedUSD >= config.totalCostUSD;
  const showPaymentSection = !isPaymentComplete;
  const showForm = !isPaymentComplete || !medicalAlreadyExists;

  if (isPaymentComplete && medicalAlreadyExists) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-6">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
        <h2 className="text-3xl font-bold text-gray-900 uppercase italic">¡Proceso Completado!</h2>
        <p className="text-gray-600">
          Usted ya ha completado el 100% de su pago y su ficha médica está registrada. No es necesario realizar más acciones.
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
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 uppercase italic tracking-tight">
          {isPaymentComplete ? "Completar Datos Faltantes" : userExists ? "Reportar Nueva Cuota" : "Registro y Primer Pago"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Section */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-primary border-b border-primary/10 pb-2">
            <UserPlus className="w-5 h-5" />
            <h3 className="font-bold uppercase text-sm tracking-widest">Datos Personales</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Cédula</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, idNumber: val });
                    if (val.length >= 6) checkUserExists(val);
                  }}
                  className={`w-full px-4 py-3 rounded-xl border ${userExists ? 'border-green-500 bg-green-50' : 'border-gray-200'} focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all`}
                  placeholder="Ej. 12345678"
                />
                {checkingUser && (
                  <div className="absolute right-3 top-3 px-2 py-1 bg-white rounded-md shadow-sm flex items-center">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </div>
                )}
              </div>
              {userExists && <p className="text-[10px] text-green-600 font-bold uppercase mt-1 px-1">Usuario encontrado - Reportando nueva cuota</p>}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Correo Electrónico</label>
              <input
                required
                disabled={userExists}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:bg-gray-50"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          {!userExists && (
            <>
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
            </>
          )}
        </div>

        {/* Medical Section - Only show if not already exists */}
        {!medicalAlreadyExists && (
          <div className="space-y-6 bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
            <div className="flex items-center space-x-2 text-amber-600 border-b border-amber-100 pb-2">
              <Stethoscope className="w-5 h-5" />
              <h3 className="font-bold uppercase text-sm tracking-widest">Ficha Médica (Obligatoria)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Tipo de Sangre</label>
                <select
                  required
                  value={formData.medical.bloodType}
                  onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, bloodType: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="">Seleccionar Tipo</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Peso (kg)</label>
                <input
                  required
                  type="text"
                  value={formData.medical.weight}
                  onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, weight: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all bg-white"
                  placeholder="Ej. 70"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Estatura (cm)</label>
                <input
                  required
                  type="text"
                  value={formData.medical.height}
                  onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, height: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all bg-white"
                  placeholder="Ej. 175"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Alergias</label>
                <input
                  required
                  type="text"
                  value={formData.medical.allergies}
                  onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, allergies: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all bg-white"
                  placeholder="Ej. Penicilina (o NINGUNA)"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Intolerancias Alimenticias</label>
                <input
                  required
                  type="text"
                  value={formData.medical.intolerances}
                  onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, intolerances: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all bg-white"
                  placeholder="Ej. Lactosa, Gluten (o NINGUNA)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">¿Tiene alguna Discapacidad?</label>
                <div className="flex space-x-4 pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={formData.medical.disability?.has === true}
                      onChange={() => setFormData({ ...formData, medical: { ...formData.medical, disability: { ...formData.medical.disability!, has: true } } })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium">Sí</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={formData.medical.disability?.has === false}
                      onChange={() => setFormData({ ...formData, medical: { ...formData.medical, disability: { has: false, description: "" } } })}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium">No</span>
                  </label>
                </div>
                {formData.medical.disability?.has && (
                  <input
                    required
                    type="text"
                    value={formData.medical.disability.description}
                    onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, disability: { ...formData.medical.disability!, description: e.target.value } } })}
                    className="mt-2 w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none text-xs bg-white"
                    placeholder="Especifique la discapacidad"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Antecedentes Médicos</label>
                <input
                  required
                  type="text"
                  value={formData.medical.antecedents}
                  onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, antecedents: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all bg-white"
                  placeholder="Ej. Asma, Diabetes (o NINGUNA)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Medicamentos Actuales</label>
                <input
                  required
                  type="text"
                  value={formData.medical.medications}
                  onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, medications: e.target.value } })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all bg-white"
                  placeholder="Cualquier medicamento recurrente"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Contacto de Emergencia</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    type="text"
                    value={formData.medical.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, emergencyContactName: e.target.value } })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none text-xs bg-white"
                    placeholder="Nombre"
                  />
                  <input
                    required
                    type="tel"
                    value={formData.medical.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, emergencyContactPhone: e.target.value } })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 outline-none text-xs bg-white"
                    placeholder="Teléfono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Section */}
        {showPaymentSection && (
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-primary">
                <CreditCard className="w-5 h-5" />
                <h3 className="font-bold uppercase text-sm tracking-widest">Información de Cuota</h3>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: PaymentMethod.TRANSFER })}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${formData.paymentMethod === PaymentMethod.TRANSFER ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Transferencia
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, paymentMethod: PaymentMethod.CASH })}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${formData.paymentMethod === PaymentMethod.CASH ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Efectivo
                </button>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-primary/20 text-sm font-mono whitespace-pre-wrap">
              {formData.paymentMethod === PaymentMethod.TRANSFER ? config?.bankDetails : config?.cashDetails || "Cargando..."}
            </div>

            {config && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-xl border border-primary/10 flex flex-col items-center justify-center space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Abonado</span>
                  <span className="text-sm font-black text-green-600 font-mono">${totalApprovedUSD.toFixed(2)}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-primary/10 flex flex-col items-center justify-center space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Pendiente</span>
                  <span className="text-sm font-black text-primary font-mono">${Math.max(0, config.totalCostUSD - totalApprovedUSD).toFixed(2)}</span>
                </div>
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const nextPhase = config.phases?.find(p => {
                    const phaseDate = new Date(p.date);
                    // Consider it upcoming if it's today or in the future
                    return phaseDate >= today && totalApprovedUSD < p.minAmount;
                  });
                  
                  if (nextPhase) {
                    return (
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex flex-col items-center justify-center space-y-1 col-span-2 sm:col-span-1 shadow-sm">
                        <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">Mín. {nextPhase.name}</span>
                        <span className="text-sm font-black text-amber-700 font-mono">${nextPhase.minAmount.toFixed(2)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
            
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
        )}

        {isPaymentComplete && (
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center space-x-4">
            <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-green-900 uppercase">Pago de Inscripción Solventado</p>
              <p className="text-xs text-green-700">Ya has cubierto el monto total del evento (${totalApprovedUSD.toFixed(2)}). Solo debes completar los datos faltantes si aplica.</p>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

        <button
          disabled={loading || checkingUser}
          type="submit"
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>{isPaymentComplete ? "Actualizar Ficha Médica" : userExists ? "Reportar Cuota" : "Enviar Registro"}</span>
          )}
        </button>
      </form>
    </div>
  );
}
