import React, { useState, useEffect } from "react";
import { ChevronLeft, UserPlus, CreditCard, Loader2, Save } from "lucide-react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from "firebase/firestore";
import { Config, MembershipType, PaymentMethod, Status } from "../types";
import RegisterFormOnly from "./RegisterFormOnly";
import ReportPaymentForm from "./ReportPaymentForm";

interface Props {
  onBack: () => void;
  initialMode: "register" | "payment";
  onSwitchMode: (mode: "register" | "payment") => void;
}

export default function RegistrationForm({ onBack, initialMode, onSwitchMode }: Props) {
  const [mode, setMode] = useState<"register" | "payment">(initialMode);
  
  // Large form state
  const [formData, setFormData] = useState<any>({
    firstName: "", lastName: "", idNumber: "", email: "", membershipType: MembershipType.JOVEN,
    scoutGroup: "", tshirtSize: "", bankReference: "", receiptNumber: "",
    paymentMethod: PaymentMethod.TRANSFER, exchangeRate: "", amount: "", amountUSD: "",
    paymentDate: new Date().toISOString().split('T')[0],
    bloodType: "", weight: "", height: "",
    allergies: "", foodIntolerances: "", disability: "No", disabilityDetails: "",
    medicalHistory: "", currentMedications: "", emergencyName: "", emergencyPhone: ""
  });
  
  const [userExists, setUserExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [totalApprovedUSD, setTotalApprovedUSD] = useState(0);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const fetchConfig = async () => {
      const configDoc = await getDoc(doc(db, "config", "global"));
      if (configDoc.exists()) setConfig(configDoc.data() as Config);
    };
    fetchConfig();
  }, []);

  const checkUserExists = async (id: string) => {
    if (!id || id.length < 5) return;
    setCheckingUser(true);
    try {
      const q = query(collection(db, "registrations"), where("idNumber", "==", id));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setUserExists(true);
        const userData = snap.docs[0].data();
        const medicalData = userData.medicalData || {};
        setFormData(prev => ({ 
          ...prev, 
          ...userData,
          bloodType: medicalData.bloodType || "",
          weight: medicalData.weight || "",
          height: medicalData.height || "",
          allergies: medicalData.allergies || "",
          foodIntolerances: medicalData.intolerances || "",
          disability: medicalData.disability?.has ? "Si" : "No",
          disabilityDetails: medicalData.disability?.description || "",
          medicalHistory: medicalData.antecedents || "",
          currentMedications: medicalData.medications || "",
          emergencyName: medicalData.emergencyContactName || "",
          emergencyPhone: medicalData.emergencyContactPhone || ""
        }));
        
        // Fetch payments
        const pQ = query(collection(db, "payments"),
                         where("participantId", "==", id));
        const pSnap = await getDocs(pQ);
        let total = 0;
        pSnap.docs.forEach(doc => {
          const p = doc.data();
          // Relaxed status check
          if (p.status === Status.APPROVED || p.status === "approved" || p.status === "APPROVED" || p.status === "aprobado" || p.status === "APROBADO") {
            total += Number(p.amount || 0);
          }
        });
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
    if (file.size > 800 * 1024) return alert("El archivo es muy grande (Máximo 800KB)");
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, proofUrl: reader.result, proofName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register" && userExists) {
      const q = query(collection(db, "registrations"), where("idNumber", "==", formData.idNumber));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, "registrations", snap.docs[0].id), {
          medicalData: {
            bloodType: formData.bloodType || "N/A",
            weight: formData.weight || "N/A",
            height: formData.height || "N/A",
            allergies: formData.allergies || "No aplica",
            intolerances: formData.foodIntolerances || "No aplica",
            disability: {
              has: formData.disability === "Si",
              description: formData.disabilityDetails || ""
            },
            antecedents: formData.medicalHistory || "No aplica",
            medications: formData.currentMedications || "No aplica",
            emergencyContactName: formData.emergencyName || "N/A",
            emergencyContactPhone: formData.emergencyPhone || "N/A"
          }
        });
        alert("Ficha médica y registro actualizados.");
        setLoading(false);
        return;
      }
    }
    if (mode === "payment") {
      if (!userExists) return alert("Esta cédula no está registrada. Por favor regístrese primero.");
      if (totalApprovedUSD >= (config?.totalCostUSD || 100)) return alert("Ya ha completado el pago total.");
      if (!formData.amount || Number(formData.amount) <= 0) return alert("Por favor, ingrese un monto válido.");
      if (formData.paymentMethod === PaymentMethod.TRANSFER && !formData.bankReference) return alert("Por favor, ingrese el número de referencia.");
      if (formData.paymentMethod === PaymentMethod.CASH && !formData.receiptNumber) return alert("Por favor, ingrese el número de recibo.");
    }
    
    setLoading(true);
    try {
      if (mode === "register") {
        const registrationData = {
          ...formData,
          medicalData: {
            bloodType: formData.bloodType || "N/A",
            weight: formData.weight || "N/A",
            height: formData.height || "N/A",
            allergies: formData.allergies || "No aplica",
            intolerances: formData.foodIntolerances || "No aplica",
            disability: {
              has: formData.disability === "Si",
              description: formData.disabilityDetails || ""
            },
            antecedents: formData.medicalHistory || "No aplica",
            medications: formData.currentMedications || "No aplica",
            emergencyContactName: formData.emergencyName || "N/A",
            emergencyContactPhone: formData.emergencyPhone || "N/A"
          },
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "registrations"), registrationData);
        await addDoc(collection(db, "payments"), {
          participantId: formData.idNumber,
          idNumber: formData.idNumber,
          amount: 0,
          amountUSD: 0,
          status: Status.APPROVED,
          paymentMethod: PaymentMethod.TRANSFER,
          paymentDate: new Date().toISOString().split('T')[0],
          approvedBy: "Sistema (Registro Inicial)",
          createdAt: new Date().toISOString()
        });
        alert("Registro exitoso.");
        setUserExists(true);
      } else {
        const amountVal = Number(formData.amount || 0);                
        const amountUSD = formData.paymentMethod === PaymentMethod.CASH 
            ? amountVal 
            : (amountVal / Number(formData.exchangeRate || 1));
            
        await addDoc(collection(db, "payments"), { 
          ...formData, 
          amount: amountVal,
          amountUSD: amountUSD,
          proofUrl: formData.proofUrl || null,
          proofName: formData.proofName || null,
          participantId: formData.idNumber,
          idNumber: formData.idNumber,
          status: Status.PENDING,
          createdAt: new Date().toISOString()
        });
        setConfirmationMessage("Confirmación de Pago: su pago se encuentra en proceso de verificación, verifique su status en la sección de 'Consultar'.");
      }
    } catch (e) {
      console.error(e);
      alert("Error al enviar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-xl space-y-6 text-left">
      <button type="button" onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors flex items-center text-sm font-bold text-gray-500 uppercase">
        <ChevronLeft className="w-5 h-5" /> Volver
      </button>

      {confirmationMessage ? (
        <div className="p-8 border-2 border-green-500 bg-green-50 rounded-3xl text-center space-y-4">
          <h3 className="font-bold text-lg text-green-700">{confirmationMessage}</h3>
        </div>
      ) : (
        <>
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => onSwitchMode("register")}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-black uppercase transition-all ${mode === "register" ? 'bg-primary text-white shadow-sm' : 'text-gray-500'}`}
            >
              Registro
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode("payment")}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-black uppercase transition-all ${mode === "payment" ? 'bg-primary text-white shadow-sm' : 'text-gray-500'}`}
            >
              Cuota
            </button>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 uppercase">Cédula</label>
            <input
              required
              type="text"
              value={formData.idNumber}
              onChange={(e) => {
                setFormData({ ...formData, idNumber: e.target.value });
                if (e.target.value.length >= 6) checkUserExists(e.target.value);
                else { setUserExists(false); setTotalApprovedUSD(0); }
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
              placeholder="Ej. 12345678"
            />
            {checkingUser && <Loader2 className="w-5 h-5 animate-spin"/>}
            {userExists && <p className="text-green-600 font-bold">Participante: {formData.firstName} {formData.lastName}</p>}
            {mode === "payment" && !userExists && formData.idNumber.length >= 6 && <p className="text-red-500 font-bold">Usted aun no se encuentra registrado en el evento, lo invitamos a registrarse en la Sección de "Registro"</p>}
          </div>

          {mode === "register" && (
            userExists ? (
              <div className="p-8 border-2 border-green-500 bg-green-50 rounded-3xl text-center space-y-4">
                <h3 className="font-bold text-lg text-green-700">Ya está registrado exitosamente.</h3>
                <p className="text-sm text-green-600">Puede validar su status en la sección de "Consultar".</p>
              </div>
            ) : (
              <RegisterFormOnly formData={formData} setFormData={setFormData} />
            )
          )}

          {mode === "payment" && (
            userExists && (
              totalApprovedUSD >= (config?.totalCostUSD || 100) ? (
                <div className="p-8 border-2 border-green-500 bg-green-50 rounded-3xl text-center space-y-4">
                  <h3 className="font-bold text-lg text-green-700">Pago completado al 100%.</h3>
                </div>
              ) : (
                <ReportPaymentForm 
                  formData={formData} 
                  setFormData={setFormData} 
                  config={config} 
                  totalApprovedUSD={totalApprovedUSD} 
                  handleFileChange={handleFileChange} 
                />
              )
            )
          )}

          {!(mode === "register" && userExists) && !(mode === "payment" && (!userExists || totalApprovedUSD >= (config?.totalCostUSD || 100))) && (
            <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-primary-dark transition-all disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : (mode === "payment" ? "Reportar cuota" : "Enviar")}
            </button>
          )}
        </>
      )}
    </form>
  );
}
