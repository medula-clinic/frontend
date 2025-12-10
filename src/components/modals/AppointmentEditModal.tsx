import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { apiService } from "@/services/api";
import { serviceApi } from "@/services/api/serviceApi";
import { useUpdateAppointment } from "@/hooks/useApi";
import { useTranslation } from "react-i18next";

interface AppointmentEditModalProps {
  open: boolean;
  appointment: any | null;
  onOpenChange: (open: boolean) => void;
  lockedPatientId?: string;
  onSaved?: () => void;
  preselectedPatient?: any;
  preselectedDoctor?: any;
  preselectedNurse?: any;
}

interface EditForm {
  patientId: string;
  doctorId: string;
  nurseId: string;
  serviceId: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  notes: string;
}

const AppointmentEditModal: React.FC<AppointmentEditModalProps> = ({
  open,
  appointment,
  onOpenChange,
  lockedPatientId,
  onSaved,
  preselectedPatient,
  preselectedDoctor,
  preselectedNurse,
}) => {
  const { t } = useTranslation();
  const updateAppointment = useUpdateAppointment();
  const [editFormData, setEditFormData] = useState<EditForm>({
    patientId: "",
    doctorId: "",
    nurseId: "none",
    serviceId: "",
    date: "",
    time: "",
    duration: "30",
    type: "consultation",
    notes: "",
  });
  const [editModalData, setEditModalData] = useState({
    patients: [] as any[],
    doctors: [] as any[],
    nurses: [] as any[],
    services: [] as any[],
    loading: false,
  });

  useEffect(() => {
    if (open && appointment) {
      preloadForm(appointment);
      loadData();
    }
  }, [open, appointment]);

  const preloadForm = (apt: any) => {
    const aptDate = new Date(apt.appointment_date || apt.date);
    const patientId =
      apt.patientId ||
      apt.patient_id ||
      (typeof apt.patient === "string" ? apt.patient : apt.patient?._id);
    const doctorId =
      apt.doctorId ||
      apt.doctor_id ||
      (typeof apt.doctor === "string" ? apt.doctor : apt.doctor?._id);
    const nurseId =
      apt.nurseId ||
      apt.nurse_id ||
      (typeof apt.nurse === "string" ? apt.nurse : apt.nurse?._id) ||
      "none";

    setEditFormData({
      patientId: patientId || lockedPatientId || "",
      doctorId: doctorId || "",
      nurseId: nurseId || "none",
      serviceId: apt.serviceId || "",
      date: aptDate.toISOString().split("T")[0],
      time: aptDate.toTimeString().slice(0, 5),
      duration: (apt.duration || 30).toString(),
      type: apt.type || "consultation",
      notes: apt.notes || "",
    });
  };

  const loadData = async () => {
    setEditModalData((prev) => ({ ...prev, loading: true }));
    try {
      const [patientsResponse, doctorsResponse, nursesResponse, servicesResponse] = await Promise.all([
        apiService.getPatients({ limit: 100 }),
        apiService.getDoctors({ limit: 100 }),
        apiService.getNurses({ limit: 100 }),
        serviceApi.getServices({ isActive: true, limit: 100 }),
      ]);

      setEditModalData({
        patients: mergeEntity(patientsResponse.data.patients || [], preselectedPatient),
        doctors: mergeEntity(doctorsResponse.data.items || [], preselectedDoctor),
        nurses: mergeEntity(nursesResponse.data.items || [], preselectedNurse),
        services: servicesResponse.data || [],
        loading: false,
      });
    } catch (error) {
      console.error("Error loading edit modal data:", error);
      setEditModalData((prev) => ({ ...prev, loading: false }));
      toast({
        title: t("Error loading data"),
        description: t("Failed to load patients, doctors, nurses, and services."),
        variant: "destructive",
      });
    }
  };

  const mergeEntity = (list: any[], entity?: any) => {
    if (!entity) return list;
    const exists = list.find((item) => item._id === entity._id);
    return exists ? list : [entity, ...list];
  };

  const handleSave = async () => {
    if (!appointment) return;
    if (!editFormData.patientId) {
      toast({
        title: t("Validation Error"),
        description: t("Please select a patient."),
        variant: "destructive",
      });
      return;
    }
    if (!editFormData.doctorId) {
      toast({
        title: t("Validation Error"),
        description: t("Please select a doctor."),
        variant: "destructive",
      });
      return;
    }
    if (!editFormData.date || !editFormData.time) {
      toast({
        title: t("Validation Error"),
        description: t("Please provide date and time."),
        variant: "destructive",
      });
      return;
    }

    const [year, month, day] = editFormData.date.split("-").map(Number);
    const [hours, minutes] = editFormData.time.split(":").map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes);
    if (isNaN(appointmentDateTime.getTime())) {
      toast({
        title: t("Validation Error"),
        description: t("Invalid date/time."),
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      patient_id: editFormData.patientId,
      doctor_id: editFormData.doctorId,
      appointment_date: appointmentDateTime.toISOString(),
      duration: parseInt(editFormData.duration) || 30,
      type: editFormData.type,
      notes: editFormData.notes || "",
    };

    if (editFormData.nurseId && editFormData.nurseId !== "none") {
      payload.nurse_id = editFormData.nurseId;
    }
    if (editFormData.serviceId) {
      payload.serviceId = editFormData.serviceId;
    }

    try {
      await updateAppointment.mutateAsync({
        id: appointment.id || appointment._id,
        data: payload,
      });
      toast({
        title: t("Success"),
        description: t("Appointment updated."),
      });
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      console.error("Edit appointment error:", err);
      toast({
        title: t("Error"),
        description: t("Failed to update appointment."),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Edit Appointment")}</DialogTitle>
          <DialogDescription>
            {t("Update appointment details")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t("Patient, Doctor & Nurse")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-patient">{t("Select Patient")} *</Label>
                <Select
                  value={editFormData.patientId}
                  onValueChange={(value) => setEditFormData((prev) => ({ ...prev, patientId: value }))}
                  disabled={!!lockedPatientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Choose a patient")} />
                  </SelectTrigger>
                  <SelectContent>
                    {editModalData.loading ? (
                      <SelectItem value="loading" disabled>
                        {t("Loading patients...")}
                      </SelectItem>
                    ) : (
                      editModalData.patients.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {p.first_name} {p.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">{p.phone}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-doctor">{t("Select Doctor")} *</Label>
                <Select
                  value={editFormData.doctorId}
                  onValueChange={(value) => setEditFormData((prev) => ({ ...prev, doctorId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Choose a doctor")} />
                  </SelectTrigger>
                  <SelectContent>
                    {editModalData.loading ? (
                      <SelectItem value="loading" disabled>
                        {t("Loading doctors...")}
                      </SelectItem>
                    ) : editModalData.doctors.length === 0 ? (
                      <SelectItem value="no-doctors" disabled>
                        {t("No doctors available.")}
                      </SelectItem>
                    ) : (
                      editModalData.doctors.map((doctor) => (
                        <SelectItem key={doctor._id} value={doctor._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {doctor.first_name} {doctor.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {doctor.role} • {doctor.phone}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-nurse">{t("Select Nurse (Optional)")}</Label>
                <Select
                  value={editFormData.nurseId}
                  onValueChange={(value) => setEditFormData((prev) => ({ ...prev, nurseId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Choose a nurse (optional)")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("No nurse assigned")}</SelectItem>
                    {editModalData.loading ? (
                      <SelectItem value="loading" disabled>
                        {t("Loading nurses...")}
                      </SelectItem>
                    ) : editModalData.nurses.length === 0 ? (
                      <SelectItem value="no-nurses" disabled>
                        {t("No nurses available.")}
                      </SelectItem>
                    ) : (
                      editModalData.nurses.map((nurse) => (
                        <SelectItem key={nurse._id} value={nurse._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {nurse.first_name} {nurse.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {nurse.role} • {nurse.phone}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t("Service & Schedule")}</h3>
            <div className="space-y-2">
              <Label htmlFor="edit-service">{t("Service Type")}</Label>
              <Select
                value={editFormData.serviceId}
                onValueChange={(value) => {
                  setEditFormData((prev) => ({ ...prev, serviceId: value }));
                  const selectedService = editModalData.services.find((s) => s.id === value);
                  if (selectedService) {
                    setEditFormData((prev) => ({
                      ...prev,
                      duration: selectedService.duration.toString(),
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("Select service type")} />
                </SelectTrigger>
                <SelectContent>
                  {editModalData.loading ? (
                    <SelectItem value="loading" disabled>
                      {t("Loading services...")}
                    </SelectItem>
                  ) : editModalData.services.length === 0 ? (
                    <SelectItem value="no-services" disabled>
                      {t("No services available.")}
                    </SelectItem>
                  ) : (
                    editModalData.services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex justify-between w-full">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-sm text-muted-foreground ml-4">
                            {service.duration}min - ${service.price}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">{t("Date")}</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">{t("Time")}</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editFormData.time}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-duration">{t("Duration (minutes)")}</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={editFormData.duration}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, duration: e.target.value }))}
                  min={15}
                  max={240}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">{t("Type")}</Label>
                <Select
                  value={editFormData.type}
                  onValueChange={(value) => setEditFormData((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">{t("Consultation")}</SelectItem>
                    <SelectItem value="follow-up">{t("Follow-up")}</SelectItem>
                    <SelectItem value="check-up">{t("Check-up")}</SelectItem>
                    <SelectItem value="vaccination">{t("Vaccination")}</SelectItem>
                    <SelectItem value="procedure">{t("Procedure")}</SelectItem>
                    <SelectItem value="emergency">{t("Emergency")}</SelectItem>
                    <SelectItem value="screening">{t("Screening")}</SelectItem>
                    <SelectItem value="therapy">{t("Therapy")}</SelectItem>
                    <SelectItem value="other">{t("Other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">{t("Notes")}</Label>
              <textarea
                id="edit-notes"
                className="w-full border rounded-md px-3 py-2"
                rows={3}
                value={editFormData.notes}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={updateAppointment.isPending}>
            {t("Save Changes")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentEditModal;
