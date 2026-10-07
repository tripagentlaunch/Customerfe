import { useRemoteConfig } from "../hooks/useRemoteConfig";

export function useWhatsAppNumber(): string | undefined {
  const config = useRemoteConfig();
  return config?.whatsapp_number || undefined;
}