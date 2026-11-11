"use client";

import { useEffect, useState } from "react";
import Snowfall from "react-snowfall";

// A deliberately temporary seasonal treatment. It expires automatically after
// the first week of January and never animates for reduced-motion visitors.
const SEASON_END = Date.parse("2027-01-06T00:00:00+05:30");

export function SeasonalSnowfall() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setVisible(Date.now() < SEASON_END && !reducedMotion.matches);
    update();
    reducedMotion.addEventListener("change", update);
    return () => reducedMotion.removeEventListener("change", update);
  }, []);

  if (!visible) return null;
  return <div className="seasonal-snow" aria-hidden="true">
    <Snowfall color="#dbeafe" snowflakeCount={46} speed={[0.35, 1.1]} wind={[-0.25, 0.45]} radius={[0.6, 2.2]}/>
  </div>;
}

