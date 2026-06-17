"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { academicYearSchema, type AcademicYearInput } from "./schema";
import { createAcademicYear, setCurrentAcademicYear, deleteAcademicYear } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type AcademicYearRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

export function AcademicTab({
  years,
  canWrite,
}: {
  years: AcademicYearRow[];
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
  });

  async function onAdd(values: AcademicYearInput) {
    const res = await createAcademicYear(values);
    if (res.ok) {
      toast.success("تم إضافة العام الدراسي");
      setOpen(false);
      reset();
    } else {
      toast.error(res.error === "forbidden" ? "ليس لديك صلاحية" : res.error);
    }
  }

  async function onSetCurrent(id: string) {
    setLoadingId(id);
    const res = await setCurrentAcademicYear(id);
    setLoadingId(null);
    if (res.ok) toast.success("تم تعيين العام الحالي");
    else toast.error(res.error);
  }

  async function onDelete(id: string) {
    setLoadingId(id + "_del");
    const res = await deleteAcademicYear(id);
    setLoadingId(null);
    if (res.ok) toast.success("تم الحذف");
    else toast.error(res.error);
  }

  const field = "space-y-1.5";

  return (
    <div className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">الأعوام الدراسية</CardTitle>
          {canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus /> إضافة عام دراسي
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>إضافة عام دراسي جديد</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onAdd)} className="space-y-4">
                  <div className={field}>
                    <Label>اسم العام الدراسي *</Label>
                    <Input placeholder="مثال: 2025/2026" {...register("name")} />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className={field}>
                    <Label>تاريخ البداية *</Label>
                    <Input type="date" {...register("start_date")} />
                    {errors.start_date && (
                      <p className="text-xs text-destructive">{errors.start_date.message}</p>
                    )}
                  </div>
                  <div className={field}>
                    <Label>تاريخ النهاية *</Label>
                    <Input type="date" {...register("end_date")} />
                    {errors.end_date && (
                      <p className="text-xs text-destructive">{errors.end_date.message}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="animate-spin" />} حفظ
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العام الدراسي</TableHead>
                <TableHead>من</TableHead>
                <TableHead>إلى</TableHead>
                <TableHead>الحالة</TableHead>
                {canWrite && <TableHead className="w-28" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    لا توجد أعوام دراسية
                  </TableCell>
                </TableRow>
              )}
              {years.map((y) => (
                <TableRow key={y.id}>
                  <TableCell className="font-medium">{y.name}</TableCell>
                  <TableCell dir="ltr" className="text-start">
                    {y.start_date}
                  </TableCell>
                  <TableCell dir="ltr" className="text-start">
                    {y.end_date}
                  </TableCell>
                  <TableCell>
                    {y.is_current ? (
                      <Badge variant="success">الحالي</Badge>
                    ) : (
                      <Badge variant="secondary">سابق</Badge>
                    )}
                  </TableCell>
                  {canWrite && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!y.is_current && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="تعيين كعام حالي"
                            disabled={loadingId === y.id}
                            onClick={() => onSetCurrent(y.id)}
                          >
                            {loadingId === y.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Star className="h-4 w-4 text-amber-500" />
                            )}
                          </Button>
                        )}
                        {!y.is_current && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="حذف"
                            disabled={loadingId === y.id + "_del"}
                            onClick={() => onDelete(y.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            {loadingId === y.id + "_del" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
