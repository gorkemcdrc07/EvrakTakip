import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ljmhjhhpetlavcruwpfx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbWhqaGhwZXRsYXZjcnV3cGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMTIzMDQsImV4cCI6MjA2Mzc4ODMwNH0.Wt_GBkdmi_GjlgCuhrC9HlWd9l00fqNpTrdMUZL4InI'

export const supabase = createClient(supabaseUrl, supabaseKey)
