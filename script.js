// === Configurações ===
const CONFIG = {
    SESSION_TIMEOUT_MINUTES: 30,
    ADMIN_CLICKS: 5,
    ADMIN_PASSWORD: '2025',
    MIN_PASSWORD_LENGTH: 6,
    MAX_LOGIN_ATTEMPTS: 3,
    LOGIN_BLOCK_TIME: 60000 // 1 minuto em milissegundos
};

// === Estado Global ===
const state = {
    cartTotal: 0,
    cartItems: [],
    selectedBrand: 'Nenhuma',
    clickCount: 0,
    currentUser: null,
    loginAttempts: 0,
    loginBlockedUntil: 0,
    selectedRechargeAmount: null
};

// === Gerenciamento de Armazenamento ===
const storage = {
    users: JSON.parse(localStorage.getItem('users')) || [],
    cards: JSON.parse(localStorage.getItem('cards')) || [
        { id: '1', number: '1234567890123456', cvv: '123', expiry: '12/25', brand: 'Visa', bank: 'Banco do Brasil S.A.', country: 'Brasil', price: 10.00, stock: 10, type: 'Crédito' },
        { id: '2', number: '9876543210987654', cvv: '456', expiry: '11/26', brand: 'Mastercard', bank: 'Banco Inter', country: 'Brasil', price: 15.00, stock: 5, type: 'Débito' }
    ],
    pixDetails: JSON.parse(localStorage.getItem('pixDetails')) || {
        40: { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" },
        70: { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" },
        150: { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" },
        300: { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" }
    },

    saveUsers() {
        try {
            localStorage.setItem('users', JSON.stringify(this.users));
        } catch (error) {
            console.error('Erro ao guardar users:', error);
        }
    },

    saveCards() {
        try {
            localStorage.setItem('cards', JSON.stringify(this.cards));
        } catch (error) {
            console.error('Erro ao guardar cards:', error);
        }
    },

    savePixDetails() {
        try {
            localStorage.setItem('pixDetails', JSON.stringify(this.pixDetails));
        } catch (error) {
            console.error('Erro ao guardar pixDetails:', error);
        }
    }
};

// === Autenticação ===
const auth = {
    generateUniqueId() {
        let id;
        do {
            id = Math.floor(100000 + Math.random() * 900000).toString();
        } while (storage.users.some(u => u.id === id));
        return id;
    },

    async hashPassword(password) {
        try {
            if (window.crypto && window.crypto.subtle) {
                const encoder = new TextEncoder();
                const data = encoder.encode(password);
                const hash = await window.crypto.subtle.digest('SHA-256', data);
                return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (error) {
            console.warn('Web Crypto API não disponível, usando fallback MD5');
        }
        // Fallback MD5 (simplificado para compatibilidade)
        function md5(str) {
            function rotateLeft(lValue, iShiftBits) {
                return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
            }
            const k = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32));
            let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
            const words = [];
            for (let i = 0; i < str.length; i++) {
                words[i >> 2] |= (str.charCodeAt(i) & 0xff) << ((i % 4) * 8);
            }
            words[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
            words[(((str.length + 8) >> 6) * 16) + 14] = str.length * 8;
            for (let i = 0; i < words.length; i += 16) {
                let aa = a, bb = b, cc = c, dd = d;
                for (let j = 0; j < 64; j++) {
                    let f, g;
                    if (j < 16) { f = (b & c) | (~b & d); g = j; }
                    else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16; }
                    else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16; }
                    else { f = c ^ (b | ~d); g = (7 * j) % 16; }
                    const temp = d;
                    d = c;
                    c = b;
                    b = b + rotateLeft((a + f + k[j] + (words[i + g] || 0)), [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21][Math.floor(j / 4) % 4]);
                    a = temp;
                }
                a += aa; b += bb; c += cc; d += dd;
            }
            return [a, b, c, d].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
        }
        return md5(password);
    },

    validateLogin() {
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const usernameError = document.getElementById('usernameError');
        const passwordError = document.getElementById('passwordError');
        let isValid = true;

        if (!username) {
            usernameError.textContent = 'Usuário é obrigatório.';
            document.getElementById('username')?.parentElement.classList.add('invalid');
            isValid = false;
        } else {
            usernameError.textContent = '';
            document.getElementById('username')?.parentElement.classList.remove('invalid');
        }

        if (!password) {
            passwordError.textContent = 'Senha é obrigatória.';
            document.getElementById('password')?.parentElement.classList.add('invalid');
            isValid = false;
        } else if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            passwordError.textContent = `Senha deve ter no mínimo ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
            document.getElementById('password')?.parentElement.classList.add('invalid');
            isValid = false;
        } else {
            passwordError.textContent = '';
            document.getElementById('password')?.parentElement.classList.remove('invalid');
        }
        return isValid;
    },

    validateRegister() {
        const username = document.getElementById('newUsername')?.value;
        const password = document.getElementById('newPassword')?.value;
        const usernameError = document.getElementById('newUsernameError');
        const passwordError = document.getElementById('newPasswordError');
        let isValid = true;

        if (!username) {
            usernameError.textContent = 'Usuário é obrigatório.';
            document.getElementById('newUsername')?.parentElement.classList.add('invalid');
            isValid = false;
        } else if (storage.users.some(u => u.username === username)) {
            usernameError.textContent = 'Usuário já existe.';
            document.getElementById('newUsername')?.parentElement.classList.add('invalid');
            isValid = false;
        } else {
            usernameError.textContent = '';
            document.getElementById('newUsername')?.parentElement.classList.remove('invalid');
        }

        if (!password) {
            passwordError.textContent = 'Senha é obrigatória.';
            document.getElementById('newPassword')?.parentElement.classList.add('invalid');
            isValid = false;
        } else if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            passwordError.textContent = `Senha deve ter no mínimo ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
            document.getElementById('newPassword')?.parentElement.classList.add('invalid');
            isValid = false;
        } else {
            passwordError.textContent = '';
            document.getElementById('newPassword')?.parentElement.classList.remove('invalid');
        }
        return isValid;
    },

    async initializeData() {
        if (!storage.users.some(u => u.username === 'LVz')) {
            const defaultPassword = '123456';
            const passwordHash = await this.hashPassword(defaultPassword);
            storage.users.push({
                id: this.generateUniqueId(),
                username: 'LVz',
                password: passwordHash,
                balance: 0,
                purchases: [],
                isAdmin: false
            });
            storage.saveUsers();
        }
        if (storage.cards.length === 0) {
            storage.cards = [
                { id: '1', number: '1234567890123456', cvv: '123', expiry: '12/25', brand: 'Visa', bank: 'Banco do Brasil S.A.', country: 'Brasil', price: 10.00, stock: 10, type: 'Crédito' },
                { id: '2', number: '9876543210987654', cvv: '456', expiry: '11/26', brand: 'Mastercard', bank: 'Banco Inter', country: 'Brasil', price: 15.00, stock: 5, type: 'Débito' }
            ];
            storage.saveCards();
        }
        ui.updateNavbarVisibility();
    },

    async login() {
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const loginLoader = document.getElementById('loginLoader');
        const loginAttemptsDiv = document.getElementById('loginAttempts');

        if (Date.now() < state.loginBlockedUntil) {
            loginAttemptsDiv.textContent = 'Tentativas de login bloqueadas. Tente novamente após 1 minuto.';
            return;
        }

        if (!this.validateLogin()) return;

        if (loginLoader) loginLoader.style.display = 'block';
        const passwordHash = await this.hashPassword(password);
        const user = storage.users.find(u => u.username === username && u.password === passwordHash);

        setTimeout(() => {
            if (loginLoader) loginLoader.style.display = 'none';
            if (user) {
                state.currentUser = username;
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('currentUser', username);
                state.loginAttempts = 0;
                loginAttemptsDiv.textContent = '';
                window.location.href = 'shop.html';
            } else {
                state.loginAttempts++;
                loginAttemptsDiv.textContent = `Credenciais inválidas. Tentativas restantes: ${CONFIG.MAX_LOGIN_ATTEMPTS - state.loginAttempts}`;
                if (state.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                    state.loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
                    loginAttemptsDiv.textContent = 'Tentativas de login bloqueadas. Tente novamente após 1 minuto.';
                }
            }
        }, 1000);
    },

    async register() {
        if (!this.validateRegister()) return;

        const username = document.getElementById('newUsername')?.value;
        const password = document.getElementById('newPassword')?.value;
        const passwordHash = await this.hashPassword(password);

        storage.users.push({
            id: this.generateUniqueId(),
            username: username,
            password: passwordHash,
            balance: 0,
            purchases: [],
            isAdmin: false
        });
        storage.saveUsers();
        ui.showLoginForm();
        alert('Usuário registrado com sucesso! Faça login.');
    },

    forgotPassword() {
        alert('Funcionalidade de recuperação de senha não implementada. Contate o suporte.');
    },

    logout() {
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('currentUser');
        state.currentUser = null;
        window.location.href = 'index.html';
    },

    checkAdminMode() {
        const cartIcon = document.getElementById('cartIcon');
        if (cartIcon) {
            cartIcon.addEventListener('click', () => {
                state.clickCount++;
                if (state.clickCount >= CONFIG.ADMIN_CLICKS) {
                    const password = prompt('Insira a senha para acessar o Painel Admin:');
                    if (password === CONFIG.ADMIN_PASSWORD) {
                        const adminUser = storage.users.find(u => u.username === state.currentUser);
                        if (adminUser) {
                            adminUser.isAdmin = true;
                            storage.saveUsers();
                            alert('Acesso ao Painel Admin concedido!');
                            window.location.href = 'dashboard.html';
                        }
                    } else {
                        alert('Senha incorreta!');
                        state.clickCount = 0;
                    }
                }
            });
        }
    }
};

// === Carrinho ===
const cart = {
    addToCart(cardNumber, price) {
        const card = storage.cards.find(c => c.number === cardNumber);
        if (!card || card.stock <= 0) {
            alert('Cartão fora de estoque!');
            return;
        }
        state.cartItems.push({ cardNumber, price, expiry: card.expiry });
        state.cartTotal += price;
        const cartTotalAmount = document.getElementById('cartTotalAmount');
        const cartContainer = document.getElementById('cartContainer');
        if (cartTotalAmount) cartTotalAmount.textContent = state.cartTotal.toFixed(2);
        if (cartContainer) cartContainer.classList.add('active');
        const cardItem = document.querySelector(`[data-card-number="${cardNumber}"]`);
        if (cardItem) cardItem.classList.add('added');
        this.updateCartDisplay();
    },

    removeFromCart(cardNumber) {
        const index = state.cartItems.findIndex(item => item.cardNumber === cardNumber);
        if (index !== -1) {
            state.cartTotal -= state.cartItems[index].price;
            state.cartItems.splice(index, 1);
            const cartTotalAmount = document.getElementById('cartTotalAmount');
            if (cartTotalAmount) cartTotalAmount.textContent = state.cartTotal.toFixed(2);
            this.updateCartDisplay();
            const cardItem = document.querySelector(`[data-card-number="${cardNumber}"]`);
            if (cardItem) cardItem.classList.remove('added');
            if (state.cartItems.length === 0) {
                const cartContainer = document.getElementById('cartContainer');
                if (cartContainer) cartContainer.classList.remove('active');
            }
        }
    },

    updateCartDisplay() {
        const cartList = document.getElementById('cartList');
        if (cartList) {
            cartList.innerHTML = state.cartItems.map(item => `
                <div class="card-item" data-card-number="${item.cardNumber}">
                    <h2>${item.cardNumber.slice(0, 6)} **** **** ****</h2>
                    <p>Validade: ${item.expiry}</p>
                    <p>Visa - Banco do Brasil S.A.</p>
                    <p>Brasil</p>
                    <div class="price">R$ ${item.price.toFixed(2)}</div>
                    <div class="buttons">
                        <button onclick="cart.removeFromCart('${item.cardNumber}')">Remover</button>
                    </div>
                </div>
            `).join('');
        }
    },

    finalizePurchase() {
        const user = storage.users.find(u => u.username === state.currentUser);
        if (!user) {
            alert('Usuário não encontrado. Faça login novamente.');
            return;
        }
        if (user.balance < state.cartTotal) {
            const confirmRecharge = confirm(`Saldo insuficiente! Deseja recarregar R$ ${state.cartTotal.toFixed(2)} para completar a compra?`);
            if (confirmRecharge) {
                ui.showAddBalanceForm();
            }
            return;
        }
        if (state.cartItems.length === 0) {
            alert('Seu carrinho está vazio.');
            return;
        }
        user.balance -= state.cartTotal;
        user.purchases.push(...state.cartItems.map(item => ({ ...item, date: new Date() })));
        state.cartItems.forEach(item => {
            const card = storage.cards.find(c => c.number === item.cardNumber);
            if (card) card.stock -= 1;
        });
        storage.saveUsers();
        storage.saveCards();
        state.cartItems = [];
        state.cartTotal = 0;
        const cartTotalAmount = document.getElementById('cartTotalAmount');
        const cartList = document.getElementById('cartList');
        const cartContainer = document.getElementById('cartContainer');
        const userBalance = document.getElementById('userBalance');
        const userBalanceAccount = document.getElementById('userBalanceAccount');
        if (cartTotalAmount) cartTotalAmount.textContent = '0.00';
        if (cartList) cartList.innerHTML = '';
        if (cartContainer) cartContainer.classList.remove('active');
        if (userBalance) userBalance.textContent = user.balance.toFixed(2);
        if (userBalanceAccount) userBalanceAccount.textContent = user.balance.toFixed(2);
        ui.showAccountInfo();
        alert('Compra finalizada com sucesso!');
    },

    buyCard(cardNumber) {
        const card = storage.cards.find(c => c.number === cardNumber);
        if (!card) {
            alert('Cartão não encontrado.');
            return;
        }
        if (card.stock <= 0) {
            alert('Cartão fora de estoque!');
            return;
        }
        const user = storage.users.find(u => u.username === state.currentUser);
        if (!user) {
            alert('Usuário não encontrado. Faça login novamente.');
            return;
        }
        if (user.balance < card.price) {
            const confirmRecharge = confirm(`Saldo insuficiente! Deseja recarregar R$ ${card.price.toFixed(2)} para comprar este cartão?`);
            if (confirmRecharge) {
                ui.showAddBalanceForm();
            }
            return;
        }
        user.balance -= card.price;
        user.purchases.push({ cardNumber: card.number, price: card.price, date: new Date() });
        card.stock -= 1;
        storage.saveUsers();
        storage.saveCards();
        const userBalance = document.getElementById('userBalance');
        const userBalanceAccount = document.getElementById('userBalanceAccount');
        if (userBalance) userBalance.textContent = user.balance.toFixed(2);
        if (userBalanceAccount) userBalanceAccount.textContent = user.balance.toFixed(2);
        ui.filterCards();
        ui.showAccountInfo();
        alert('Cartão comprado com sucesso!');
    }
};

// === Interface do Usuário ===
const ui = {
    toggleTheme() {
        document.body.classList.toggle('light');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.textContent = document.body.classList.contains('light') ? 'Modo Escuro' : 'Modo Claro';
    },

    updateNavbarVisibility() {
        const navbar = document.getElementById('navbar');
        if (navbar && localStorage.getItem('loggedIn')) {
            navbar.style.display = 'flex';
        } else if (navbar) {
            navbar.style.display = 'none';
        }
    },

    showRegisterForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm && registerForm) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'flex';
        }
    },

    showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm && registerForm) {
            registerForm.style.display = 'none';
            loginForm.style.display = 'flex';
        }
    },

    showAccountInfo() {
        const accountInfo = document.getElementById('accountInfo');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const navbar = document.getElementById('navbar');

        if (accountInfo && loginForm && registerForm && navbar) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'none';
            accountInfo.style.display = 'flex';
            navbar.style.display = 'flex';

            const user = storage.users.find(u => u.username === state.currentUser);
            if (user) {
                document.getElementById('userName').textContent = user.username;
                document.getElementById('userId').textContent = user.id;
                document.getElementById('userBalanceAccount').textContent = user.balance.toFixed(2);
                const purchaseHistory = document.getElementById('purchaseHistory');
                if (purchaseHistory) {
                    purchaseHistory.innerHTML = user.purchases.length > 0
                        ? user.purchases.map(p => `<p>${p.cardNumber} - R$ ${p.price.toFixed(2)} (${new Date(p.date).toLocaleDateString()})</p>`).join('')
                        : '<p>Nenhuma compra registrada.</p>';
                }
            }
        }
    },

    showAddBalanceForm() {
        const rechargeModal = document.getElementById('rechargeModal');
        if (rechargeModal) {
            rechargeModal.style.display = 'flex';
        }
    },

    closeModal() {
        const rechargeModal = document.getElementById('rechargeModal');
        if (rechargeModal) {
            rechargeModal.style.display = 'none';
        }
    },

    selectRecharge(amount) {
        state.selectedRechargeAmount = amount;
        this.closeModal();
        const pixPayment = document.getElementById('pixPayment');
        const pixLoading = document.getElementById('pixLoading');
        if (pixPayment && pixLoading) {
            pixPayment.style.display = 'block';
            pixLoading.style.display = 'block';
            document.getElementById('pixKey').textContent = 'Carregando...';
            document.getElementById('pixQRCode').src = 'https://via.placeholder.com/150';
            setTimeout(() => {
                pixLoading.style.display = 'none';
                this.updatePixDetailsDisplay();
            }, 5000);
        }
    },

    copyPixKey() {
        const pixKey = document.getElementById('pixKey')?.textContent;
        if (pixKey && pixKey !== 'Carregando...') {
            navigator.clipboard.writeText(pixKey).then(() => {
                alert('Chave Pix copiada para a área de transferência!');
            });
        } else {
            alert('Chave Pix não disponível.');
        }
    },

    updatePixDetailsDisplay() {
        const pixKeySpan = document.getElementById('pixKey');
        const pixQRCodeImg = document.getElementById('pixQRCode');

        if (state.selectedRechargeAmount && storage.pixDetails[state.selectedRechargeAmount]) {
            if (pixKeySpan) pixKeySpan.textContent = storage.pixDetails[state.selectedRechargeAmount].key;
            if (pixQRCodeImg) pixQRCodeImg.src = storage.pixDetails[state.selectedRechargeAmount].qrCode;
        } else {
            if (pixKeySpan) pixKeySpan.textContent = 'Chave não configurada';
            if (pixQRCodeImg) pixQRCodeImg.src = 'https://via.placeholder.com/150';
        }
    },

    addBalance() {
        if (!state.selectedRechargeAmount || ![40, 70, 150, 300].includes(state.selectedRechargeAmount)) {
            alert('Por favor, selecione um valor de recarga válido.');
            return;
        }
        const user = storage.users.find(u => u.username === state.currentUser);
        if (user) {
            const bonus = state.selectedRechargeAmount * 0.5;
            const totalCredit = state.selectedRechargeAmount + bonus;
            user.balance += totalCredit;
            storage.saveUsers();
            const userBalance = document.getElementById('userBalance');
            const userBalanceAccount = document.getElementById('userBalanceAccount');
            if (userBalance) userBalance.textContent = user.balance.toFixed(2);
            if (userBalanceAccount) userBalanceAccount.textContent = user.balance.toFixed(2);
            const pixPayment = document.getElementById('pixPayment');
            if (pixPayment) pixPayment.style.display = 'none';
            alert(`Saldo adicionado com sucesso! Você recarregou R$ ${state.selectedRechargeAmount.toFixed(2)} e recebeu R$ ${totalCredit.toFixed(2)} (incluindo bônus de R$ ${bonus.toFixed(2)}).`);
            state.selectedRechargeAmount = null;
        }
    },

    filterCards() {
        const brandFilter = document.getElementById('brandFilter')?.value;
        const typeFilter = document.getElementById('typeFilter')?.value;
        const cardList = document.getElementById('cardList');
        if (cardList) {
            cardList.innerHTML = storage.cards
                .filter(card => (brandFilter === 'all' || card.brand === brandFilter) &&
                               (typeFilter === 'all' || card.type === typeFilter))
                .map(card => `
                    <div class="card-item" data-card-number="${card.number}">
                        <h2>${card.number.slice(0, 6)} **** **** ****</h2>
                        <p>Validade: ${card.expiry}</p>
                        <p>${card.brand} - ${card.bank}</p>
                        <p>${card.country}</p>
                        <div class="price">R$ ${card.price.toFixed(2)}</div>
                        <div class="buttons">
                            <button onclick="cart.buyCard('${card.number}')">Comprar</button>
                        </div>
                    </div>
                `).join('');
        }
    },

    checkOffline() {
        if (!navigator.onLine) {
            alert('Você está offline. Algumas funcionalidades podem estar limitadas.');
        }
    }
};

