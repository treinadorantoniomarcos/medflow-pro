import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AppointmentAudioPlayerProps {
  audioPath: string | null;
  bucketName?: string;
}

const AppointmentAudioPlayer = ({ audioPath, bucketName = "appointment-audios" }: AppointmentAudioPlayerProps) => {
  const { data: signedUrl } = useQuery({
    queryKey: ["appointment-audio-url", bucketName, audioPath],
    enabled: !!audioPath,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      if (!audioPath) return null;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(audioPath, 3600);

      if (error) throw error;
      return data.signedUrl;
    },
  });

  if (!audioPath || !signedUrl) return null;

  return (
    <audio controls preload="none" className="w-full max-w-sm">
      <source src={signedUrl} />
      Seu navegador não suporta áudio.
    </audio>
  );
};

export default AppointmentAudioPlayer;
