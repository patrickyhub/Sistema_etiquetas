import { createClient } from '@supabase/supabase-js';

// Reemplaza con tus credenciales de Supabase
const SUPABASE_URL = 'https://poixoakbcfbwmkgddyjl.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_-IiNreLQQA6UNNOlbwLhsA_sm5rp9xQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);