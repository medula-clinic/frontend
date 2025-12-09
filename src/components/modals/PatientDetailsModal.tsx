import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Eye } from "lucide-react";
import { Patient } from "@/types";
import OdontogramDetailModal from "./OdontogramDetailModal";
import odontogramApi from "@/services/api/odontogramApi";
import { toast } from "@/hooks/use-toast";
import PatientDetailsTab from "../patients/PatientDetailsTab";
import PatientAppointmentHistoryTab from "../patients/PatientAppointmentHistoryTab";
import PatientPrescriptionRecordsTab from "../patients/PatientPrescriptionRecordsTab";
import PatientTestReportsTab from "../patients/PatientTestReportsTab";
import PatientInvoicesTab from "../patients/PatientInvoicesTab";

interface PatientDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}

const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  open,
  onOpenChange,
  patient,
}) => {
  const [odontogramModalOpen, setOdontogramModalOpen] = useState(false);
  const [activeOdontogramId, setActiveOdontogramId] = useState<string | null>(null);
  const [loadingOdontogram, setLoadingOdontogram] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const handleViewOdontogram = async () => {
    if (!patient?.id) return;
    
    try {
      setLoadingOdontogram(true);
      
      // Try to get the active odontogram for this patient
      const activeOdontogram = await odontogramApi.getActiveOdontogramByPatient(patient.id);
      setActiveOdontogramId(activeOdontogram._id);
      setOdontogramModalOpen(true);
      
    } catch (error: any) {
      if (error.message.includes("No active odontogram found")) {
        toast({
          title: "No Dental Records",
          description: "No dental chart found for this patient. Please create one first.",
          variant: "default",
        });
      } else {
        console.error("Error fetching odontogram:", error);
        toast({
          title: "Error",
          description: "Failed to load dental chart",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingOdontogram(false);
    }
  };

  useEffect(() => {
    if (open) {
      setActiveTab("details");
    }
  }, [open, patient?.id]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center text-xl font-semibold">
              <Eye className="h-5 w-5 mr-3 text-blue-600" />
              Patient Details
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              Complete patient information and records
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-muted">
              <TabsTrigger value="details">Patient Details</TabsTrigger>
              <TabsTrigger value="appointments">Appointment History</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescription Records</TabsTrigger>
              <TabsTrigger value="tests">Test Reports</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>

            <div className="max-h-[calc(90vh-210px)] overflow-y-auto px-1">
              <TabsContent value="details" className="mt-4">
                <PatientDetailsTab patient={patient} />
              </TabsContent>

              <TabsContent value="appointments" className="mt-4">
                {patient?.id ? (
                  <PatientAppointmentHistoryTab
                    patientId={patient.id}
                    patientName={`${patient.firstName || ""} ${patient.lastName || ""}`.trim()}
                    patient={patient}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Select a patient to view appointment history.</p>
                )}
              </TabsContent>

              <TabsContent value="prescriptions" className="mt-4">
                {patient?.id ? (
                  <PatientPrescriptionRecordsTab patientId={patient.id} patient={patient} />
                ) : (
                  <p className="text-sm text-muted-foreground">Select a patient to view prescriptions.</p>
                )}
              </TabsContent>

              <TabsContent value="tests" className="mt-4">
                {patient?.id ? (
                  <PatientTestReportsTab patientId={patient.id} patient={patient} />
                ) : (
                  <p className="text-sm text-muted-foreground">Select a patient to view test reports.</p>
                )}
              </TabsContent>

              <TabsContent value="invoices" className="mt-4">
                {patient?.id ? (
                  <PatientInvoicesTab patientId={patient.id} patient={patient} />
                ) : (
                  <p className="text-sm text-muted-foreground">Select a patient to view invoices.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <div className="border-t pt-4 flex justify-end mt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="min-w-[100px]"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Odontogram Detail Modal */}
      <OdontogramDetailModal
        open={odontogramModalOpen}
        onOpenChange={setOdontogramModalOpen}
        odontogramId={activeOdontogramId}
        editable={true}
      />
    </>
  );
};

export default PatientDetailsModal;
