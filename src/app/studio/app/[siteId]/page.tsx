"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SiteHomeRedirect() {
  const { siteId } = useParams<{ siteId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/studio/app/${siteId}/radar`);
  }, [router, siteId]);
  return null;
}
