"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { announcementSchema, AUDIENCE_OPTIONS, type AnnouncementInput } from "./schema";
import { createAnnouncement } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AUDIENCE_LABELS: Record<string, string> = {
  all: "الجميع",
  teachers: "المعلمون",
  parents: "أولياء الأمور",
  students: "الطلاب",
};

export function AnnouncementFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { audience: "all" },
  });

  async function onSubmit(values: AnnouncementInput) {
    const res = await createAnnouncement(values);
    if (res.ok) {
      toast.success("تم إرسال الإعلان بنجاح");
      setOpen(false);
      reset();
    } else {
      toast.error(res.error === "forbidden" ? "غير مصرح" : res.error);
    }
  }

  const field = "space-y-1.5";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إنشاء إعلان جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className={field}>
            <Label>عنوان الإعلان *</Label>
            <Input {...register("title")} placeholder="مثال: اجتماع أولياء الأمور" />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className={field}>
            <Label>نص الإعلان</Label>
            <textarea
              {...register("body")}
              rows={5}
              placeholder="أدخل نص الإعلان هنا…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className={field}>
            <Label>الجمهور المستهدف</Label>
            <Select
              value={watch("audience")}
              onValueChange={(v) => setValue("audience", v as AnnouncementInput["audience"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {AUDIENCE_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={field}>
            <Label>تاريخ النشر (اختياري)</Label>
            <Input type="datetime-local" {...register("published_at")} dir="ltr" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />} إرسال الإعلان
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
