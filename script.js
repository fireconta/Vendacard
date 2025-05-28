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
 * Guarda o cache de usuários no localStorage.
 */
function saveUsersCache() {
    try {
        localStorage.setItem('users', JSON.stringify(usersCache));
    } catch (error) {
        console.error('Erro ao guardar usersCache:', error);
    }
}

/**
 * Guarda o cache de cartões no localStorage.
 */
function saveCardsCache() {
    try {
        localStorage.setItem('cards', JSON.stringify(cardsCache));
    } catch (error) {
        console.error('Erro ao guardar cardsCache:', error);
    }
}

/**
 * Guarda o cache de detalhes do Pix no localStorage.
 */
function savePixDetailsCache() {
    try {
        localStorage.setItem('pixDetails', JSON.stringify(pixDetailsCache));
    } catch (error) {
        console.error('Erro ao guardar pixDetailsCache:', error);
    }
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
 * Função assíncrona para gerar hash SHA-256 usando Web Crypto API.
 * @param {string} password - Senha a ser hashada.
 * @returns {Promise<string>} - Hash em formato hexadecimal.
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida os campos de login em tempo real.
 * @returns {boolean} - Verdadeiro se os campos são válidos.
 */
function validateLogin() {
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    let isValid = true;

    if (!username) {
        usernameError.textContent = 'Usuário é obrigatório.';
        document.querySelector('#username')?.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        usernameError.textContent = '';
        document.querySelector('#username')?.parentElement.classList.remove('invalid');
    }

    if (!password) {
        passwordError.textContent = 'Senha é obrigatória.';
        document.querySelector('#password')?.parentElement.classList.add('invalid');
        isValid = false;
    } else if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        passwordError.textContent = `Senha deve ter no mínimo ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
        document.querySelector('#password')?.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        passwordError.textContent = '';
        document.querySelector('#password')?.parentElement.classList.remove('invalid');
    }
    return isValid;
}

/**
 * Valida os campos de registro em tempo real.
 * @returns {boolean} - Verdadeiro se os campos são válidos.
 */
function validateRegister() {
    const username = document.getElementById('newUsername')?.value;
    const password = document.getElementById('newPassword')?.value;
    const usernameError = document.getElementById('newUsernameError');
    const passwordError = document.getElementById('newPasswordError');
    let isValid = true;

    if (!username) {
        usernameError.textContent = 'Usuário é obrigatório.';
        document.querySelector('#newUsername')?.parentElement.classList.add('invalid');
        isValid = false;
    } else if (usersCache.some(u => u.username === username)) {
        usernameError.textContent = 'Usuário já existe.';
        document.querySelector('#newUsername')?.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        usernameError.textContent = '';
        document.querySelector('#newUsername')?.parentElement.classList.remove('invalid');
    }

    if (!password) {
        passwordError.textContent = 'Senha é obrigatória.';
        document.querySelector('#newPassword')?.parentElement.classList.add('invalid');
        isValid = false;
    } else if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        passwordError.textContent = `Senha deve ter no mínimo ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
        document.querySelector('#newPassword')?.parentElement.classList.add('invalid');
        isValid = false;
    } else {
        passwordError.textContent = '';
        document.querySelector('#newPassword')?.parentElement.classList.remove('invalid');
    }
    return isValid;
}

/**
 * Inicializa os dados padrão e configura o usuário padrão.
 */
async function initializeData() {
    console.log('Inicializando usuário padrão LVz...');
    if (usersCache.length === 0) {
        const defaultPassword = '123456';
        const passwordHash = await hashPassword(defaultPassword);
        console.log('Senha padrão:', defaultPassword);
        console.log('Hash gerado para LVz:', passwordHash);
        usersCache.push({
            id: generateUniqueId(usersCache),
            username: 'LVz',
            password: passwordHash,
            balance: 0,
            purchases: [],
            isAdmin: false
        });
        saveUsersCache();
    }
    checkAdminMode();
    updateNavbarVisibility();
}

/**
 * Verifica se o modo administrador deve ser ativado.
 */
function checkAdminMode() {
    document.body.addEventListener('click', () => {
        clickCount++;
        if (clickCount >= CONFIG.ADMIN_CLICKS) {
            const adminUser = usersCache.find(u => u.username === 'LVz');
            if (adminUser) {
                adminUser.isAdmin = true;
                saveUsersCache();
                alert('Modo Admin ativado para LVz!');
                window.location.href = 'dashboard.html';
            }
        }
    });
}

