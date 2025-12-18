function toggleMenu(event) {
  if (event) event.stopPropagation();

  const menu = document.getElementById("mobile-menu");
  const menuIcon = document.getElementById("menu-icon");
  const closeIcon = document.getElementById("close-icon");

  if (!menu) return;

  const isOpen = menu.classList.toggle("active");

  // Ikonat
  if (menuIcon && closeIcon) {
    menuIcon.style.display = isOpen ? "none" : "block";
    closeIcon.style.display = isOpen ? "block" : "none";
  }

  // Mbyll user menu nëse është hapur
  const userMenu = document.getElementById("user-menu");
  if (userMenu) userMenu.classList.remove("open");
}



function openFullscreen() {
  let v = document.getElementById("v");
  v.hidden = false;
  v.play();
  v.requestFullscreen();
}
const API_BASE = "http://localhost:5000"; // Flask API
let authMode = "login"; // or 'signup'

function getToken() {
  return localStorage.getItem("treedoc_token");
}

function setToken(t) {
  localStorage.setItem("treedoc_token", t);
}

function clearToken() {
  localStorage.removeItem("treedoc_token");
}



function getUser(){
  try { return JSON.parse(localStorage.getItem("treedoc_user") || "null"); }
  catch { return null; }
}
function setUser(u){
  localStorage.setItem("treedoc_user", JSON.stringify(u));
}
function clearUser(){
  localStorage.removeItem("treedoc_user");
}
function initials(fullName){
  if(!fullName) return "U";
  const parts = fullName.trim().split(/\s+/);
  const a = parts[0]?.[0] || "U";
  const b = parts.length > 1 ? parts[parts.length-1][0] : "";
  return (a + b).toUpperCase();
}
function renderNavbarAuth(){
  const token = getToken();
  const user = getUser();

  const authActions = document.getElementById("auth-actions");
  const userPill = document.getElementById("user-pill");
  const userName = document.getElementById("user-name");
  const userAvatar = document.getElementById("user-avatar");

  if(token && user){
    authActions?.classList.add("hidden");
    userPill?.classList.remove("hidden");

    userName.textContent = user.full_name || user.email || "User";

    if(user.avatar_url){
      userAvatar.innerHTML = `<img src="${user.avatar_url}" alt="avatar">`;
    } else {
      userAvatar.textContent = initials(user.full_name || user.email);
      userAvatar.innerHTML = userAvatar.textContent;
    }
  } else {
    authActions?.classList.remove("hidden");
    userPill?.classList.add("hidden");
    closeUserMenu();
  }
}
function openAuth(e, mode) {
  if (e) e.preventDefault();
  authMode = mode;
  document.getElementById("authTitle").innerText = mode === "login" ? "Log in" : "Sign up";
  document.getElementById("switchText").innerText = mode === "login" ? "Nuk ke account?" : "Ke account?";
  document.getElementById("authMsg").style.display = "none";
  document.getElementById("authEmail").value = "";
  document.getElementById("authPass").value = "";
  document.getElementById("authModal").classList.remove("hidden");
}

function closeAuth() {
  document.getElementById("authModal").classList.add("hidden");
}

function modalBackdropClose(event){
  if(event.target.id === "authModal") closeAuth();
}

function toggleAuthMode(){
  authMode = authMode === "login" ? "signup" : "login";
  openAuth(null, authMode);
}

async function submitAuth() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPass").value;

  if (!email || !password) return showAuthError("Plotëso email & password.");

  const endpoint = authMode === "login" ? "/login" : "/signup";

  try {
    const res = await fetch(API_BASE + endpoint, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) return showAuthError(data.error || "Gabim.");

    setToken(data.token);

// ruaj user-in (nëse API e kthen), ose provo ta marrësh nga /me
if (data.user) {
  setUser(data.user);
} else {
  try {
    const meRes = await fetch(API_BASE + "/me", {
      headers: { "Authorization": "Bearer " + data.token }
    });
    const meData = await meRes.json();
    if (meRes.ok && meData.user) setUser(meData.user);
  } catch (e) { /* ignore */ }
}

closeAuth();
renderNavbarAuth();
await refreshMyPlantsUI();
// çoje user te My Plants
location.hash = "#my-plants";
  } catch (err) {
    showAuthError("Nuk u lidh me serverin (API).");
  }
}

