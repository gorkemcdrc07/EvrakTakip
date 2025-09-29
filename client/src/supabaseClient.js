// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    // Dev'de teşhis için log:
    // eslint-disable-next-line no-console
    console.error('Supabase env eksik', {
        url: SUPABASE_URL,
        hasKey: !!SUPABASE_KEY,
    });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export default supabase;
