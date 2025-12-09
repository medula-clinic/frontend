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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye } from "lucide-react";
import ViewTestReportModal from "@/components/modals/ViewTestReportModal";
import { useTestReports } from "@/hooks/useApi";
import RecordTestReportModal from "@/components/modals/RecordTestReportModal";
import { Plus } from "lucide-react";

interface PatientTestReportsTabProps {
  patientId?: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const formatDate = (dateValue: string | Date) => {
  const date = new Date(dateValue);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const statusColor = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-800";
    case "verified":
      return "bg-blue-100 text-blue-800";
    case "recorded":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

const PatientTestReportsTab: React.FC<PatientTestReportsTabProps> = ({ patientId, patient }) => {
  const { t } = useTranslation();
  const [viewId, setViewId] = useState<string | null>(null);

  const { data, isLoading, error } = useTestReports(
    patientId
      ? {
          patient_id: patientId,
          limit: 10,
        }
      : undefined
  );

  const reports = useMemo(
    () => (data as any)?.data?.items || [],
    [data]
  );

  if (!patientId) {
    return <p className="text-sm text-muted-foreground">{t("Select a patient to view test reports.")}</p>;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <RecordTestReportModal
          preSelectedPatientId={patientId}
          preSelectedPatient={
            patient
              ? {
                  _id: patient.id,
                  first_name: patient.firstName,
                  last_name: patient.lastName,
                }
              : undefined
          }
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("Record Report")}
            </Button>
          }
        />
      </div>

      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Type of Test")}</TableHead>
              <TableHead>{t("Vendor")}</TableHead>
              <TableHead>{t("Test Date")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              : error ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Alert variant="destructive">
                      <AlertDescription>{t("Failed to load test reports. Please try again.")}</AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    {t("No test reports found for this patient.")}
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report: any) => (
                  <TableRow key={report._id}>
                    <TableCell className="font-medium">{report.testName || report.test?.name}</TableCell>
                    <TableCell>{report.externalVendor || report.vendor || t("In-house")}</TableCell>
                    <TableCell>{formatDate(report.testDate || report.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${statusColor(report.status)} capitalize`}>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setViewId(report._id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t("View Details")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
          </TableBody>
        </Table>
      </div>

      <ViewTestReportModal
        open={!!viewId}
        onClose={() => setViewId(null)}
        reportId={viewId}
      />
    </>
  );
};

export default PatientTestReportsTab;
