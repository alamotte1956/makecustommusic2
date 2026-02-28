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
      abcjs.renderAbc(containerRef.current, abcNotation, {
        responsive: "resize",
        staffwidth: 700,
        paddingtop: 10,
        paddingbottom: 10,
        paddingleft: 10,
        paddingright: 10,
      });
    }
  }, [abcNotation]);

  return (
    <div
      ref={containerRef}
      className={`abcjs-container bg-white rounded-lg p-4 ${className}`}
    />
  );
}
