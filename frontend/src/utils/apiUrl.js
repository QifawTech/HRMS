// Central URL management for API and uploaded static files (images, documents, etc.)

export const getBackendBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  // If window is available (browser runtime)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }
    // Deployed fallback: EC2 IP
    return "http://65.0.221.12:5000";
  }
  return "http://localhost:5000";
};

export const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/$/, "")}/api`;
  }
  return `${getBackendBaseUrl()}/api`;
};

export const getFullFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  const base = getBackendBaseUrl();
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return `${base}${normalized}`;
};

