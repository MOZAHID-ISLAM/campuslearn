/* CampusLearn - sign-in and roles (browser only).
 *
 * When the backend is set up (see config.js), this file talks to Supabase
 * Auth: sign up, sign in, sign out, and read the user's role from the
 * profiles table. A new account is a student; a faculty member is made
 * by changing one row in the profiles table (see SUPABASE_SETUP.md).
 *
 * When no backend is set up, the app runs in demo mode: there is no
 * sign-in and the role is "demo".
 */
(function () {
  "use strict";

  var config = window.CAMPUSLEARN_CONFIG || {};
  var hasBackend = !!(config.supabaseUrl && config.supabaseAnonKey);
  var client = null;

  function getClient() {
    if (!hasBackend) return null;
    if (!client) {
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error("The Supabase library did not load. Check your internet connection.");
      }
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    }
    return client;
  }

  // The signed-in user, or null. Role comes from the profiles table.
  async function currentUser() {
    if (!hasBackend) return { role: "demo", studentId: null, email: null };
    var sb = getClient();
    var res = await sb.auth.getUser();
    var user = res.data && res.data.user;
    if (!user) return null;
    var prof = await sb.from("profiles").select("role").eq("id", user.id).single();
    var role = prof.data && prof.data.role ? prof.data.role : "student";
    // The student roster row for this user, matched by email.
    var roster = await sb.from("students").select("id").eq("email", user.email).single();
    return {
      id: user.id,
      email: user.email,
      role: role,
      studentId: roster.data && roster.data.id ? roster.data.id : null,
    };
  }

  async function signIn(email, password) {
    var sb = getClient();
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw new Error(res.error.message);
    return currentUser();
  }

  async function signUp(email, password, name) {
    var sb = getClient();
    var res = await sb.auth.signUp({ email: email, password: password });
    if (res.error) throw new Error(res.error.message);
    var user = res.data && res.data.user;
    if (!user) throw new Error("Sign-up did not return a user. Check your email to confirm the account.");
    // New accounts are students. The roster row lets the student enrol.
    // Both inserts must succeed: if one fails, say so instead of
    // signing the user in with a half-made account.
    var roster = await sb.from("students").insert({ id: "s-" + user.id.slice(0, 8), name: name || email, email: email });
    if (roster.error) throw new Error("Could not add you to the student list: " + roster.error.message);
    var prof = await sb.from("profiles").insert({ id: user.id, email: email, display_name: name || email, role: "student" });
    if (prof.error) throw new Error("Could not set up your account: " + prof.error.message);
    return currentUser();
  }

  async function signOut() {
    var sb = getClient();
    await sb.auth.signOut();
  }

  window.CampusLearnAuth = {
    hasBackend: hasBackend,
    getClient: getClient,
    currentUser: currentUser,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
  };
})();
