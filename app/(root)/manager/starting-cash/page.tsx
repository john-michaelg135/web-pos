import { redirect } from "next/navigation";

export const metadata = {
  title: "Bren Raphael's | Point of Sale System",
  description: "Review the starting cash declared by cashiers.",
};

export default function StartingCashPage() {
  redirect("/manager/reports?tab=money-audit");
}