/**
 * Atualiza a visibilidade da barra de navegação.
 */
function updateNavbarVisibility() {
    const navbar = document.getElementById('navbar');
    if (navbar && localStorage.getItem('loggedIn')) {
        navbar.style.display = 'flex';
    } else if (navbar) {
        navbar.style.display = 'none';
    }
}

/**
 * Alterna entre os formulários de login e registro.
 */
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'flex';
}

function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'flex';
}

/**
 * Exibe a tela de informações da conta.
 */
function showAccountInfo() {
    const accountInfo = document.getElementById('accountInfo');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const navbar = document.getElementById('navbar');

    if (accountInfo && loginForm && registerForm && navbar) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        accountInfo.style.display = 'flex';
        navbar.style.display = 'flex';

        const user = usersCache.find(u => u.username === currentUser);
        if (user) {
            document.getElementById('userName').textContent = user.username;
            document.getElementById('userId').textContent = user.id;
            document.getElementById('userBalanceAccount').textContent = user.balance.toFixed(2);
            const purchaseHistory = document.getElementById('purchaseHistory');
            purchaseHistory.innerHTML = user.purchases.map(p => `<p>${p.cardNumber} - R$ ${p.price.toFixed(2)} (${new Date(p.date).toLocaleDateString()})</p>`).join('');
        }
    }
}

/**
 * Realiza o login do usuário.
 */
async function login() {
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const loginLoader = document.getElementById('loginLoader');
    const loginAttemptsDiv = document.getElementById('loginAttempts');

    if (Date.now() < loginBlockedUntil) {
        loginAttemptsDiv.textContent = 'Tentativas de login bloqueadas. Tente novamente após 1 minuto.';
        return;
    }

    if (!validateLogin()) return;

    loginLoader.style.display = 'block';
    const passwordHash = await hashPassword(password);
    const user = usersCache.find(u => u.username === username && u.password === passwordHash);

    setTimeout(() => {
        loginLoader.style.display = 'none';
        if (user) {
            currentUser = username;
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('currentUser', username);
            loginAttempts = 0;
            loginAttemptsDiv.textContent = '';
            console.log('Login successful for', username);
            showAccountInfo();
            if (user.isAdmin) {
                window.location.href = 'dashboard.html';
            }
        } else {
            loginAttempts++;
            loginAttemptsDiv.textContent = `Credenciais inválidas. Tentativas restantes: ${CONFIG.MAX_LOGIN_ATTEMPTS - loginAttempts}`;
            if (loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
                loginAttemptsDiv.textContent = 'Tentativas de login bloqueadas. Tente novamente após 1 minuto.';
            }
        }
    }, 1000); // Simula atraso de servidor
}

/**
 * Registra um novo usuário.
 */
async function register() {
    if (!validateRegister()) return;

    const username = document.getElementById('newUsername')?.value;
    const password = document.getElementById('newPassword')?.value;
    const passwordHash = await hashPassword(password);

    usersCache.push({
        id: generateUniqueId(usersCache),
        username: username,
        password: passwordHash,
        balance: 0,
        purchases: [],
        isAdmin: false
    });
    saveUsersCache();
    showLoginForm();
    alert('Usuário registrado com sucesso! Faça login.');
}

/**
 * Lida com a funcionalidade "Esqueceu a Senha?".
 */
function forgotPassword() {
    alert('Funcionalidade de recuperação de senha não implementada. Contate o suporte.');
}

/**
 * Faz logout do usuário.
 */
function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.href = 'index.html';
}

/**
 * Alterna entre o modo claro e escuro.
 */
function toggleTheme() {
    document.body.classList.toggle('light');
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = document.body.classList.contains('light') ? 'Modo Escuro' : 'Modo Claro';
}

/**
 * Exibe o formulário de adição de saldo via Pix.
 */
function showAddBalanceForm() {
    const pixPayment = document.getElementById('pixPayment');
    if (pixPayment) pixPayment.style.display = 'block';
}

/**
 * Copia a chave Pix para a área de transferência.
 */
function copyPixKey() {
    const pixKey = document.getElementById('pixKey')?.textContent;
    navigator.clipboard.writeText(pixKey).then(() => {
        alert('Chave Pix copiada para a área de transferência!');
    });
}

