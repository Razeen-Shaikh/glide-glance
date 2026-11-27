"use client";

import { useEffect, useRef } from "react";

export function BagSync() {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void fetch("/api/account").then(async (response) => {
      if (response.ok) await fetch("/api/cart/merge", { method: "POST" });
    });
  }, []);
  return null;
}
