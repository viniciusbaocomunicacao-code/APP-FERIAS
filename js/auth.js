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
    const firstName = user.displayName ? user.displayName.split(' ')[0] : null;
    const nameEl = document.getElementById('user-display-name');
    if (nameEl) nameEl.textContent = firstName || user.email;
    const greetingEl = document.getElementById('home-greeting-title');
    if (greetingEl) greetingEl.textContent = firstName ? `Olá, ${firstName}! 👋` : 'Olá! 👋';
    const emailEl = document.getElementById('settings-account-email');
    if (emailEl) emailEl.textContent = user.email;
  } else {
    loginScreen.style.display = '';
    appEl.style.display = 'none';
  }
});

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

function sendChangePasswordEmail() {
  const user = auth.currentUser;
  if (!user) return;
  const btn = document.getElementById('change-password-btn');
  const feedback = document.getElementById('settings-feedback');
  btn.disabled = true;
  auth.sendPasswordResetEmail(user.email)
    .then(() => {
      feedback.textContent = `Enviamos um link para ${user.email}. Abra o email para definir sua nova senha.`;
      feedback.style.display = '';
      feedback.classList.remove('settings-feedback-error');
    })
    .catch(() => {
      feedback.textContent = 'Erro ao enviar o email. Tente novamente.';
      feedback.style.display = '';
      feedback.classList.add('settings-feedback-error');
    })
    .finally(() => { btn.disabled = false; });
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent  = msg;
  el.style.display = '';
}

function handleForgotPassword() {
  const email    = document.getElementById('login-email').value.trim();
  const feedback = document.getElementById('forgot-feedback');
  const btn      = document.getElementById('forgot-btn');

  if (!email) {
    feedback.textContent = 'Digite seu email no campo acima e tente novamente.';
    feedback.className   = 'login-forgot-feedback error';
    feedback.style.display = '';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Enviando...';
  feedback.style.display = 'none';

  auth.sendPasswordResetEmail(email)
    .then(() => {
      feedback.textContent = `✓ Link enviado para ${email}. Verifique sua caixa de entrada e spam.`;
      feedback.className   = 'login-forgot-feedback success';
      feedback.style.display = '';
    })
    .catch(() => {
      feedback.textContent = 'Não encontramos esse email. Verifique se é o mesmo usado na compra.';
      feedback.className   = 'login-forgot-feedback error';
      feedback.style.display = '';
    })
    .finally(() => {
      btn.disabled    = false;
      btn.textContent = 'Esqueci minha senha';
    });
}
