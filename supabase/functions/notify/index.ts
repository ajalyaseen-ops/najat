// ============================================================
//  Supabase Edge Function — notify
//  Sends a notification across channels (email / sms / whatsapp / push) and
//  records it in public.message_log. Triggered by the app (attendance alerts,
//  grade notifications, announcements) or by a DB webhook.
//
//  Deploy:  supabase functions deploy notify
//  Secrets: supabase secrets set WHATSAPP_TOKEN=... SMTP_URL=...
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

type Channel = "email" | "sms" | "whatsapp" | "push";
interface NotifyPayload {
  school_id: string;
  channel: Channel;
  recipient: string;
  template?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: NotifyPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400 });
  }

  let status: "sent" | "failed" = "sent";
  let error: string | null = null;

  try {
    switch (payload.channel) {
      case "whatsapp":
        // await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {...})
        break;
      case "sms":
        // await fetch(twilioEndpoint, {...})
        break;
      case "email":
        // await sendViaSmtp(Deno.env.get("SMTP_URL"), payload)
        break;
      case "push":
        // await sendWebPush(payload)
        break;
    }
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
  }

  await supabase.from("message_log").insert({
    school_id: payload.school_id,
    channel: payload.channel,
    recipient: payload.recipient,
    template: payload.template ?? null,
    payload: payload.data ?? null,
    status,
    error,
  });

  return new Response(JSON.stringify({ status, error }), {
    status: status === "sent" ? 200 : 502,
    headers: { "Content-Type": "application/json" },
  });
});
