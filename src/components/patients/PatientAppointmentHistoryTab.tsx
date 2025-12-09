import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppointments, useUpdateAppointment } from "@/hooks/useApi";
import { useClinic } from "@/contexts/ClinicContext";
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Stethoscope,
  XCircle,
} from "lucide-react";
import NewAppointmentModal from "@/components/modals/NewAppointmentModal";
import { AppointmentSlipPDFGenerator, convertToAppointmentSlipData, type ClinicInfo } from "@/utils/appointmentSlipPdf";

interface PatientAppointmentHistoryTabProps {
  patientId?: string;
  patientName?: string;
}

const formatDate = (dateValue: string | Date) => {
  const date = new Date(dateValue);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (dateValue: string | Date) => {
  const date = new Date(dateValue);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const statusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "scheduled":
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "in-progress":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
    case "no-show":
      return "bg-red-100 text-red-800";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const PatientAppointmentHistoryTab: React.FC<PatientAppointmentHistoryTabProps> = ({
  patientId,
  patientName,
}) => {
  const { t } = useTranslation();
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [editAppointment, setEditAppointment] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    date: "",
    time: "",
    type: "",
    duration: "",
    notes: "",
  });
  const { currentClinic } = useClinic();
  const updateAppointment = useUpdateAppointment();

  const { data, isLoading, error } = useAppointments(
    patientId
      ? {
          patient_id: patientId,
          limit: 10,
        }
      : undefined
  );

  const appointments = useMemo(
    () => (data as any)?.data?.appointments || [],
    [data]
  );

  const handleDownloadSlip = async (appointment: any) => {
    try {
      const normalizedAppointment = {
        ...appointment,
        date: new Date(appointment.appointment_date || appointment.date),
        patient: appointment.patient_id
          ? {
              name: `${appointment.patient_id.first_name} ${appointment.patient_id.last_name}`,
              phone: appointment.patient_id.phone,
              email: appointment.patient_id.email,
            }
          : appointment.patient,
        doctor: appointment.doctor_id
          ? {
              name: `${appointment.doctor_id.first_name} ${appointment.doctor_id.last_name}`,
              specialty: (appointment.doctor_id as any).specialization,
            }
          : appointment.doctor,
      };
      const appointmentSlipData = convertToAppointmentSlipData(normalizedAppointment);
      const clinicInfo: ClinicInfo = {
        name: currentClinic?.name || "Medula Medical Center",
        address: {
          street: currentClinic?.address?.street || "123 Healthcare Avenue",
          city: currentClinic?.address?.city || "Medical District",
          state: currentClinic?.address?.state || "CA",
          zipCode: currentClinic?.address?.zipCode || "90210",
        },
        contact: {
          phone: currentClinic?.phone || "+1 (555) 123-4567",
          email: currentClinic?.email || "info@clinicpro.com",
          website: currentClinic?.website || "www.clinicpro.com",
        },
      };
      await AppointmentSlipPDFGenerator.generateAppointmentSlipPDF(appointmentSlipData, clinicInfo, {
        includeHeader: true,
        includeFooter: true,
        includeNotes: true,
      });
    } catch (err) {
      console.error("Download appointment slip error:", err);
    }
  };

  const handleMarkComplete = async (appointment: any) => {
    try {
      await updateAppointment.mutateAsync({
        id: appointment._id,
        data: { status: "completed" },
      });
    } catch (err) {
      console.error("Mark complete error:", err);
    }
  };

  const handleCancel = async (appointment: any) => {
    try {
      await updateAppointment.mutateAsync({
        id: appointment._id,
        data: { status: "cancelled" },
      });
    } catch (err) {
      console.error("Cancel appointment error:", err);
    }
  };

  const openEdit = (appointment: any) => {
    const date = new Date(appointment.appointment_date || appointment.date);
    setEditForm({
      date: date.toISOString().split("T")[0],
      time: date.toTimeString().slice(0, 5),
      type: appointment.type || "consultation",
      duration: (appointment.duration || 30).toString(),
      notes: appointment.notes || "",
    });
    setEditAppointment(appointment);
  };

  const submitEdit = async () => {
    if (!editAppointment) return;
    const [year, month, day] = editForm.date.split("-").map(Number);
    const [hours, minutes] = editForm.time.split(":").map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes);
    try {
      await updateAppointment.mutateAsync({
        id: editAppointment._id,
        data: {
          appointment_date: appointmentDateTime.toISOString(),
          type: editForm.type,
          duration: parseInt(editForm.duration) || 30,
          notes: editForm.notes,
        },
      });
      setEditAppointment(null);
    } catch (err) {
      console.error("Edit appointment error:", err);
    }
  };

  if (!patientId) {
    return <p className="text-sm text-muted-foreground">{t("Select a patient to view appointments.")}</p>;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <NewAppointmentModal
          preSelectedPatientId={patientId}
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("New Appointment")}
            </Button>
          }
        />
      </div>

      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Date")}</TableHead>
              <TableHead>{t("Time")}</TableHead>
              <TableHead>{t("Doctor")}</TableHead>
              <TableHead>{t("Type")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              : error ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Alert variant="destructive">
                      <AlertDescription>{t("Failed to load appointments. Please try again.")}</AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    {t("No appointments found for this patient.")}
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appointment: any) => {
                  const doctor = appointment.doctor_id || appointment.doctor;
                  return (
                    <TableRow key={appointment._id}>
                      <TableCell>{formatDate(appointment.appointment_date || appointment.date)}</TableCell>
                      <TableCell>{formatTime(appointment.appointment_date || appointment.date)}</TableCell>
                      <TableCell>{doctor ? `${doctor.first_name} ${doctor.last_name}` : t("Unassigned")}</TableCell>
                      <TableCell className="capitalize">{appointment.type || t("Consultation")}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${statusColor(appointment.status)} capitalize`}>
                          {appointment.status || t("scheduled")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              <MoreVertical className="h-4 w-4 mr-1" />
                              {t("Actions")}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedAppointment(appointment)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t("View Details")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(appointment)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("Edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadSlip(appointment)}>
                              <Download className="mr-2 h-4 w-4" />
                              {t("Download Slip")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkComplete(appointment)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {t("Mark Complete")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCancel(appointment)} className="text-destructive">
                              <XCircle className="mr-2 h-4 w-4" />
                              {t("Cancel")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Appointment Details")}</DialogTitle>
            <DialogDescription>
              {patientName || t("Patient")} • {selectedAppointment ? formatDate(selectedAppointment.appointment_date || selectedAppointment.date) : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Doctor")}</h4>
                  <p className="text-base font-medium">
                    {selectedAppointment.doctor_id
                      ? `${selectedAppointment.doctor_id.first_name} ${selectedAppointment.doctor_id.last_name}`
                      : t("Unassigned")}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Type")}</h4>
                  <p className="text-base font-medium capitalize">{selectedAppointment.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Date")}</p>
                    <p className="font-medium">{formatDate(selectedAppointment.appointment_date || selectedAppointment.date)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("Time")}</p>
                    <p className="font-medium">
                      {formatTime(selectedAppointment.appointment_date || selectedAppointment.date)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("Status")}</p>
                  <Badge variant="secondary" className={`${statusColor(selectedAppointment.status)} capitalize`}>
                    {selectedAppointment.status}
                  </Badge>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Notes")}</h4>
                  <p className="text-sm text-foreground bg-muted p-3 rounded-lg">{selectedAppointment.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAppointment} onOpenChange={(open) => !open && setEditAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Edit Appointment")}</DialogTitle>
            <DialogDescription>{t("Update appointment details for this patient")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{t("Date")}</label>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={editForm.date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("Time")}</label>
                <input
                  type="time"
                  className="w-full border rounded-md px-3 py-2"
                  value={editForm.time}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{t("Type")}</label>
                <input
                  type="text"
                  className="w-full border rounded-md px-3 py-2"
                  value={editForm.type}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("Duration (minutes)")}</label>
                <input
                  type="number"
                  className="w-full border rounded-md px-3 py-2"
                  value={editForm.duration}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, duration: e.target.value }))}
                  min={15}
                  max={240}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("Notes")}</label>
              <textarea
                className="w-full border rounded-md px-3 py-2"
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditAppointment(null)}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitEdit} disabled={updateAppointment.isPending}>
              {t("Save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PatientAppointmentHistoryTab;
