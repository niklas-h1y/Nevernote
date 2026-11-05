import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://huddmhlvwyzonsowstdr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ySGF9EEv8WgM9aRDLkTBsw_e72_yW8G";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const authPanel = $("auth-panel");
const composePanel = $("compose-panel");
const alreadyPosted = $("already-posted");
const statusMessage = $("status-message");
const authForm = $("auth-form");
const noteForm = $("note-form");
const noteContent = $("note-content");
const publishButton = $("publish-button");
const signInButton = $("sign-in-button");
const signUpButton = $("sign-up-button");
const guestButton = $("guest-button");

function setMessage(message = "", type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status-message" + (type ? " " + type : "");
}

function friendlyError(error) {
  const message = error?.message || "Something went wrong. Please try again.";
  if (/already registered/i.test(message)) return "That email already has an account. Try signing in.";
  if (/invalid login credentials/i.test(message)) return "Email or password doesn't look right.";
  if (/rate limit/i.test(message)) return "Too many attempts. Please wait a little and try again.";
  if (/anonymous.*disabled|anonymous sign-ins are disabled/i.test(message)) return "Guest mode isn't enabled yet. The site owner needs to enable Anonymous Sign-Ins in Supabase Authentication settings.";
  if (/duplicate key|unique constraint/i.test(message)) return "This account has already published its one note.";
  return message;
}

async function refreshNotes() {
  const { data, error, count } = await supabase
    .from("notes")
    .select("id, content, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    $("note-count").textContent = "Archive unavailable";
    $("notes-list").replaceChildren();
    return;
  }
  $("note-count").textContent = `${count ?? data.length} ${(count ?? data.length) === 1 ? "note" : "notes"}`;
  $("notes-list").replaceChildren();
  $("empty-state").classList.toggle("hidden", data.length !== 0);
  for (const note of data) {
    const card = document.createElement("article");
    card.className = "note-card";
    const text = document.createElement("p");
    text.className = "note-text";
    text.textContent = note.content;
    const date = document.createElement("time");
    date.className = "note-date";
    date.dateTime = note.created_at;
    date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(note.created_at));
    card.append(text, date);
    $("notes-list").append(card);
  }
}

async function updateSession() {
  const { data: { user } } = await supabase.auth.getUser();
  $("session-label").textContent = user ? (user.is_anonymous ? "Guest session" : user.email) : "A note that stays.";
  $("sign-out").textContent = user?.is_anonymous ? "End guest session" : "Sign out";
  $("sign-out").classList.toggle("hidden", !user);
  authPanel.classList.toggle("hidden", !!user);
  composePanel.classList.add("hidden");
  alreadyPosted.classList.add("hidden");
  setMessage();
  if (!user) return;

  const { data: existing, error } = await supabase
    .from("notes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    setMessage("We couldn't check your note yet. Please refresh and try again.");
    return;
  }
  if (existing) alreadyPosted.classList.remove("hidden");
  else composePanel.classList.remove("hidden");
}

async function authenticate(mode) {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return setMessage("Enter your email and password.");
  signInButton.disabled = true;
  signUpButton.disabled = true;
  guestButton.disabled = true;
  setMessage(mode === "signup" ? "Creating your account…" : "Signing you in…");
  try {
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) {
        setMessage("Account created. Check your email for a confirmation link, then come back to sign in.", "success");
      } else {
        setMessage("Welcome. Your account is ready.", "success");
        await updateSession();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await updateSession();
    }
  } catch (error) {
    setMessage(friendlyError(error));
  } finally {
    signInButton.disabled = false;
    signUpButton.disabled = false;
    guestButton.disabled = false;
  }
}

async function startGuestSession() {
  guestButton.disabled = true;
  signInButton.disabled = true;
  signUpButton.disabled = true;
  setMessage("Starting a guest session…");
  try {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    await updateSession();
  } catch (error) {
    setMessage(friendlyError(error));
  } finally {
    guestButton.disabled = false;
    signInButton.disabled = false;
    signUpButton.disabled = false;
  }
}

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  authenticate("signin");
});
signUpButton.addEventListener("click", () => authenticate("signup"));
guestButton.addEventListener("click", startGuestSession);
$("sign-out").addEventListener("click", async () => {
  await supabase.auth.signOut();
  await updateSession();
});
noteContent.addEventListener("input", () => {
  $("char-count").textContent = `${noteContent.value.length} / 1000`;
});
noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = noteContent.value.trim();
  if (!content) return setMessage("Write something before publishing.");
  if (content.length > 1000) return setMessage("Your note must be 1,000 characters or fewer.");
  publishButton.disabled = true;
  setMessage("Leaving your note in the archive…");
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Please start a session again.");
    const { error } = await supabase.from("notes").insert({ user_id: user.id, content });
    if (error) throw error;
    noteContent.value = "";
    $("char-count").textContent = "0 / 1000";
    setMessage("Your note is published. Thank you for leaving a piece of yourself here.", "success");
    await updateSession();
    await refreshNotes();
  } catch (error) {
    setMessage(friendlyError(error));
  } finally {
    publishButton.disabled = false;
  }
});

supabase.auth.onAuthStateChange(() => {
  setTimeout(() => { updateSession(); }, 0);
});
await updateSession();
await refreshNotes();
