import React from "react";
import { MembershipType, Config } from "../types";
import { SCOUT_GROUPS } from "../constants";
import { UserPlus } from "lucide-react";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export default function RegisterFormOnly({ formData, setFormData }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-primary border-b border-primary/10 pb-2">
        <UserPlus className="w-5 h-5" />
        <h3 className="font-bold uppercase text-sm tracking-widest">Datos Personales</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Correo Electrónico</label>
          <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="correo@ejemplo.com" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Nombres</label>
          <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Ej. Juan Andrés" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Apellidos</label>
          <input required type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" placeholder="Ej. Pérez García" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Tipo de Membresía</label>
          <select value={formData.membershipType} onChange={(e) => setFormData({ ...formData, membershipType: e.target.value as MembershipType })} className="w-full px-4 py-3 rounded-xl border border-gray-200">
            <option value={MembershipType.JOVEN}>Joven</option>
            <option value={MembershipType.ADULTO}>Adulto</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Grupo Scout</label>
          <select required value={formData.scoutGroup} onChange={(e) => setFormData({ ...formData, scoutGroup: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200">
            <option value="">Seleccionar Grupo</option>
            {SCOUT_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
        </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Talla de Franela</label>
            <select required value={formData.tshirtSize} onChange={(e) => setFormData({ ...formData, tshirtSize: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200">
              <option value="">Seleccionar Talla</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
            </select>
          </div>
        </div>

      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-6">
        <div className="flex items-center space-x-2 text-primary border-b border-primary/10 pb-2">
          <UserPlus className="w-5 h-5" />
          <h3 className="font-bold uppercase text-sm tracking-widest">Ficha Médica</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Tipo de Sangre</label>
            <select required value={formData.bloodType} onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200">
              <option value="">Seleccionar</option>
              <option value="A+">A+</option><option value="A-">A-</option>
              <option value="B+">B+</option><option value="B-">B-</option>
              <option value="AB+">AB+</option><option value="AB-">AB-</option>
              <option value="O+">O+</option><option value="O-">O-</option>
            </select>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-bold text-gray-700">Peso (kg)</label><input required type="number" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" /></div>
          <div className="space-y-1.5"><label className="text-sm font-bold text-gray-700">Estatura (cm)</label><input required type="number" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" /></div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700">Alergias</label>
          <textarea value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700">Intolerancias Alimenticias</label>
          <textarea value={formData.foodIntolerances} onChange={(e) => setFormData({ ...formData, foodIntolerances: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Discapacidad</label>
            <select value={formData.disability} onChange={(e) => setFormData({ ...formData, disability: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200">
              <option value="No">No</option>
              <option value="Si">Si</option>
            </select>
          </div>
          {formData.disability === "Si" && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Especificar Discapacidad</label>
              <input required type="text" value={formData.disabilityDetails || ""} onChange={(e) => setFormData({ ...formData, disabilityDetails: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700">Antecedentes Médicos</label>
          <textarea value={formData.medicalHistory} onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-gray-700">Medicamentos Actuales</label>
          <textarea value={formData.currentMedications} onChange={(e) => setFormData({ ...formData, currentMedications: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5"><label className="text-sm font-bold text-gray-700">Contacto Emergencia (Nombre)</label><input required type="text" value={formData.emergencyName} onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" /></div>
          <div className="space-y-1.5"><label className="text-sm font-bold text-gray-700">Contacto Emergencia (Teléfono)</label><input required type="text" value={formData.emergencyPhone} onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200" /></div>
        </div>
      </div>
    </div>
  );
}
