import { Scene } from "@/components/Scene";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <Scene />
      </div>
    </main>
  );
}
