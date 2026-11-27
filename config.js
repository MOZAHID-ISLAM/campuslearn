/* CampusLearn - backend settings.
 *
 * Fill in the two values after creating the Supabase project and running
 * supabase/migrations/0001_schema.sql (see SUPABASE_SETUP.md).
 * Until then both stay empty and the app runs in demo mode: no sign-in,
 * data saved only in this browser.
 *
 * The anon key is safe to show in this file: it only lets the app talk to
 * the database, and the database rules (RLS) decide what each signed-in
 * user may read or write. Never put the service_role key here.
 */
window.CAMPUSLEARN_CONFIG = {
  supabaseUrl: "https://etbhpcohyjolabmhllrx.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YmhwY29oeWpvbGFibWhsbHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU3ODUzMzYsImV4cCI6MjExMTM2MTMzNn0.cw9uzSEABqzuSzQcYBdWCtBNkHImuDPo8HW7Dantvq0",
};
