import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Patient {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  cpf: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const usePatients = (search: string) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["patients", profile?.tenant_id, search],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select("*")
        .eq("tenant_id", profile!.tenant_id)
        .order("full_name", { ascending: true });

      if (search.trim()) {
        query = query.ilike("full_name", `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Patient[];
    },
  });
};

export const usePatientById = (id: string | null) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["patient", id],
    enabled: !!id && !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as Patient;
    },
  });
};

interface CreatePatientInput {
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  cpf?: string;
  address?: string;
  notes?: string;
}

export const useCreatePatient = () => {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      if (!profile?.tenant_id || !user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("patients")
        .insert({
          tenant_id: profile.tenant_id,
          created_by: user.id,
          full_name: input.full_name,
          email: input.email || null,
          phone: input.phone || null,
          date_of_birth: input.date_of_birth || null,
          gender: input.gender || null,
          cpf: input.cpf || null,
          address: input.address || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
};

export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreatePatientInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("patients")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", data.id] });
    },
  });
};

export const useDeletePatient = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.tenant_id) throw new Error("Tenant não encontrado");

      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", id)
        .eq("tenant_id", profile.tenant_id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
    },
  });
};
