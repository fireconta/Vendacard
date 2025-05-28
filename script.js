const CONFIG = {
    SESSION_TIMEOUT_MINUTES: 30,
    ADMIN_CLICKS: 6,
    MIN_PASSWORD_LENGTH: 6,
    MAX_LOGIN_ATTEMPTS: 3,
    LOGIN_BLOCK_TIME: 60000 // 1 minuto em milissegundos
};

// Variáveis globais
let cartTotal = 0;
let cartItems = [];
let selectedBrand = 'Nenhuma';
let clickCount = 0;
let currentUser = null;
let debounceTimeout;
let loginAttempts = 0;
let loginBlockedUntil = 0;

// Cache de dados
let usersCache = JSON.parse(localStorage.getItem('users')) || [];
let cardsCache = JSON.parse(localStorage.getItem('cards')) || [];
let pixDetailsCache = JSON.parse(localStorage.getItem('pixDetails')) || { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" };

/**
 * Salva o cache de usuários no localStorage.
 */
function saveUsersCache() {
    localStorage.setItem('users', JSON.stringify(usersCache));
}

/**
 * Salva o cache de cartões no localStorage.
 */
function saveCardsCache() {
    localStorage.setItem('cards', JSON.stringify(cardsCache));
}

/**
 * Salva o cache de detalhes do Pix no localStorage.
 */
function savePixDetailsCache() {
    localStorage.setItem('pixDetails', JSON.stringify(pixDetailsCache));
}

/**
 * Gera um ID único de 6 dígitos para usuários.
 * @param {Array} users - Lista de usuários.
 * @returns {string} - ID gerado.
 */
function generateUniqueId(users) {
    let id;
    do {
        id = Math.floor(100000 + Math.random() * 900000).toString();
    } while (users.some(u => u.id === id));
    return id;
}

/**
 * Sanitiza uma string para prevenir ataques XSS.
 * @param {string} str - String a ser sanitizada.
 * @returns {string} - String sanitizada.
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Valida os campos de login em tempo real.
 */
function validateLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    let isValid = true;

    if (!username) {
        usernameError.textContent = 'Usuário é obrigatório.';
        document.querySelector('#username').parentElement.classList.add('invalid');
        isValid = false;
    } else {
        usernameError.textContent = '';
        document.querySelector('#username').parentElement.classList.remove('invalid');
    }

    if (!password) {
        passwordError.textContent = 'Senha é obrigatória.';
        document.querySelector('#password').parentElement.classList.add('invalid');
        isValid = false;
    } else if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        passwordError.textContent = `Senha deve ter no mínimo ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
        document.querySelector('#password').parentElement.classList.add('invalid');
        isValid = false;
    } else {
        passwordError.textContent = '';
        document.querySelector('#password').parentElement.classList.remove('invalid');
    }

    return isValid;
}

/**
 * Realiza o login do usuário, verificando credenciais e iniciando a sessão.
 */
function login() {
    if (Date.now() < loginBlockedUntil) {
        const timeLeft = Math.ceil((loginBlockedUntil - Date.now()) / 1000);
        document.getElementById('loginAttempts').textContent = `Aguarde ${timeLeft} segundos antes de tentar novamente.`;
        return;
    }

    if (!validateLogin()) return;

    const loginButton = document.getElementById('loginButton');
    const loginLoader = document.getElementById('loginLoader');
    loginButton.style.display = 'none';
    loginLoader.style.display = 'block';

    const username = sanitizeHTML(document.getElementById('username').value);
    const password = document.getElementById('password').value;
    const hashedPassword = CryptoJS.SHA256(password).toString();
    const user = usersCache.find(u => u.username === username && u.password === hashedPassword);

    setTimeout(() => {
        if (user) {
            loginAttempts = 0;
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('currentUser', username);
            localStorage.setItem('loginTime', Date.now());
            currentUser = user;
            alert(`Bem-vindo, ${username}!`);
            window.location.href = 'index.html'; // Redireciona para carregar accountInfo
        } else {
            loginAttempts++;
            document.getElementById('loginAttempts').textContent = `Tentativa ${loginAttempts} de ${CONFIG.MAX_LOGIN_ATTEMPTS}.`;
            if (loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
                document.getElementById('loginAttempts').textContent = 'Limite de tentativas atingido. Tente novamente em 1 minuto.';
                loginButton.disabled = true;
                setTimeout(() => {
                    loginAttempts = 0;
                    loginBlockedUntil = 0;
                    loginButton.disabled = false;
                    document.getElementById('loginAttempts').textContent = '';
                }, CONFIG.LOGIN_BLOCK_TIME);
            } else {
                alert("Usuário ou senha inválidos!");
            }
        }
        loginButton.style.display = 'block';
        loginLoader.style.display = 'none';
    }, 1000); // Simula delay de autenticação
}

/**
 * Registra um novo usuário, criptografando a senha e gerando um ID único.
 */
function register() {
    const username = sanitizeHTML(document.getElementById('newUsername').value);
    const password = document.getElementById('newPassword').value;
    const newUsernameError = document.getElementById('newUsernameError');
    const newPasswordError = document.getElementById('newPasswordError');

    if (!username) {
        newUsernameError.textContent = 'Usuário é obrigatório.';
        return;
    } else if (usersCache.find(u => u.username === username)) {
        newUsernameError.textContent = 'Usuário já existe.';
        return;
    } else {
        newUsernameError.textContent = '';
    }

    if (!password || password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        newPasswordError.textContent = `Senha deve ter no mínimo ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
        return;
    } else {
        newPasswordError.textContent = '';
    }

    const newId = generateUniqueId(usersCache);
    const hashedPassword = CryptoJS.SHA256(password).toString();
    usersCache.push({ username, password: hashedPassword, id: newId, balance: 0, purchases: [] });
    saveUsersCache();
    alert("Usuário registrado com sucesso!");
    showLoginForm();
}