// === Inicialização ===
function initializeApp() {
    auth.initializeData().then(() => {
        const loggedIn = localStorage.getItem('loggedIn');
        const currentUser = localStorage.getItem('currentUser');
        if (loggedIn && currentUser) {
            state.currentUser = currentUser;
            if (window.location.pathname.includes('index.html')) {
                ui.showAccountInfo();
            } else if (window.location.pathname.includes('shop.html')) {
                ui.filterCards();
                const user = storage.users.find(u => u.username === state.currentUser);
                const userBalance = document.getElementById('userBalance');
                if (user && userBalance) userBalance.textContent = user.balance.toFixed(2);
                auth.checkAdminMode();
            } else if (window.location.pathname.includes('dashboard.html')) {
                ui.filterCards();
                const user = storage.users.find(u => u.username === state.currentUser);
                if (user && user.isAdmin) {
                    // Função searchUsers não implementada, mas mantida para compatibilidade futura
                } else {
                    window.location.href = 'shop.html';
                }
            }
        } else if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }

        // Associa eventos de validação em tempo real
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const newUsernameInput = document.getElementById('newUsername');
        const newPasswordInput = document.getElementById('newPassword');
        if (usernameInput) usernameInput.addEventListener('input', auth.validateLogin);
        if (passwordInput) passwordInput.addEventListener('input', auth.validateLogin);
        if (newUsernameInput) newUsernameInput.addEventListener('input', auth.validateRegister);
        if (newPasswordInput) newPasswordInput.addEventListener('input', auth.validateRegister);

        // Associa eventos de login e registro
        document.getElementById('loginButton')?.addEventListener('click', () => auth.login());
        document.getElementById('registerButton')?.addEventListener('click', () => auth.register());

        // Associa Enter para login e registro
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm) {
            loginForm.querySelectorAll('input').forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') auth.login();
                });
            });
        }
        if (registerForm) {
            registerForm.querySelectorAll('input').forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') auth.register();
                });
            });
        }

        ui.checkOffline();
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);

// Expondo funções globais necessárias
window.toggleTheme = ui.toggleTheme;
window.showRegisterForm = ui.showRegisterForm;
window.showLoginForm = ui.showLoginForm;
window.showAccountInfo = ui.showAccountInfo;
window.logout = auth.logout;
window.showAddBalanceForm = ui.showAddBalanceForm;
window.closeModal = ui.closeModal;
window.selectRecharge = ui.selectRecharge;
window.copyPixKey = ui.copyPixKey;
window.addBalance = ui.addBalance;
window.filterCards = ui.filterCards;
window.finalizePurchase = cart.finalizePurchase;
window.forgotPassword = auth.forgotPassword;
window.addToCart = cart.addToCart;
window.removeFromCart = cart.removeFromCart;
window.buyCard = cart.buyCard;
