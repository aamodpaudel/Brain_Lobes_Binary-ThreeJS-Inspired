import { Suspense } from "react";
import { MindScene } from "@/components/mind/MindScene";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <MindScene />
    </Suspense>
  );
}
