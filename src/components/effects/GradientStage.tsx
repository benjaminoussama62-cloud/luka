"use client";

/** Fond dégradé animé — sans silhouette RDC */
export function GradientStage() {
  return (
    <div className="ayeba-gradient-stage" aria-hidden>
      <div className="ayeba-gradient-blob ayeba-gradient-blob-a" />
      <div className="ayeba-gradient-blob ayeba-gradient-blob-b" />
      <div className="ayeba-gradient-blob ayeba-gradient-blob-c" />
    </div>
  );
}
