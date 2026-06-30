const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBbV2OG22iZgAu_-R-UZEDyj_gU5fNGoBA",
  authDomain: "guia-ferias.firebaseapp.com",
  projectId: "guia-ferias",
  storageBucket: "guia-ferias.firebasestorage.app",
  messagingSenderId: "177359518101",
  appId: "1:177359518101:web:7964492f1f259a3fad5e9c",
};

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();

auth.onAuthStateChanged(user => {
  const loginScreen = document.getElementById('login-screen');
  const appEl       = document.getElementById('app');
  if (user) {
    loginScreen.style.display = 'none';
    appEl.style.display = '';
    const nameEl = document.getElementById('user-display-name');
    if (nameEl) nameEl.textContent = user.displayName ? user.displayName.split(' ')[0] : user.email;
  } else {
    loginScreen.style.display = '';
    appEl.style.display = 'none';
  }
});

function signInWithGoogle() {
  const btn = document.getElementById('google-btn');
  btn.disabled = true;
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(() => {
    btn.disabled = false;
    showLoginError('Erro ao entrar com Google. Tente novamente.');
  });
}

function signInWithEmail(e) {
  e && e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showLoginError('Preencha o email e a senha.'); return; }
  const btn = document.getElementById('email-btn');
  btn.disabled    = true;
  btn.textContent = 'Entrando...';
  auth.signInWithEmailAndPassword(email, password).catch(err => {
    btn.disabled    = false;
    btn.textContent = 'Entrar';
    const invalid = ['auth/user-not-found','auth/wrong-password','auth/invalid-credential','auth/invalid-email'];
    showLoginError(invalid.includes(err.code) ? 'Email ou senha incorretos.' : 'Erro ao entrar. Tente novamente.');
  });
}

function appSignOut() {
  auth.signOut();
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent  = msg;
  el.style.display = '';
}
