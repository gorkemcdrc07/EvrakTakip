import { createClient } from "@supabase/supabase-js";
import { demoSupabase } from "./demo/demoSupabase";

const demoMode = localStorage.getItem("ets_demo_mode") === "true";
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

const liveClient = demoMode ? null : createClient(SUPABASE_URL, SUPABASE_KEY);
export const supabase = demoMode ? demoSupabase : liveClient;
export const isDemoMode = () => localStorage.getItem("ets_demo_mode") === "true";
export default supabase;
