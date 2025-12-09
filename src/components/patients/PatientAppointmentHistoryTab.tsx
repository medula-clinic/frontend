import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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
import { useAppointments } from "@/hooks/useApi";
import { Calendar, Clock, Eye, Stethoscope } from "lucide-react";

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

  if (!patientId) {
    return <p className="text-sm text-muted-foreground">{t("Select a patient to view appointments.")}</p>;
  }

  return (
    <>
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
                        <Button size="sm" variant="outline" onClick={() => setSelectedAppointment(appointment)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t("View Details")}
                        </Button>
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
    </>
  );
};

export default PatientAppointmentHistoryTab;
