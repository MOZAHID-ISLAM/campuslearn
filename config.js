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
  supabaseUrl: "",
  supabaseAnonKey: "",
};
