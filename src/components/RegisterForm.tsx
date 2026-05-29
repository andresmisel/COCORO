import React from "react";
import { MembershipType, Config, PaymentMethod } from "../types";
import { SCOUT_GROUPS } from "../constants";
import { UserPlus, Stethoscope, Loader2 } from "lucide-react";

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  userExists: boolean;
  medicalAlreadyExists: boolean;
}

export default function RegisterForm({ formData, setFormData, userExists, medicalAlreadyExists }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-primary border-b border-primary/10 pb-2">
        <UserPlus className="w-5 h-5" />
        <h3 className="font-bold uppercase text-sm tracking-widest">Datos Personales</h3>
      </div>
      
      {!userExists && (
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
      )}

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

      {!userExists && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Talla de Franela</label>
            <select
              required
              value={formData.tshirtSize}
              onChange={(e) => setFormData({ ...formData, tshirtSize: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none bg-white font-medium"
            >
              <option value="" disabled>Seleccionar Talla</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
