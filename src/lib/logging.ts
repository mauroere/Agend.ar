type LogLevel = "info" | "warn" | "error";

type LogContext = {
  tenant_id?: string | null;
  location_id?: string | null;
  appointment_id?: string | null;
  patient_id?: string | null;
  job?: string;
  payload?: unknown;
  error?: unknown;
};

export function log(level: LogLevel, message: string, ctx: LogContext = {}) {
  const base = { level, message, timestamp: new Date().toISOString(), ...ctx };
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](JSON.stringify(base));
  return base;
}

export function logInfo(message: string, ctx?: LogContext) {
  return log("info", message, ctx);
}

export function logWarn(message: string, ctx?: LogContext) {
  return log("warn", message, ctx);
}

export function logError(message: string, ctx?: LogContext) {
  return log("error", message, ctx);
}
