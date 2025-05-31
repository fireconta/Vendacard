const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec', // Substitua pelo ID do seu script Google Apps Script
  MIN_PASSWORD_LENGTH: 6,
  MAX_LOGIN_ATTEMPTS: 3,
  LOGIN_BLOCK_TIME: 30000 // 30 segundos de bloqueio após atingir o limite
};

const state = {
  currentUser: null,
  isAdmin: false,
  loginAttempts: 0,
  loginBlockedUntil: 0
};

document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('currentUser');
  const sessionStart = localStorage.getItem('sessionStart');
  if (savedUser && sessionStart && (Date.now() - parseInt(sessionStart)) < 24 * 60 * 60 * 1000) {
    state.currentUser = JSON.parse(savedUser);
    state.isAdmin = state.currentUser.ISADMIN === 'TRUE';
    if (state.isAdmin) {
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = 'shop.html';
    }
  }

  const loginButton = document.getElementById('loginButton');
  if (loginButton) {
    loginButton.addEventListener('click', auth.login);
  }

  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', auth.logout);
  }
});

const auth = {
  async login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');

    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username) {
      if (usernameError) usernameError.textContent = 'Por favor, preencha o usuário.';
      return;
    }
    if (!password) {
      if (passwordError) passwordError.textContent = 'Por favor, preencha a senha.';
      return;
    }
    if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
      if (passwordError) passwordError.textContent = `A senha deve ter pelo menos ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
      return;
    }

    if (state.loginBlockedUntil > Date.now()) {
      alert(`Você está bloqueado. Tente novamente em ${(state.loginBlockedUntil - Date.now()) / 1000} segundos.`);
      return;
    }

    try {
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);
      console.log(`Enviando login: user="${username}" (encoded: "${encodedUsername}"), password="${password}" (encoded: "${encodedPassword}")`);
      const loginUrl = `${CONFIG.API_URL}?action=login&user=${encodedUsername}&password=${encodedPassword}`;
      console.log(`URL de login: ${loginUrl}`);
      const response = await fetch(loginUrl);
      const responseText = await response.text();
      console.log('Resposta bruta do servidor:', responseText);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const result = JSON.parse(responseText);
      console.log('Resultado parsed:', result);
      if (result.success) {
        state.currentUser = result.user;
        state.isAdmin = result.user.ISADMIN === 'TRUE';
        localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
        localStorage.setItem('sessionStart', Date.now().toString());
        state.loginAttempts = 0;
        window.location.href = state.isAdmin ? 'dashboard.html' : 'shop.html';
      } else {
        if (passwordError) passwordError.textContent = result.message || 'Usuário ou senha inválidos.';
        state.loginAttempts++;
        if (state.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
          state.loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
          alert(`Limite de tentativas atingido. Tente novamente após ${CONFIG.LOGIN_BLOCK_TIME / 1000} segundos.`);
        }
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error.message);
      if (passwordError) passwordError.textContent = 'Erro ao conectar ao servidor. Verifique a URL da API e a implantação do script.';
    }
  },

  logout() {
    state.currentUser = null;
    state.isAdmin = false;
    state.loginAttempts = 0;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionStart');
    window.location.href = 'index.html';
  }
};

const shop = {
  async loadCards() {
    if (!state.currentUser) {
      alert('Você precisa estar logado para acessar os cartões.');
      window.location.href = 'index.html';
      return;
    }
    try {
      const response = await fetch(`${CONFIG.API_URL}?action=getCards`);
      const cards = await response.json();
      console.log('Cartões carregados:', cards);
      const cardsContainer = document.getElementById('cardsContainer');
      if (cardsContainer) {
        cardsContainer.innerHTML = '';
        cards.forEach(card => {
          const cardElement = document.createElement('div');
          cardElement.className = 'card';
          cardElement.innerHTML = `
            <p>Numero: ${card.numero}</p>
            <p>CVV: ${card.cvv}</p>
            <p>Validade: ${card.validade}</p>
            <p>Nome: ${card.nome}</p>
            <p>Preço: R$ 10.00</p> <!-- Valor fixo para exemplo -->
            <button class="buy-button" data-card-number="${card.numero}" data-price="10.00">Comprar</button>
          `;
          cardsContainer.appendChild(cardElement);
        });
        document.querySelectorAll('.buy-button').forEach(button => {
          button.addEventListener('click', () => {
            shop.purchaseCard(button.getAttribute('data-card-number'), button.getAttribute('data-price'));
          });
        });
      }
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    }
  },

  async purchaseCard(cardNumber, price) {
    if (!state.currentUser) {
      alert('Você precisa estar logado para comprar um cartão.');
      window.location.href = 'index.html';
      return;
    }
    try {
      const encodedCardNumber = encodeURIComponent(cardNumber);
      const encodedPrice = encodeURIComponent(price);
      const response = await fetch(`${CONFIG.API_URL}?action=purchaseCard&user=${encodeURIComponent(state.currentUser.user)}&cardNumber=${encodedCardNumber}&price=${encodedPrice}`);
      const result = await response.json();
      if (result.success) {
        alert('Compra realizada com sucesso!');
        shop.loadCards();
      } else {
        alert(result.message || 'Erro ao comprar o cartão.');
      }
    } catch (error) {
      console.error('Erro ao comprar cartão:', error);
      alert('Erro ao conectar ao servidor.');
    }
  }
};

if (document.getElementById('shopPage')) {
  shop.loadCards();
}

document.querySelectorAll('.buy-button').forEach(button => {
  button.addEventListener('click', () => {
    shop.purchaseCard(button.getAttribute('data-card-number'), button.getAttribute('data-price'));
  });
});
