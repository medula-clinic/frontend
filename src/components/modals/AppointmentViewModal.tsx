import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface CompactAppointment {
  _id?: string;
  id?: string;
  appointment_date?: string;
  date?: Date | string;
  duration?: number;
  type?: string;
  status?: string;
  notes?: string;
  patient?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  patient_id?: any;
  doctor?: {
    name?: string;
    specialty?: string;
  };
  doctor_id?: any;
}

interface AppointmentViewModalProps {
  open: boolean;
  appointment: CompactAppointment | null;
  onOpenChange: (open: boolean) => void;
  onDownloadSlip?: (appointment: CompactAppointment) => void;
}

const AppointmentViewModal: React.FC<AppointmentViewModalProps> = ({
  open,
  appointment,
  onOpenChange,
  onDownloadSlip,
}) => {
  const { t } = useTranslation();

  const formatDate = (dateValue: string | Date | undefined) => {
    if (!dateValue) return "";
    const d = new Date(dateValue);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateValue: string | Date | undefined) => {
    if (!dateValue) return "";
    const d = new Date(dateValue);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{t("Appointment Details")}</DialogTitle>
              <DialogDescription>
                {t("View complete appointment information")}
              </DialogDescription>
            </div>
            {appointment && onDownloadSlip && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownloadSlip(appointment)}
                className="ml-4"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("Download Slip")}
              </Button>
            )}
          </div>
        </DialogHeader>
        {appointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Patient")}
                </h4>
                <p className="text-lg font-medium text-foreground">
                  {appointment.patient?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.patient?.phone}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.patient?.email}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Doctor")}
                </h4>
                <p className="text-lg font-medium text-foreground">
                  {appointment.doctor?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.doctor?.specialty}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Date & Time")}
                </h4>
                <p className="text-lg font-medium text-foreground">
                  {formatDate(appointment.appointment_date || appointment.date)}{" "}
                  {t("at")} {formatTime(appointment.appointment_date || appointment.date)}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Duration")}
                </h4>
                <p className="text-lg font-medium text-foreground">
                  {appointment.duration} {t("minutes")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Type")}
                </h4>
                <p className="text-lg font-medium text-foreground capitalize">
                  {appointment.type}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Status")}
                </h4>
                <Badge>{appointment.status}</Badge>
              </div>
            </div>

            {appointment.notes && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t("Notes")}
                </h4>
                <p className="text-sm text-foreground bg-muted p-3 rounded-lg">
                  {appointment.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentViewModal;