/**
 * Adiciona saldo ao usuário via Pix.
 */
function addBalance() {
    const amount = parseFloat(document.getElementById('balanceAmount')?.value);
    if (isNaN(amount) || amount <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
    }
    const user = usersCache.find(u => u.username === currentUser);
    if (user) {
        user.balance += amount;
        saveUsersCache();
        document.getElementById('userBalance')?.textContent = user.balance.toFixed(2);
        document.getElementById('userBalanceAccount')?.textContent = user.balance.toFixed(2);
        document.getElementById('pixPayment').style.display = 'none';
        alert(`Saldo adicionado com sucesso! Novo saldo: R$ ${user.balance.toFixed(2)}`);
    }
}

/**
 * Atualiza os detalhes do Pix.
 */
function updatePixDetails() {
    const pixKey = document.getElementById('pixKeyInput')?.value;
    const pixQRCode = document.getElementById('pixQRCodeInput')?.value;
    if (pixKey && pixQRCode) {
        pixDetailsCache.key = pixKey;
        pixDetailsCache.qrCode = pixQRCode;
        savePixDetailsCache();
        document.getElementById('pixKey').textContent = pixKey;
        document.getElementById('pixQRCode').src = pixQRCode;
        alert('Detalhes do Pix atualizados com sucesso!');
    }
}

/**
 * Adiciona um cartão ao carrinho.
 * @param {string} cardNumber - Número do cartão.
 * @param {number} price - Preço do cartão.
 */
function addToCart(cardNumber, price) {
    cartItems.push({ cardNumber, price });
    cartTotal += price;
    document.getElementById('cartTotalAmount').textContent = cartTotal.toFixed(2);
    document.getElementById('cartContainer').classList.add('active');
    const cardItem = document.querySelector(`[data-card-number="${cardNumber}"]`);
    if (cardItem) cardItem.classList.add('added');
    updateCartDisplay();
}

/**
 * Atualiza a exibição do carrinho.
 */
function updateCartDisplay() {
    const cartList = document.getElementById('cartList');
    if (cartList) {
        cartList.innerHTML = cartItems.map(item => `
            <div class="card-item" data-card-number="${item.cardNumber}">
                <h2>${item.cardNumber.slice(0, 6)} **** **** ****</h2>
                <p>Visa - Banco do Brasil S.A.</p>
                <p>Brasil</p>
                <div class="price">R$ ${item.price.toFixed(2)}</div>
                <button onclick="removeFromCart('${item.cardNumber}')">Remover</button>
            </div>
        `).join('');
    }
}

/**
 * Remove um cartão do carrinho.
 * @param {string} cardNumber - Número do cartão a remover.
 */
function removeFromCart(cardNumber) {
    const index = cartItems.findIndex(item => item.cardNumber === cardNumber);
    if (index !== -1) {
        cartTotal -= cartItems[index].price;
        cartItems.splice(index, 1);
        document.getElementById('cartTotalAmount').textContent = cartTotal.toFixed(2);
        updateCartDisplay();
        const cardItem = document.querySelector(`[data-card-number="${cardNumber}"]`);
        if (cardItem) cardItem.classList.remove('added');
        if (cartItems.length === 0) {
            document.getElementById('cartContainer').classList.remove('active');
        }
    }
}

/**
 * Finaliza a compra dos itens no carrinho.
 */
function finalizePurchase() {
    const user = usersCache.find(u => u.username === currentUser);
    if (user && user.balance >= cartTotal) {
        user.balance -= cartTotal;
        user.purchases.push(...cartItems.map(item => ({ ...item, date: new Date() })));
        saveUsersCache();
        cartItems = [];
        cartTotal = 0;
        document.getElementById('cartTotalAmount').textContent = '0.00';
        document.getElementById('cartList').innerHTML = '';
        document.getElementById('cartContainer').classList.remove('active');
        document.getElementById('userBalance')?.textContent = user.balance.toFixed(2);
        document.getElementById('userBalanceAccount')?.textContent = user.balance.toFixed(2);
        showAccountInfo();
        alert('Compra finalizada com sucesso!');
    } else {
        alert('Saldo insuficiente para completar a compra.');
    }
}

