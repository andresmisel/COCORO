import React, { useState } from "react";
import { ChevronLeft, Lock, Loader2, ArrowRight } from "lucide-react";
import { StaffRole, StaffMember } from "../types";
import StaffDashboard from "./StaffDashboard";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

interface Props {
  onBack: () => void;
}

export default function StaffLogin({ onBack }: Props) {
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First check hardcoded superadmin for emergency/first time
      if (password === "superadmin321") {
        setRole("superadmin");
        setStaffName("Super Admin (Sistema)");
        setLoading(false);
        return;
      }

      const q = query(collection(db, "staff"), where("password", "==", password));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const staffData = querySnapshot.docs[0].data() as StaffMember;
        setRole(staffData.role);
        setStaffName(staffData.name);
      } else {
        // Fallback for current hardcoded ones if not in DB yet
        if (password === "admin321") {
          setRole("admin");
          setStaffName("Sistema Admin");
        } else if (password === "soporte321") {
          setRole("ops");
          setStaffName("Sistema Ops");
        } else {
          setError("Clave de acceso incorrecta");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  if (role) {
    return <StaffDashboard role={role} staffName={staffName} onLogout={() => setRole(null)} />;
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white p-10 rounded-3xl shadow-xl space-y-8 border border-primary/10">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="bg-primary/10 p-3 rounded-2xl">
            <Lock className="text-primary w-6 h-6" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 uppercase italic">Acceso Staff</h2>
          <p className="text-gray-500 text-sm">Ingrese su clave de autorización para acceder al panel de control.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-primary outline-none transition-all text-center tracking-widest font-mono text-xl"
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 disabled:opacity-70 group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Entrar al Sistema</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="pt-6 border-t border-gray-50 flex justify-center space-x-4 grayscale opacity-50">
          <span className="text-[10px] font-bold uppercase tracking-tighter">Administración</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">•</span>
          <span className="text-[10px] font-bold uppercase tracking-tighter">Operaciones</span>
        </div>
      </div>
    </div>
  );
}
