"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ADSENSE_CLIENT_ID, isMonetizedRoute } from "@/lib/adsense";

const SCRIPT_ID = "brokenrepo-adsense";

export function AdSenseLoader() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isMonetizedRoute(pathname)) return;

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) return;

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    document.head.appendChild(script);

    return () => {
      script.remove();
      document.querySelectorAll("ins.adsbygoogle").forEach((element) => element.remove());
    };
  }, [pathname]);

  return null;
}