/**
 * Compra um cartão diretamente.
 * @param {string} cardNumber - Número do cartão.
 */
function buyCard(cardNumber) {
    const card = cardsCache.find(c => c.number === cardNumber);
    if (card) {
        addToCart(cardNumber, card.price);
        finalizePurchase();
    }
}

/**
 * Filtra os cartões com base nos critérios selecionados.
 */
function filterCards() {
    const brandFilter = document.getElementById('brandFilter')?.value;
    const typeFilter = document.getElementById('typeFilter')?.value;
    const cardList = document.getElementById('cardList');
    if (cardList) {
        cardList.innerHTML = cardsCache
            .filter(card => (brandFilter === 'all' || card.brand === brandFilter) &&
                           (typeFilter === 'all' || card.type === typeFilter))
            .map(card => `
                <div class="card-item" data-card-number="${card.number}">
                    <h2>${card.number.slice(0, 6)} **** **** ****</h2>
                    <p>${card.brand} - ${card.bank}</p>
                    <p>${card.country}</p>
                    <div class="price">R$ ${card.price.toFixed(2)}</div>
                    <div class="buttons">
                        <button onclick="addToCart('${card.number}', ${card.price})">${card.type === 'Crédito' ? 'Crédito' : 'Débito'}</button>
                        <button onclick="buyCard('${card.number}')">Comprar</button>
                    </div>
                </div>
            `).join('');
    }
}

/**
 * Seleciona a bandeira do cartão.
 * @param {string} brand - Bandeira selecionada.
 */
function selectBrand(brand) {
    selectedBrand = brand;
    document.getElementById('selectedBrand').textContent = brand;
}

/**
 * Adiciona um novo cartão.
 */
function addCard() {
    const cardId = document.getElementById('cardId')?.value;
    const cardNumber = document.getElementById('cardNumber')?.value;
    const cardCVV = document.getElementById('cardCVV')?.value;
    const cardExpiry = document.getElementById('cardExpiry')?.value;
    const cardPrice = parseFloat(document.getElementById('cardPrice')?.value);
    const cardStock = parseInt(document.getElementById('cardStock')?.value);
    const cardType = document.getElementById('cardType')?.value;

    if (cardId && cardNumber && cardCVV && cardExpiry && !isNaN(cardPrice) && !isNaN(cardStock) && cardType) {
        cardsCache.push({
            id: cardId,
            number: cardNumber,
            cvv: cardCVV,
            expiry: cardExpiry,
            brand: selectedBrand,
            bank: 'Banco do Brasil S.A.',
            country: 'Brasil',
            price: cardPrice,
            stock: cardStock,
            type: cardType
        });
        saveCardsCache();
        filterCards();
        alert('Cartão adicionado com sucesso!');
    }
}

/**
 * Pesquisa usuários com base no input.
 */
function searchUsers() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        const searchTerm = document.getElementById('searchUser')?.value.toLowerCase();
        const userList = document.getElementById('userList');
        if (userList && searchTerm) {
            userList.innerHTML = usersCache
                .filter(u => u.username.toLowerCase().includes(searchTerm) || u.id.includes(searchTerm))
                .map(u => `
                    <div class="user-item">
                        <p>Usuário: ${u.username} (ID: ${u.id})</p>
                        <p>Saldo: R$ ${u.balance.toFixed(2)}</p>
                        <div class="buttons">
                            <button class="edit-balance" onclick="editBalance('${u.id}')">Editar Saldo</button>
                        </div>
                    </div>
                `).join('');
        }
    }, 300);
}

/**
 * Edita o saldo de um usuário.
 * @param {string} userId - ID do usuário.
 */
function editBalance(userId) {
    const newBalance = prompt('Novo saldo para o usuário:');
    if (newBalance !== null) {
        const user = usersCache.find(u => u.id === userId);
        if (user) {
            user.balance = parseFloat(newBalance) || user.balance;
            saveUsersCache();
            searchUsers();
            alert('Saldo atualizado com sucesso!');
        }
    }
}

/**
 * Verifica o estado offline.
 */
function checkOffline() {
    if (!navigator.onLine) {
        alert('Você está offline. Algumas funcionalidades podem estar limitadas.');
    }
}

/**
 * Altera o idioma da interface.
 */
