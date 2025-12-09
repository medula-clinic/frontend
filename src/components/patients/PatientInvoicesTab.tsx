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
import { Eye, Download, DollarSign, CheckCircle, Edit, Trash2, MoreVertical } from "lucide-react";
import { useClinic } from "@/contexts/ClinicContext";
import { useInvoices } from "@/hooks/useApi";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { apiService, type Invoice } from "@/services/api";
import { InvoicePDFGenerator, type ClinicInfo } from "@/utils/invoicePdfUtils";
import ViewInvoiceModal from "@/components/modals/ViewInvoiceModal";
import EditInvoiceModal from "@/components/modals/EditInvoiceModal";
import DeleteInvoiceModal from "@/components/modals/DeleteInvoiceModal";
import RecordPaymentModal from "@/components/modals/RecordPaymentModal";
import { toast } from "@/hooks/use-toast";

interface PatientInvoicesTabProps {
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

const statusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800";
    case "partial":
      return "bg-orange-100 text-orange-800";
    case "overdue":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const PatientInvoicesTab: React.FC<PatientInvoicesTabProps> = ({ patientId }) => {
  const { t } = useTranslation();
  const { currentClinic } = useClinic();

  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const { data, isLoading, error, refetch } = useInvoices(
    patientId
      ? {
          patient_id: patientId,
          limit: 10,
        }
      : undefined
  );

  const invoices = useMemo(
    () => (data as any)?.data?.invoices || [],
    [data]
  );

  const handleDownload = async (invoiceId: string) => {
    try {
      const invoiceData = await apiService.getInvoice(invoiceId);
      const clinicInfo: ClinicInfo | undefined = currentClinic
        ? {
            name: currentClinic.name,
            address: currentClinic.address,
            contact: currentClinic.contact,
          }
        : undefined;

      await InvoicePDFGenerator.generateInvoicePDF(invoiceData, clinicInfo);
      toast({
        title: t("Download Started"),
        description: t("Invoice PDF is being downloaded."),
      });
    } catch (err) {
      toast({
        title: t("Error"),
        description: t("Failed to download invoice PDF. Please try again."),
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await apiService.updateInvoice(invoiceId, { status: "paid" });
      toast({
        title: t("Payment Recorded"),
        description: `${t("Invoice")} ${invoiceId} ${t("has been marked as paid.")}`,
      });
      refetch();
    } catch (err) {
      toast({
        title: t("Error"),
        description: t("Failed to update invoice status."),
        variant: "destructive",
      });
    }
  };

  if (!patientId) {
    return <p className="text-sm text-muted-foreground">{t("Select a patient to view invoices.")}</p>;
  }

  return (
    <>
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Issue Date")}</TableHead>
              <TableHead>{t("Due Date")}</TableHead>
              <TableHead>{t("Amount")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                  </TableRow>
                ))
              : error ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Alert variant="destructive">
                      <AlertDescription>{t("Failed to load invoices. Please try again.")}</AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    {t("No invoices found for this patient.")}
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice: Invoice) => {
                  const issueDate = (invoice as any).issue_date || (invoice as any).created_at;
                  return (
                    <TableRow key={invoice._id}>
                      <TableCell>{issueDate ? formatDate(issueDate) : t("N/A")}</TableCell>
                      <TableCell>{invoice.due_date ? formatDate(invoice.due_date as any) : t("N/A")}</TableCell>
                      <TableCell>
                        <CurrencyDisplay amount={(invoice as any).total_amount || 0} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusBadge(invoice.status)} capitalize`}>
                          {invoice.status}
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
                            <DropdownMenuItem onClick={() => setViewId(invoice._id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t("View Invoice")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(invoice._id)}>
                              <Download className="mr-2 h-4 w-4" />
                              {t("Download PDF")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPaymentInvoice(invoice)}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              {t("Record Payment")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkPaid(invoice._id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {t("Mark as Paid")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditId(invoice._id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t("Edit Invoice")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(invoice._id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("Delete Invoice")}
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

      <ViewInvoiceModal
        isOpen={!!viewId}
        onClose={() => setViewId(null)}
        invoiceId={viewId}
      />
      <EditInvoiceModal
        isOpen={!!editId}
        onClose={() => setEditId(null)}
        invoiceId={editId}
        onSuccess={() => refetch()}
      />
      <DeleteInvoiceModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        invoiceId={deleteId}
        onSuccess={() => refetch()}
      />
      <RecordPaymentModal
        isOpen={!!paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        invoice={paymentInvoice}
        onSuccess={() => {
          setPaymentInvoice(null);
          refetch();
        }}
      />
    </>
  );
};

export default PatientInvoicesTab;
