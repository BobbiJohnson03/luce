import { Suspense } from "react";
import { NotesHome } from "@/components/notes/NotesHome";

export default function NotesIndexPage() {
  // NotesHome reads the folder query param via useSearchParams, hence Suspense.
  return (
    <Suspense fallback={null}>
      <NotesHome />
    </Suspense>
  );
}
