import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-black text-primary">404</p>
      <h1 className="text-xl font-semibold">الصفحة غير موجودة</h1>
      <p className="text-sm text-muted-foreground">عذرًا، تعذّر العثور على الصفحة المطلوبة.</p>
      <Button asChild>
        <Link href="/dashboard">العودة إلى لوحة التحكم</Link>
      </Button>
    </div>
  );
}
