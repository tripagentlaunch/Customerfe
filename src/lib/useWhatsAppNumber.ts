import { useRemoteConfig } from "./useRemoteConfig";

export function useWhatsAppNumber(): string | undefined {
  const config = useRemoteConfig();
  return config?.whatsapp_number || undefined;
}