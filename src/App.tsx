/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ClipboardCheck, 
  Search, 
  ShieldCheck, 
  Menu, 
  X, 
  MapPin,
  Users,
  CalendarCheck
} from "lucide-react";
import RegistrationForm from "./components/RegistrationForm";
import StatusCheck from "./components/StatusCheck";
import StaffLogin from "./components/StaffLogin";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Config } from "./types";

type View = "home" | "register" | "status" | "staff";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "config", "global"), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data() as Config);
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navigate = (newView: View) => {
    setView(newView);
    setIsMenuOpen(false);
  };
// ... rest of the component

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-primary text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div 
              className="flex items-center cursor-pointer space-x-2" 
              onClick={() => navigate("home")}
              id="brand-logo"
            >
              <div className="bg-white p-1 rounded-lg">
                <Users className="text-primary w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight uppercase">COCORO ♥♥♥♥♥</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8 items-center">
              <button 
                onClick={() => navigate("register")} 
                className={`hover:text-gray-200 transition-colors uppercase text-sm font-medium ${view === 'register' ? 'border-b-2 border-white' : ''}`}
                id="nav-register"
              >
                Inscripción
              </button>
              <button 
                onClick={() => navigate("status")} 
                className={`hover:text-gray-200 transition-colors uppercase text-sm font-medium ${view === 'status' ? 'border-b-2 border-white' : ''}`}
                id="nav-status"
              >
                Consultar
              </button>
              <button 
                onClick={() => navigate("staff")} 
                className="bg-white text-primary px-4 py-1.5 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors uppercase shadow-sm"
                id="nav-staff"
              >
                Staff
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center">
              <button onClick={toggleMenu} className="p-2" id="mobile-menu-toggle">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-primary-dark border-t border-primary-light"
            >
              <div className="px-4 py-4 space-y-3 flex flex-col">
                <button onClick={() => navigate("register")} className="text-left py-2 font-medium">Inscripción</button>
                <button onClick={() => navigate("status")} className="text-left py-2 font-medium">Consultar Status</button>
                <button onClick={() => navigate("staff")} className="text-left py-2 font-medium font-bold italic">Acceso Staff</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="mx-auto">
        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-7xl mx-auto px-4 py-12 text-center"
            >
              <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest mb-6">
                Distrito Ávila 2026
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-gray-900 mb-6 uppercase italic">
                Congreso de <br/><span className="text-primary">Comunidad Rover</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                Bienvenido a COCORO, la plataforma oficial para el registro, validación y control de asistencia al evento de la unidad de clan más esperado del año.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <button 
                  onClick={() => navigate("register")}
                  className="group relative overflow-hidden bg-primary text-white p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 hover:shadow-xl transition-all hover:-translate-y-1"
                  id="home-btn-register"
                >
                  <ClipboardCheck className="w-12 h-12" />
                  <span className="text-2xl font-bold uppercase">Formulario de Registro</span>
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                
                <button 
                  onClick={() => navigate("status")}
                  className="group relative overflow-hidden border-2 border-primary text-primary p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 hover:bg-primary/5 hover:shadow-lg transition-all hover:-translate-y-1"
                  id="home-btn-status"
                >
                  <Search className="w-12 h-12" />
                  <span className="text-2xl font-bold uppercase">Consultar Status</span>
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-gray-100 pt-12">
                <div className="flex flex-col items-center">
                  <MapPin className="text-primary mb-3" />
                  <h3 className="font-bold uppercase tracking-tight">Ubicación</h3>
                  <p className="text-sm text-gray-500">{config?.eventLocation || "Distrito Ávila, Venezuela"}</p>
                </div>
                <div className="flex flex-col items-center">
                  <CalendarCheck className="text-primary mb-3" />
                  <h3 className="font-bold uppercase tracking-tight">Fecha</h3>
                  <p className="text-sm text-gray-500">{config?.eventDate || "Próximamente 2026"}</p>
                </div>
                <div className="flex flex-col items-center">
                  <ShieldCheck className="text-primary mb-3" />
                  <h3 className="font-bold uppercase tracking-tight">Unidad Scout</h3>
                  <p className="text-sm text-gray-500">Clan</p>
                </div>
              </div>
            </motion.div>
          )}

          {view === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto px-4 py-8"
            >
              <RegistrationForm onBack={() => setView("home")} />
            </motion.div>
          )}

          {view === "status" && (
            <motion.div
              key="status"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto px-4 py-8"
            >
              <StatusCheck onBack={() => setView("home")} />
            </motion.div>
          )}

          {view === "staff" && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto px-4 py-8"
            >
              <StaffLogin onBack={() => setView("home")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm mb-4 uppercase tracking-widest font-bold">
            Congreso de Comunidad Rover 2026
          </p>
          <div className="flex justify-center space-x-4 mb-4">
            <span className="text-gray-500 font-bold uppercase italic tracking-tighter">COCORO ♥♥♥♥♥</span>
          </div>
          <p className="text-xs text-gray-400">© Distrito Ávila - Scouts de Venezuela. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
