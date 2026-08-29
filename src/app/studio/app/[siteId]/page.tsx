"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SiteHomeRedirect() {
  const { siteId } = useParams<{ siteId: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/studio/app/${siteId}/aether`);
  }, [router, siteId]);
  return null;
}