function showAuthError(msg){
  const el = document.getElementById("authMsg");
  el.innerText = msg;
  el.style.display = "block";
}

async function openMyPlants(e) {
  if (e) e.preventDefault();
  location.hash = "#my-plants";
  await refreshMyPlantsUI();
}

async function refreshMyPlantsUI(){
  const token = getToken();
  const locked = document.getElementById("myplants-locked");
  const app = document.getElementById("myplants-app");

  if (!token) {
    locked.style.display = "block";
    app.style.display = "none";
    return;
  }

  locked.style.display = "none";
  app.style.display = "block";
  await loadPlants();
}

async function loadPlants(){
  const token = getToken();
  const list = document.getElementById("plantsList");
  list.innerHTML = "Duke ngarkuar...";

  const res = await fetch(API_BASE + "/plants", {
    headers: { "Authorization": "Bearer " + token }
  });
  const data = await res.json();
  if (!res.ok) {
    list.innerHTML = "<p style='color:#b91c1c;'>Session ka skaduar. Logohu prapë.</p>";
    clearToken();
    await refreshMyPlantsUI();
    return;
  }

  if (!data.plants.length) {
    list.innerHTML = "<p>Nuk ke asnjë bimë ende.</p>";
    return;
  }

  list.innerHTML = data.plants.map(p => `
    <div style="display:flex; justify-content:space-between; padding:12px; border:1px solid #e5e7eb; border-radius:12px; margin-top:10px;">
      <div><b>${escapeHtml(p.name)}</b><div style="color:#6b7280; font-size:12px;">${p.created_at}</div></div>
      <button class="btn btn-outline" onclick="deletePlant(${p.id})">Fshi</button>
    </div>
  `).join("");
}

async function addPlant(){
  const name = document.getElementById("plantName").value.trim();
  if(!name) return;

  const token = getToken();
  const res = await fetch(API_BASE + "/plants", {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
      "Authorization":"Bearer " + token
    },
    body: JSON.stringify({ name })
  });

  if(!res.ok){
    alert("S’u shtua. Provo prapë.");
    return;
  }
  document.getElementById("plantName").value = "";
  await loadPlants();
}

async function deletePlant(id){
  const token = getToken();
  await fetch(API_BASE + "/plants/" + id, {
    method:"DELETE",
    headers: { "Authorization":"Bearer " + token }
  });
  await loadPlants();
}

function logout(){
  clearToken();
  clearUser();
  renderNavbarAuth();
  refreshMyPlantsUI();
}

function escapeHtml(str){
  return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

// kur hapet faqja, rregullo UI
document.addEventListener("DOMContentLoaded", () => {
  refreshMyPlantsUI();
  renderNavbarAuth();

  // stop propagation inside dropdowns
  document.getElementById("mobile-menu")?.addEventListener("click", (e)=> e.stopPropagation());
  document.getElementById("user-menu")?.addEventListener("click", (e)=> e.stopPropagation());
});


// ===== User dropdown (profile/menu) =====
function toggleUserMenu(e){
  e?.stopPropagation();
  const um = document.getElementById("user-menu");
  if(!um) return;

  const isOpen = um.classList.toggle("open");
  if(isOpen){
    // mbyll hamburger dropdown nëse është hapur
    document.getElementById("mobile-menu")?.classList.remove("active");
    const menuIcon = document.getElementById("menu-icon");
    const closeIcon = document.getElementById("close-icon");
    if(menuIcon && closeIcon){
      menuIcon.style.display = "block";
      closeIcon.style.display = "none";
    }
  }
}

function closeUserMenu(){
  document.getElementById("user-menu")?.classList.remove("open");
}

// mbyll dropdown-et kur klikon jashtë
document.addEventListener("click", () => {
  document.getElementById("mobile-menu")?.classList.remove("active");
  closeUserMenu();

  const menuIcon = document.getElementById("menu-icon");
  const closeIcon = document.getElementById("close-icon");
  if(menuIcon && closeIcon){
    menuIcon.style.display = "block";
    closeIcon.style.display = "none";
  }
});

// placeholder: personalizimi (do e implementojmë me API më pas)
function openProfile(e){
  if(e) e.preventDefault();
  closeUserMenu();
  alert("Personalizimi: do lidhet me API (email/foto/galeri) — thuaj kur ta shtojmë endpoint-et.");
}
