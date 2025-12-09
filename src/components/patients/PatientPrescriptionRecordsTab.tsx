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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, Edit, Download, CheckCircle, MoreVertical } from "lucide-react";
import { useClinic } from "@/contexts/ClinicContext";
import { usePrescriptions, useUpdatePrescriptionStatus } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { Prescription } from "@/types";
import PrescriptionDetailModal from "@/components/modals/PrescriptionDetailModal";
import EditPrescriptionModal from "@/components/modals/EditPrescriptionModal";
import { toast } from "@/hooks/use-toast";
import { generatePrescriptionSlipPDF, type ClinicInfo } from "@/utils/prescriptionSlipPdf";
import NewPrescriptionModal from "@/components/modals/NewPrescriptionModal";
import { Plus } from "lucide-react";

interface PatientPrescriptionRecordsTabProps {
  patientId?: string;
}

const formatDate = (dateValue: string | Date) => {
  const date = new Date(dateValue);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const PatientPrescriptionRecordsTab: React.FC<PatientPrescriptionRecordsTabProps> = ({
  patientId,
}) => {
  const { t } = useTranslation();
  const { currentClinic } = useClinic();
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const updateStatusMutation = useUpdatePrescriptionStatus();

  const { data, isLoading, error, refetch } = usePrescriptions(
    patientId
      ? {
          patient_id: patientId,
          limit: 10,
        }
      : undefined
  );

  const prescriptions = useMemo(
    () => (data as any)?.data?.prescriptions || [],
    [data]
  );

  const handleDownloadSlip = async (prescriptionId: string) => {
    try {
      const prescription = await apiService.getPrescription(prescriptionId);
      const clinicInfo: ClinicInfo = {
        name: currentClinic?.name || "Medical Clinic",
        address: currentClinic?.address
          ? `${currentClinic.address.street}, ${currentClinic.address.city}, ${currentClinic.address.state} ${currentClinic.address.zipCode}`
          : "Clinic Address",
        phone: currentClinic?.contact?.phone || "Phone Number",
        email: currentClinic?.contact?.email || "clinic@email.com",
        website: currentClinic?.contact?.website,
      };

      generatePrescriptionSlipPDF(prescription, clinicInfo, true);
      toast({
        title: t("Prescription Slip Downloaded"),
        description: `${t("Prescription")} ${prescription.prescription_id} ${t("slip has been downloaded.")}`,
      });
    } catch (err: any) {
      toast({
        title: t("Error"),
        description: err.message || t("Failed to download prescription slip."),
        variant: "destructive",
      });
    }
  };

  const handleMarkCompleted = async (prescriptionId: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: prescriptionId, status: "completed" });
      toast({
        title: t("Status updated"),
        description: t("Prescription marked as completed."),
      });
      refetch();
    } catch (err) {
      toast({
        title: t("Error"),
        description: t("Failed to update prescription status."),
        variant: "destructive",
      });
    }
  };

  if (!patientId) {
    return <p className="text-sm text-muted-foreground">{t("Select a patient to view prescriptions.")}</p>;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <NewPrescriptionModal
          preSelectedPatientId={patientId}
          onSuccess={() => refetch()}
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("New Prescription")}
            </Button>
          }
        />
      </div>

      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Doctor")}</TableHead>
              <TableHead>{t("Diagnosis")}</TableHead>
              <TableHead>{t("Medication")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead>{t("Date")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                  </TableRow>
                ))
              : error ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Alert variant="destructive">
                      <AlertDescription>{t("Failed to load prescriptions. Please try again.")}</AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : prescriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    {t("No prescriptions found for this patient.")}
                  </TableCell>
                </TableRow>
              ) : (
                prescriptions.map((prescription: Prescription) => {
                  const doctor: any = (prescription as any).doctor_id;
                  const medications: any[] = (prescription as any).medications || [];
                  const medicationSummary = medications.length
                    ? medications.map((med) => med.name || med.medication || "").filter(Boolean).join(", ")
                    : t("No medications");

                  return (
                    <TableRow key={prescription._id}>
                      <TableCell>{doctor ? `${doctor.first_name} ${doctor.last_name}` : t("Unknown doctor")}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{prescription.diagnosis}</TableCell>
                      <TableCell className="max-w-[240px] truncate">{medicationSummary}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {prescription.status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate((prescription as any).created_at || new Date())}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              <MoreVertical className="h-4 w-4 mr-1" />
                              {t("Actions")}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewId(prescription._id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t("View Details")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditId(prescription._id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t("Edit Prescription")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadSlip(prescription._id)}>
                              <Download className="mr-2 h-4 w-4" />
                              {t("Download Slip")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkCompleted(prescription._id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {t("Mark as Completed")}
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

      <PrescriptionDetailModal
        open={!!viewId}
        onOpenChange={(open) => !open && setViewId(null)}
        prescriptionId={viewId}
      />

      <EditPrescriptionModal
        open={!!editId}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
        prescriptionId={editId}
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
};

export default PatientPrescriptionRecordsTab;
