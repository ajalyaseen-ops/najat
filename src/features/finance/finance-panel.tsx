"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Pencil,
  ReceiptText,
  Layers,
} from "lucide-react";
import { FeeStructureFormDialog } from "./fee-structure-form";
import type { FeeStructureInput } from "./schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ──────────────────────────────────────────────────────────────────

export type FeeStructureRow = {
  id: string;
  name: string;
  amount: number;
  grade_level_id: string | null;
  academic_year_id: string | null;
  created_at: string;
  grade_levels: { name: string } | null;
  academic_years: { name: string } | null;
};

export type InvoiceRow = {
  id: string;
  number: string | null;
  total: number;
  discount: number;
  status: "unpaid" | "partial" | "paid" | "void";
  due_date: string | null;
  created_at: string;
  students: { name_ar: string } | null;
  academic_years: { name: string } | null;
};

type GradeOption = { id: string; name: string };
type YearOption = { id: string; name: string };

// ── Status helpers ─────────────────────────────────────────────────────────

const INVOICE_STATUS_LABEL: Record<InvoiceRow["status"], string> = {
  unpaid: "غير مدفوعة",
  partial: "مدفوعة جزئياً",
  paid: "مدفوعة",
  void: "ملغاة",
};

const INVOICE_STATUS_VARIANT: Record<
  InvoiceRow["status"],
  "destructive" | "warning" | "success" | "secondary"
> = {
  unpaid: "destructive",
  partial: "warning",
  paid: "success",
  void: "secondary",
};

// ── Component ──────────────────────────────────────────────────────────────

export function FinancePanel({
  feeStructures,
  invoices,
  gradeLevels,
  academicYears,
  canWrite,
}: {
  feeStructures: FeeStructureRow[];
  invoices: InvoiceRow[];
  gradeLevels: GradeOption[];
  academicYears: YearOption[];
  canWrite: boolean;
}) {
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [feeQuery, setFeeQuery] = useState("");

  const filteredInvoices = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      [inv.number, inv.students?.name_ar, inv.academic_years?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [invoices, invoiceQuery]);

  const filteredFees = useMemo(() => {
    const q = feeQuery.trim().toLowerCase();
    if (!q) return feeStructures;
    return feeStructures.filter((f) =>
      [f.name, f.grade_levels?.name, f.academic_years?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [feeStructures, feeQuery]);

  function formatAmount(n: number) {
    return n.toLocaleString("ar-KW", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }

  // ── Summary stats ──────────────────────────────────────────────────────

  const totalIssued = invoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total - i.discount, 0);
  const totalUnpaid = invoices
    .filter((i) => i.status === "unpaid")
    .reduce((s, i) => s + i.total - i.discount, 0);

  return (
    <div className="space-y-6">
      {/* ── Summary cards ── */}
      {invoices.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">إجمالي الفواتير</p>
            <p className="mt-1 text-2xl font-bold">{invoices.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">المبلغ الإجمالي</p>
            <p className="mt-1 text-2xl font-bold dir-ltr text-start">
              {formatAmount(totalIssued)} <span className="text-sm font-normal">د.ك</span>
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">المدفوع / المتبقي</p>
            <p className="mt-1 text-lg font-bold">
              <span className="text-success">{formatAmount(totalPaid)}</span>
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-destructive">{formatAmount(totalUnpaid)}</span>
              <span className="ms-1 text-sm font-normal text-muted-foreground">د.ك</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="invoices">
        <TabsList className="mb-4">
          <TabsTrigger value="invoices" className="gap-2">
            <ReceiptText className="h-4 w-4" />
            الفواتير
            {invoices.length > 0 && (
              <Badge variant="secondary" className="ms-1 text-xs">
                {invoices.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="fee-structures" className="gap-2">
            <Layers className="h-4 w-4" />
            هياكل الرسوم
            {feeStructures.length > 0 && (
              <Badge variant="secondary" className="ms-1 text-xs">
                {feeStructures.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Invoices tab ── */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder="بحث في الفواتير..."
              className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>الطالب</TableHead>
                  <TableHead>العام الدراسي</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>الخصم</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      لا توجد فواتير
                    </TableCell>
                  </TableRow>
                )}
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell dir="ltr" className="text-start font-mono text-sm">
                      {inv.number ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {inv.students?.name_ar ?? "—"}
                    </TableCell>
                    <TableCell>{inv.academic_years?.name ?? "—"}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {formatAmount(inv.total)}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {inv.discount > 0 ? formatAmount(inv.discount) : "—"}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {inv.due_date ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={INVOICE_STATUS_VARIANT[inv.status]}>
                        {INVOICE_STATUS_LABEL[inv.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Fee structures tab ── */}
        <TabsContent value="fee-structures" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={feeQuery}
                onChange={(e) => setFeeQuery(e.target.value)}
                placeholder="بحث في هياكل الرسوم..."
                className="h-10 w-full rounded-md border border-input bg-background ps-9 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {canWrite && (
              <FeeStructureFormDialog
                gradeLevels={gradeLevels}
                academicYears={academicYears}
                trigger={
                  <Button>
                    <Plus /> إضافة هيكل رسوم
                  </Button>
                }
              />
            )}
          </div>

          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>المرحلة الدراسية</TableHead>
                  <TableHead>العام الدراسي</TableHead>
                  <TableHead>المبلغ (د.ك)</TableHead>
                  {canWrite && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFees.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canWrite ? 5 : 4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      لا توجد هياكل رسوم بعد
                    </TableCell>
                  </TableRow>
                )}
                {filteredFees.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>{f.grade_levels?.name ?? "جميع المراحل"}</TableCell>
                    <TableCell>{f.academic_years?.name ?? "—"}</TableCell>
                    <TableCell dir="ltr" className="text-start font-mono">
                      {formatAmount(f.amount)}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <FeeStructureFormDialog
                          id={f.id}
                          gradeLevels={gradeLevels}
                          academicYears={academicYears}
                          initial={{
                            name: f.name,
                            amount: f.amount,
                            grade_level_id: f.grade_level_id,
                            academic_year_id: f.academic_year_id,
                          }}
                          trigger={
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
