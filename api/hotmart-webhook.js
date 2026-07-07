const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const FIREBASE_API_KEY = 'AIzaSyBbV2OG22iZgAu_-R-UZEDyj_gU5fNGoBA';

async function sendPasswordResetEmail(email) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    }
  );
  if (!res.ok) throw new Error(`Erro ao enviar email: ${await res.text()}`);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validar token do Hotmart (falha fechado se o env não estiver configurado)
  const token = req.query.hottok;
  if (!process.env.HOTMART_TOKEN || token !== process.env.HOTMART_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { event, data } = req.body || {};

  // Só processar compras aprovadas
  const APPROVED_EVENTS = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'];
  if (!APPROVED_EVENTS.includes(event)) {
    return res.status(200).json({ ok: true, skipped: event });
  }

  const email = data?.buyer?.email?.toLowerCase().trim();
  const name  = data?.buyer?.name || '';

  if (!email) {
    return res.status(400).json({ error: 'Email não encontrado no payload' });
  }

  try {
    // Criar usuário (ignora se já existir)
    try {
      await admin.auth().createUser({ email, displayName: name });
    } catch (err) {
      if (err.code !== 'auth/email-already-exists') throw err;
    }

    // Enviar email para o usuário definir a senha
    await sendPasswordResetEmail(email);

    console.log(`✓ Acesso criado: ${email}`);
    return res.status(200).json({ ok: true, email });
  } catch (err) {
    console.error('Erro no webhook:', err);
    return res.status(500).json({ error: err.message });
  }
};
