import { useState, useEffect } from "react";
import useAuthStore from "@/store/authStore";

export function useAvatarUrl() {
  const { avatar } = useAuthStore();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatar) {
      setObjectUrl(null);
      return;
    }

    // If it's already a data URL or absolute URL, use it directly
    if (avatar.startsWith("data:") || avatar.startsWith("http")) {
      setObjectUrl(avatar);
      return;
    }

    setObjectUrl(avatar);
  }, [avatar]);

  return objectUrl;
}

export function invalidateAvatarCache() {
  // no-op — no blob cache in this simplified version
}
