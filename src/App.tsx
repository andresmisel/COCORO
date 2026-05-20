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
  CalendarCheck,
  Image,
  ExternalLink,
  Layers,
  Clock,
  HeartPulse
} from "lucide-react";
import RegistrationForm from "./components/RegistrationForm";
import StatusCheck from "./components/StatusCheck";
import StaffLogin from "./components/StaffLogin";
import VotingPlatform from "./components/VotingPlatform";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Config } from "./types";

type View = "home" | "register" | "status" | "staff" | "voting";

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
                Registro y Cuotas
              </button>
              <button 
                onClick={() => navigate("status")} 
                className={`hover:text-gray-200 transition-colors uppercase text-sm font-medium ${view === 'status' ? 'border-b-2 border-white' : ''}`}
                id="nav-status"
              >
                Consultar
              </button>
              {config?.votingActive && (
                <button 
                  onClick={() => navigate("voting")} 
                  className={`hover:text-amber-100 transition-colors uppercase text-sm font-bold ${view === 'voting' ? 'border-b-2 border-amber-300 text-amber-300' : 'text-amber-300'}`}
                  id="nav-voting"
                >
                  🗳️ Votaciones
                </button>
              )}
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

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-primary-dark border-t border-primary-light"
            >
              <div className="px-4 py-4 space-y-3 flex flex-col">
                <button onClick={() => navigate("register")} className="text-left py-2 font-medium">Registro y Cuotas</button>
                <button onClick={() => navigate("status")} className="text-left py-2 font-medium">Consultar Status</button>
                {config?.votingActive && (
                  <button onClick={() => navigate("voting")} className="text-left py-2 font-bold text-amber-300">🗳️ Votaciones</button>
                )}
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
              className="max-w-7xl mx-auto px-4 py-8 md:py-12 text-center"
            >
              <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] md:text-xs uppercase tracking-widest mb-6">
                {config?.headerTagline || "Caracas 2026"}
              </div>
              <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-gray-900 mb-6 uppercase italic leading-tight">
                {config?.eventName || "Congreso de Comunidad Rover"}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 px-4">
                {config?.eventDescription || "Bienvenido a COCORO, la plataforma oficial para el registro, validación y control de asistencia al evento de la unidad de clan más esperado del año."}
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto px-2">
                <button 
                  onClick={() => navigate("register")}
                  className="group relative overflow-hidden bg-primary text-white p-6 md:p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 hover:shadow-xl transition-all hover:-translate-y-1"
                  id="home-btn-register"
                >
                  <ClipboardCheck className="w-10 h-10 md:w-12 md:h-12" />
                  <span className="text-xl md:text-2xl font-bold uppercase">Formulario de Registro y Reporte de Cuotas</span>
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                
                <button 
                  onClick={() => navigate("status")}
                  className="group relative overflow-hidden border-2 border-primary text-primary p-6 md:p-8 rounded-3xl flex flex-col items-center justify-center space-y-4 hover:bg-primary/5 hover:shadow-lg transition-all hover:-translate-y-1"
                  id="home-btn-status"
                >
                  <Search className="w-10 h-10 md:w-12 md:h-12" />
                  <span className="text-xl md:text-2xl font-bold uppercase">Consultar Status</span>
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              {/* Event Phases Display */}
              {config?.phases && config.phases.length > 0 && (
                <div className="mt-20 space-y-8">
                  <div className="flex flex-col items-center">
                    <div className="bg-primary/10 px-4 py-1 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">Cronograma</div>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter">Fases del Evento</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                    {config.phases.map((phase) => (
                      <div 
                        key={phase.id} 
                        className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className="bg-primary/5 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <Layers className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col items-end">
                            <div className="flex items-center space-x-1 text-primary">
                              <CalendarCheck className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase">
                                {phase.date ? new Date(phase.date + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span className="text-[10px] font-bold">{phase.time}</span>
                            </div>
                          </div>
                        </div>

                        <h3 className="text-xl font-black text-gray-900 uppercase italic mb-2 leading-tight">{phase.name}</h3>
                        <div className="flex items-center space-x-2 mb-4">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[9px] font-black uppercase text-gray-500 tracking-wider">Acumulado Mínimo:</span>
                          <span className="text-sm font-black text-primary font-mono">${phase.minAmount.toFixed(2)}</span>
                        </div>
                        
                        <div 
                          className={`flex items-start space-x-3 text-sm ${phase.locationUrl ? 'text-primary hover:underline cursor-pointer' : 'text-gray-500'}`}
                          onClick={() => phase.locationUrl && window.open(phase.locationUrl, "_blank")}
                        >
                          <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${phase.locationUrl ? 'text-primary' : 'text-gray-300'}`} />
                          <span className="font-medium">{phase.location}</span>
                          {phase.locationUrl && <ExternalLink className="w-3 h-3 mt-1 opacity-50" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {config?.photoAlbumUrl && (
                <div className="mt-16 bg-gradient-to-br from-primary/5 to-amber-50 p-8 md:p-12 rounded-[40px] border border-primary/10 shadow-sm overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 hidden md:block opacity-10 group-hover:opacity-20 transition-opacity">
                    <Image className="w-32 h-32 text-primary -rotate-12" />
                  </div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="bg-primary/10 p-4 rounded-3xl text-primary mb-6">
                      <Image className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase italic tracking-tighter mb-4">Álbum de Fotos</h2>
                    <p className="text-gray-600 max-w-lg mx-auto mb-8 text-sm md:text-base">
                      Accede a nuestro álbum oficial para revivir los mejores momentos, descargar tus fotos o compartir las que tomaste durante el evento.
                    </p>
                    <a 
                      href={config.photoAlbumUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-3 bg-primary text-white px-8 py-4 rounded-2xl font-bold uppercase hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 hover:-translate-y-1"
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span>Ver Álbum Oficial</span>
                    </a>
                  </div>
                </div>
              )}
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

          {view === "voting" && (
            <motion.div
              key="voting"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto px-4 py-8"
            >
              <VotingPlatform onBack={() => setView("home")} />
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
            {config?.eventName || "Congreso de Comunidad Rover"} 2026
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
