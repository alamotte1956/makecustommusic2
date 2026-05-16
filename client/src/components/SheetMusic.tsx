import { useEffect, useRef } from "react";
import abcjs from "abcjs";

interface SheetMusicProps {
  abcNotation: string;
  className?: string;
}

export default function SheetMusic({ abcNotation, className = "" }: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && abcNotation) {
      containerRef.current.innerHTML = "";
      const rect = containerRef.current.getBoundingClientRect();
      const staffWidth = Math.max(300, Math.floor((rect.width || 700) - 40));

      abcjs.renderAbc(containerRef.current, abcNotation, {
        responsive: "resize",
        staffwidth: staffWidth,
        paddingtop: 10,
        paddingbottom: 10,
        paddingleft: 10,
        paddingright: 10,
        add_classes: true,
        wrap: {
          minSpacing: 1.8,
          maxSpacing: 2.8,
          preferredMeasuresPerLine: 4,
        },
      });
    }
  }, [abcNotation]);

  return (
    <div
      ref={containerRef}
      className={`abcjs-container bg-white rounded-lg p-4 overflow-visible ${className}`}
      style={{ height: "auto" }}
    />
  );
}
