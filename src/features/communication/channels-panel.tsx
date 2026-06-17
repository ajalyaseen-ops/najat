"use client";

import { Mail, MessageSquare, Bell, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Channel = {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: "active" | "coming_soon";
};

const CHANNELS: Channel[] = [
  {
    key: "push",
    label: "إشعارات التطبيق",
    description: "إشعارات فورية داخل تطبيق مدرستي للجوال والويب",
    icon: <Bell className="h-6 w-6" />,
    status: "active",
  },
  {
    key: "email",
    label: "البريد الإلكتروني",
    description: "إرسال رسائل بريدية منسّقة عبر Resend أو SendGrid",
    icon: <Mail className="h-6 w-6" />,
    status: "coming_soon",
  },
  {
    key: "sms",
    label: "الرسائل القصيرة (SMS)",
    description: "رسائل نصية عبر Twilio أو مزوّد SMS محلي",
    icon: <Phone className="h-6 w-6" />,
    status: "coming_soon",
  },
  {
    key: "whatsapp",
    label: "واتساب",
    description: "رسائل واتساب عبر WhatsApp Business API أو Twilio",
    icon: <MessageSquare className="h-6 w-6" />,
    status: "coming_soon",
  },
];

export function ChannelsPanel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        قنوات التواصل تُوصَّل عبر Edge Functions في Supabase. القناة النشطة حالياً هي الإشعارات
        الداخلية؛ وسيتم تفعيل البريد الإلكتروني والرسائل القصيرة وواتساب تدريجياً.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {CHANNELS.map((ch) => (
          <Card key={ch.key} className="flex items-start gap-4 rounded-xl p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {ch.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{ch.label}</span>
                {ch.status === "active" ? (
                  <Badge variant="success">نشط</Badge>
                ) : (
                  <Badge variant="secondary">قريباً</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ch.description}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <strong>ملاحظة للمطوّرين:</strong> لتفعيل قناة، أنشئ Edge Function باسم{" "}
        <code className="rounded bg-muted px-1">send-{"{channel}"}</code> وأضف المتغيرات البيئية
        المطلوبة (مفاتيح API) في إعدادات المشروع على Supabase.
      </div>
    </div>
  );
}
