import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Registration, Config } from "../types";

export const generateMedicalPDF = (registration: Registration, config: Config | null) => {
  const doc = new jsPDF();
  const medical = registration.medicalData;

  if (!medical) {
    alert("Este participante no tiene ficha médica registrada.");
    return;
  }

  // Header
  doc.setFillColor(31, 41, 55); // Dark gray
  doc.rect(0, 0, 210, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(config?.eventName || "FICHA MÉDICA", 105, 15, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("SISTEMA DE GESTIÓN DE RIESGOS Y ATENCIÓN MÉDICA", 105, 24, { align: "center" });

  // Participant Info
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL PARTICIPANTE", 20, 45);
  
  doc.setLineWidth(0.5);
  doc.setDrawColor(229, 231, 235);
  doc.line(20, 47, 190, 47);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  const personalData = [
    ["Nombre Completo:", `${registration.firstName} ${registration.lastName}`],
    ["Cédula de Identidad:", `V-${registration.idNumber}`],
    ["Grupo Scout:", registration.scoutGroup],
    ["Tipo de Membresía:", registration.membershipType === "Joven" ? "JOVEN" : "ADULTO"],
    ["Correo:", registration.email]
  ];

  autoTable(doc, {
    startY: 52,
    margin: { left: 20, right: 20 },
    body: personalData,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } }
  });

  // Medical Info
  const startYMedical = (doc as any).lastAutoTable.finalY + 8;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMACIÓN MÉDICA", 20, startYMedical);
  doc.line(20, startYMedical + 2, 190, startYMedical + 2);

  const medicalData = [
    ["Grupo Sanguíneo:", medical.bloodType],
    ["Peso / Estatura:", `${medical.weight || '-'} kg / ${medical.height || '-'} cm`],
    ["Alergias:", medical.allergies],
    ["Intolerancias:", medical.intolerances || "Ninguna"],
    ["Discapacidad:", medical.disability?.has ? `Sí (${medical.disability.description})` : "No"],
    ["Antecedentes:", medical.antecedents],
    ["Medicamentos:", medical.medications]
  ];

  autoTable(doc, {
    startY: startYMedical + 5,
    margin: { left: 20, right: 20 },
    body: medicalData,
    theme: "grid",
    headStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, fillColor: [249, 250, 251] } }
  });

  // Emergency Contact
  const startYEmergency = (doc as any).lastAutoTable.finalY + 8;
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("CONTACTO DE EMERGENCIA", 20, startYEmergency);
  doc.line(20, startYEmergency + 2, 190, startYEmergency + 2);

  const emergencyData = [
    ["Nombre del Contacto:", medical.emergencyContactName],
    ["Teléfono:", medical.emergencyContactPhone]
  ];

  autoTable(doc, {
    startY: startYEmergency + 5,
    margin: { left: 20, right: 20 },
    body: emergencyData,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } }
  });

  // Footer / Disclaimer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text("Esta información fue suministrada por el Joven/Adulto y es para el uso exclusivo del equipo de Gestión de Riesgos.", 105, pageHeight - 15, { align: "center" });
  doc.text(`Generado por Sistema de Acreditación - ${config?.eventName || 'Evento'} - ${new Date().toLocaleString()}`, 105, pageHeight - 11, { align: "center" });

  const fileName = `${registration.idNumber}_FichaMedica_${(config?.eventName || 'Evento').replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