function changeLanguage() {
    const lang = document.getElementById('languageSelector')?.value;
    const translations = {
        pt: {
            welcome: "Bem-vindo ao Sistema",
            login: "Faça Login",
            register: "Registrar",
            username: "Usuário",
            password: "Senha",
            enter: "Entrar",
            forgotPassword: "Esqueceu a Senha?",
            createAccount: "Criar Conta",
            back: "Voltar",
            store: "Loja",
            account: "Ver Conta",
            logout: "Sair",
            addBalance: "Adicionar Saldo via Pix",
            copyKey: "Copiar Chave",
            confirmPayment: "Confirmar Pagamento",
            cardsForSale: "Cartões à Venda",
            cart: "Carrinho",
            finalizePurchase: "Finalizar Compra",
            adminPanel: "PAINEL ADMIN",
            addCard: "Adicionar Cartão",
            configurePix: "Configurar Pix",
            manageUsers: "Gerenciar Usuários"
        },
        en: {
            welcome: "Welcome to the System",
            login: "Log In",
            register: "Register",
            username: "Username",
            password: "Password",
            enter: "Enter",
            forgotPassword: "Forgot Password?",
            createAccount: "Create Account",
            back: "Back",
            store: "Store",
            account: "View Account",
            logout: "Log Out",
            addBalance: "Add Balance via Pix",
            copyKey: "Copy Key",
            confirmPayment: "Confirm Payment",
            cardsForSale: "Cards for Sale",
            cart: "Cart",
            finalizePurchase: "Finalize Purchase",
            adminPanel: "ADMIN PANEL",
            addCard: "Add Card",
            configurePix: "Configure Pix",
            manageUsers: "Manage Users"
        }
    };
    const t = translations[lang];
    document.querySelector('.login-container h1').textContent = t.welcome;
    document.querySelector('#loginForm h2').textContent = t.login;
    document.querySelector('#registerForm h2').textContent = t.createAccount;
    document.querySelector('#username').placeholder = t.username;
    document.querySelector('#password').placeholder = t.password;
    document.querySelector('#newUsername').placeholder = t.username;
    document.querySelector('#newPassword').placeholder = t.password;
    document.querySelector('#loginButton').textContent = t.enter;
    document.querySelector('#loginForm a').textContent = t.forgotPassword;
    document.querySelector('#registerForm button:nth-child(3)').textContent = t.register;
    document.querySelector('#registerForm button:nth-child(4)').textContent = t.back;
    document.querySelector('#storeLink').textContent = t.store;
    document.querySelector('#accountLink').textContent = t.account;
    document.querySelector('a[onclick="logout()"]').textContent = t.logout;
    document.querySelector('.header h1').textContent = `${t.store} E ${t.cart}`;
    document.querySelector('button[onclick="showAddBalanceForm()"]').textContent = t.addBalance;
    document.querySelector('button[onclick="copyPixKey()"]').textContent = t.copyKey;
    document.querySelector('button[onclick="addBalance()"]').textContent = t.confirmPayment;
    document.querySelector('.form-container h2:nth-child(1)').textContent = t.cardsForSale;
    document.querySelector('#cartContainer h2').textContent = t.cart;
    document.querySelector('.finalize-btn').textContent = t.finalizePurchase;
    document.querySelector('.header h1:nth-child(1)').textContent = t.adminPanel;
    document.querySelector('.form-container h2:nth-child(1)').textContent = t.addCard;
    document.querySelector('.form-container h2:nth-child(2)').textContent = t.configurePix;
    document.querySelector('.form-container h2:nth-child(3)').textContent = t.manageUsers;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    const loggedIn = localStorage.getItem('loggedIn');
    const currentUser = localStorage.getItem('currentUser');
    if (loggedIn && currentUser) {
        this.currentUser = currentUser;
        if (window.location.pathname.includes('index.html')) {
            showAccountInfo();
        } else if (window.location.pathname.includes('shop.html')) {
            filterCards();
            const user = usersCache.find(u => u.username === currentUser);
            if (user) document.getElementById('userBalance').textContent = user.balance.toFixed(2);
        } else if (window.location.pathname.includes('dashboard.html')) {
            filterCards();
            const user = usersCache.find(u => u.username === currentUser);
            if (user && user.isAdmin) {
                searchUsers();
            } else {
                window.location.href = 'index.html';
            }
        }
    } else if (!window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
    checkOffline();
});