/**
 * Exibe o formulário de registro e oculta o de login.
 */
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

/**
 * Exibe o formulário de login e oculta o de registro.
 */
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

/**
 * Lógica básica para "Esqueceu a Senha?" (placeholder por enquanto).
 */
function forgotPassword() {
    alert("Funcionalidade em desenvolvimento. Entre em contato com o suporte.");
}

/**
 * Realiza o logout do usuário, limpando a sessão e os dados do carrinho.
 */
function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    cartTotal = 0;
    cartItems = [];
    currentUser = null;
    window.location.href = 'index.html';
}

/**
 * Verifica se a sessão expirou com base no tempo de login.
 */
function checkSession() {
    const loginTime = localStorage.getItem('loginTime');
    if (loginTime) {
        const currentTime = Date.now();
        const timeDiff = (currentTime - loginTime) / 1000 / 60;
        if (timeDiff > CONFIG.SESSION_TIMEOUT_MINUTES) {
            logout();
            alert("Sessão expirada. Por favor, faça login novamente.");
        }
    }
}

/**
 * Exibe as informações da conta do usuário após o login.
 */
function showAccountInfo() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('accountInfo').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Ver Conta';
    document.getElementById('accountLink').classList.add('active');
    document.getElementById('storeLink').classList.remove('active');

    const user = usersCache.find(u => u.username === localStorage.getItem('currentUser'));
    currentUser = user;
    document.getElementById('userName').textContent = sanitizeHTML(user.username);
    document.getElementById('userId').textContent = sanitizeHTML(user.id);
    document.getElementById('userBalanceAccount').textContent = user.balance.toFixed(2).replace('.', ',');
    const purchaseHistory = document.getElementById('purchaseHistory');
    purchaseHistory.innerHTML = '';
    user.purchases.forEach(purchase => {
        const purchaseDiv = document.createElement('div');
        purchaseDiv.className = 'card-item';
        let itemsList = purchase.items.map(item => `<p>${sanitizeHTML(item.name.substring(0, 6))} **** **** **** - R$ ${item.price.toFixed(2).replace('.', ',')}</p>`).join('');
        purchaseDiv.innerHTML = `
            <h2>Compra em ${sanitizeHTML(purchase.date)}</h2>
            ${itemsList}
            <div class="price">Total: R$ ${purchase.total.toFixed(2).replace('.', ',')}</div>
        `;
        purchaseHistory.appendChild(purchaseDiv);
    });

    document.getElementById('accountLink').addEventListener('click', function(e) {
        clickCount++;
        if (clickCount === CONFIG.ADMIN_CLICKS) {
            clickCount = 0;
            window.location.href = 'dashboard.html';
        }
    });
}

/**
 * Carrega os cartões disponíveis para venda na página da loja, aplicando filtros.
 */
function loadCards() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    filterCards();
    loadCart();
}

// (Outras funções como filterCards, addToCart, etc., permanecem iguais e foram omitidas para brevity, mas estão incluídas no código completo)

// Inicializa dados no localStorage
(function initializeData() {
    if (!localStorage.getItem('users')) {
        const newId = generateUniqueId([]);
        const hashedPassword = CryptoJS.SHA256("LVz").toString();
        usersCache = [{ username: "LVz", password: hashedPassword, id: newId, balance: 0, purchases: [] }];
        saveUsersCache();
    }
    if (!localStorage.getItem('cards')) {
        cardsCache = [
            { id: "1", number: "1234567890123456", cvv: "123", expiry: "12/25", brand: "Visa", type: "Crédito", price: 10.00, stock: 10 },
            { id: "2", number: "9876543210987654", cvv: "456", expiry: "06/26", brand: "Mastercard", type: "Débito", price: 15.00, stock: 5 }
        ];
        saveCardsCache();
    }
    if (!localStorage.getItem('pixDetails')) {
        pixDetailsCache = { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" };
        savePixDetailsCache();
    }
})();

// Carrega tema e verifica autenticação
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.textContent = 'Modo Escuro';
    }

    // Adiciona validação em tempo real
    document.getElementById('username').addEventListener('input', validateLogin);
    document.getElementById('password').addEventListener('input', validateLogin);

    // Verifica autenticação em todas as páginas
    if (!window.location.pathname.includes('index.html') && !localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }

    if (window.location.pathname.includes('index.html')) {
        if (localStorage.getItem('loggedIn')) {
            currentUser = usersCache.find(u => u.username === localStorage.getItem('currentUser'));
            if (currentUser) {
                showAccountInfo();
                console.log('User logged in, showing account info.');
            } else {
                localStorage.removeItem('loggedIn');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('loginTime');
                document.getElementById('loginForm').style.display = 'block';
                console.log('Invalid session, showing login form.');
            }
        } else {
            document.getElementById('loginForm').style.display = 'block';
            console.log('No session, showing login form.');
        }
    } else if (window.location.pathname.includes('shop.html')) {
        if (localStorage.getItem('loggedIn')) {
            loadCards();
            console.log('Shop page loaded.');
        } else {
            window.location.href = 'index.html';
        }
    } else if (window.location.pathname.includes('dashboard.html')) {
        if (localStorage.getItem('loggedIn')) {
            loadAdminCards();
            searchUsers();
            console.log('Dashboard page loaded.');
        } else {
            window.location.href = 'index.html';
        }
    }

    setInterval(checkSession, 60000);
    checkSession();
});
