import { redirect } from "next/navigation";

export default function VocabularyRedirect() {
  redirect("/history?tab=vocab");
}
