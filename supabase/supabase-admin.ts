import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * @param Client Supabase avec privilèges administrateur
 *
 * Utilisé côté serveur pour les opérations nécessitant des privilèges élevés
 * comme la suppression d'utilisateurs en cas d'erreur
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
