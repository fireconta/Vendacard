// === Configurações ===
const CONFIG = {
    SESSION_TIMEOUT_MINUTES: 30,
    ADMIN_CLICKS: 5,
    ADMIN_PASSWORD: 'LOVEz',
    MIN_PASSWORD_LENGTH: 6,
    MAX_LOGIN_ATTEMPTS: 3,
    LOGIN_BLOCK_TIME: 60000,
    LOW_STOCK_THRESHOLD: 3,
    NOTIFICATION_TIMEOUT: 5000
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
    selectedRechargeAmount: null,
    editingCardId: null,
    editingPixAmount: null,
    logs: JSON.parse(localStorage.getItem('logs')) || []
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
    },

    saveLogs() {
        try {
            localStorage.setItem('logs', JSON.stringify(state.logs));
        } catch (error) {
            console.error('Erro ao guardar logs:', error);
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
                        } else {
                            alert('Usuário não encontrado. Faça login novamente.');
                            window.location.href = 'index.html';
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
        const cartList = document.getElementById('cardList');
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
        const cartList = document.getElementById('cardList');
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

    // Funções do Dashboard
    updateStats() {
        const totalUsers = storage.users.length;
        const totalCards = storage.cards.length;
        const totalBalance = storage.users.reduce((sum, user) => sum + (user.balance || 0), 0);

        const totalUsersElement = document.getElementById('totalUsers');
        const totalCardsElement = document.getElementById('totalCards');
        const totalBalanceElement = document.getElementById('totalBalance');

        if (totalUsersElement) totalUsersElement.textContent = totalUsers;
        if (totalCardsElement) totalCardsElement.textContent = totalCards;
        if (totalBalanceElement) totalBalanceElement.textContent = totalBalance.toFixed(2);

        this.updateBalanceChart();
        this.updateSalesChart();
    },

    updateBalanceChart() {
        const ctx = document.getElementById('balanceChart').getContext('2d');
        if (window.balanceChart) window.balanceChart.destroy();
        const userBalances = storage.users.map(user => ({ username: user.username, balance: user.balance || 0 }));
        window.balanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: userBalances.map(u => u.username),
                datasets: [{
                    label: 'Saldo (R$)',
                    data: userBalances.map(u => u.balance),
                    backgroundColor: '#2ecc71',
                    borderColor: '#27ae60',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Saldo (R$)' } },
                    x: { title: { display: true, text: 'Usuários' } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });
    },

    updateSalesChart() {
        const ctx = document.getElementById('salesChart').getContext('2d');
        if (window.salesChart) window.salesChart.destroy();
        const allPurchases = storage.users.flatMap(user => user.purchases);
        const salesByDate = {};
        allPurchases.forEach(p => {
            const date = new Date(p.date).toLocaleDateString();
            salesByDate[date] = (salesByDate[date] || 0) + p.price;
        });
        window.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(salesByDate),
                datasets: [{
                    label: 'Vendas (R$)',
                    data: Object.values(salesByDate),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Vendas (R$)' } },
                    x: { title: { display: true, text: 'Data' } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });
    },

    displayUsers(searchTerm = '') {
        const userList = document.getElementById('userList');
        if (userList) {
            const filteredUsers = storage.users.filter(user => 
                user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.id.includes(searchTerm)
            );
            userList.innerHTML = filteredUsers.map(user => `
                <div class="card-item ${user.balance < 0 ? 'low-balance' : ''}">
                    <h2>${user.username}</h2>
                    <p>ID: ${user.id}</p>
                    <p>Saldo: R$ ${user.balance.toFixed(2)}</p>
                    <p>Compras: ${user.purchases.length}</p>
                    <div class="buttons">
                        <button onclick="ui.editUser('${user.id}')"><i class="fas fa-edit"></i> Editar</button>
                        <button onclick="ui.deleteUser('${user.id}')"><i class="fas fa-trash-alt"></i> Excluir</button>
                    </div>
                </div>
            `).join('');
        }
    },

    displayAdminCards(searchTerm = '') {
        const adminCardList = document.getElementById('adminCardList');
        if (adminCardList) {
            const filteredCards = storage.cards.filter(card => 
                card.number.includes(searchTerm) ||
                card.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                card.bank.toLowerCase().includes(searchTerm.toLowerCase())
            );
            adminCardList.innerHTML = filteredCards.map(card => `
                <div class="card-item ${card.stock <= CONFIG.LOW_STOCK_THRESHOLD ? 'low-stock' : ''}" data-card-id="${card.id}">
                    <h2>${card.number.slice(0, 6)} **** **** ****</h2>
                    <p>Validade: ${card.expiry}</p>
                    <p>${card.brand} - ${card.bank}</p>
                    <p>${card.country}</p>
                    <p>Tipo: ${card.type}</p>
                    <p>Estoque: ${card.stock}</p>
                    <div class="price">R$ ${card.price.toFixed(2)}</div>
                    <div class="buttons">
                        <button onclick="ui.editCard('${card.id}')"><i class="fas fa-edit"></i> Editar</button>
                        <button onclick="ui.deleteCard('${card.id}')"><i class="fas fa-trash-alt"></i> Excluir</button>
                    </div>
                </div>
            `).join('');
            this.checkLowStockAlerts();
        }
    },

    checkLowStockAlerts() {
        const lowStockCards = storage.cards.filter(card => card.stock <= CONFIG.LOW_STOCK_THRESHOLD);
        if (lowStockCards.length > 0) {
            this.showNotification(`Atenção: ${lowStockCards.length} cartão(s) com estoque baixo (${CONFIG.LOW_STOCK_THRESHOLD} ou menos).`);
        }
    },

    showNotification(message) {
        const notifications = document.getElementById('notifications');
        if (notifications) {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = message;
            notifications.appendChild(notification);
            setTimeout(() => notification.remove(), CONFIG.NOTIFICATION_TIMEOUT);
        }
    },

    addLog(action) {
        const log = {
            timestamp: new Date().toISOString(),
            action: action,
            user: state.currentUser
        };
        state.logs.push(log);
        storage.saveLogs();
        this.displayLogs();
    },

    displayLogs() {
        const logList = document.getElementById('logList');
        if (logList) {
            logList.innerHTML = state.logs.map(log => `
                <div class="card-item">
                    <p><strong>Data:</strong> ${new Date(log.timestamp).toLocaleString()}</p>
                    <p><strong>Usuário:</strong> ${log.user}</p>
                    <p><strong>Ação:</strong> ${log.action}</p>
                </div>
            `).join('');
        }
    },

    clearLogs() {
        if (confirm('Tem certeza que deseja limpar todos os logs?')) {
            state.logs = [];
            storage.saveLogs();
            this.displayLogs();
            this.showNotification('Logs limpos com sucesso!');
        }
    },

    exportLogs() {
        const csv = [
            'Data,Usuário,Ação',
            ...state.logs.map(log => `${new Date(log.timestamp).toLocaleString()},${log.user},${log.action}`)
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'logs.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    },

    showAddCardModal() {
        state.editingCardId = null;
        const modal = document.getElementById('cardModal');
        const modalTitle = document.getElementById('modalTitle');
        if (modal && modalTitle) {
            modalTitle.textContent = 'Adicionar Novo Cartão';
            document.getElementById('cardNumber').value = '';
            document.getElementById('cardCvv').value = '';
            document.getElementById('cardExpiry').value = '';
            document.getElementById('cardBrand').value = '';
            document.getElementById('cardBank').value = '';
            document.getElementById('cardCountry').value = '';
            document.getElementById('cardPrice').value = '';
            document.getElementById('cardStock').value = '';
            document.getElementById('cardType').value = '';
            this.clearCardFormErrors();
            modal.style.display = 'flex';
        }
    },

    closeCardModal() {
        const modal = document.getElementById('cardModal');
        if (modal) {
            modal.style.display = 'none';
            state.editingCardId = null;
        }
    },

    clearCardFormErrors() {
        const errorFields = [
            'cardNumberError', 'cardCvvError', 'cardExpiryError',
            'cardBrandError', 'cardBankError', 'cardCountryError',
            'cardPriceError', 'cardStockError', 'cardTypeError'
        ];
        errorFields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.textContent = '';
                element.parentElement.classList.remove('invalid');
            }
        });
    },

    validateCardForm() {
        const number = document.getElementById('cardNumber').value;
        const cvv = document.getElementById('cardCvv').value;
        const expiry = document.getElementById('cardExpiry').value;
        const brand = document.getElementById('cardBrand').value;
        const bank = document.getElementById('cardBank').value;
        const country = document.getElementById('cardCountry').value;
        const price = parseFloat(document.getElementById('cardPrice').value);
        const stock = parseInt(document.getElementById('cardStock').value);
        const type = document.getElementById('cardType').value;

        let isValid = true;

        if (!number || !/^\d{16}$/.test(number)) {
            document.getElementById('cardNumberError').textContent = 'Número do cartão deve ter 16 dígitos.';
            document.getElementById('cardNumber').parentElement.classList.add('invalid');
            isValid = false;
        } else if (!state.editingCardId && storage.cards.some(c => c.number === number)) {
            document.getElementById('cardNumberError').textContent = 'Número do cartão já existe.';
            document.getElementById('cardNumber').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('cardNumberError').textContent = '';
            document.getElementById('cardNumber').parentElement.classList.remove('invalid');
        }

        if (!cvv || !/^\d{3}$/.test(cvv)) {
            document.getElementById('cardCvvError').textContent = 'CVV deve ter 3 dígitos.';
            document.getElementById('cardCvv').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('cardCvvError').textContent = '';
            document.getElementById('cardCvv').parentElement.classList.remove('invalid');
        }

        if (!expiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
            document.getElementById('cardExpiryError').textContent = 'Validade deve estar no formato MM/AA.';
            document.getElementById('cardExpiry').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('cardExpiryError').textContent = '';
            document.getElementById('cardExpiry').parentElement.classList.remove('invalid');
        }

        if (!brand) {
            document.getElementById('cardBrandError').textContent = 'Selecione uma bandeira.';
            document.getElementById('cardBrand').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('cardBrandError').textContent = '';
            document.getElementById('cardBrand').parentElement.classList.remove('invalid');
        }

        if (!bank) {
            document.getElementById('cardBankError').textContent = 'Banco é obrigatório.';
            document.getElementById('cardBank').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('cardBankError').textContent = '';
            document.getElementById('cardBank').parentElement.classList.remove('invalid');
        }

        if (!country) {
            document.getElementById('cardCountryError').textContent = 'País é obrigatório.';
            document.getElementById('cardCountry').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('cardCountryError').textContent = '';
            document.getElementById('cardCountry').parentElement.classList.remove('invalid');
        }

        if (!price || price <= 0) {
            document.getElementById('cardPriceError').textContent = 'Preço deve ser maior que 0.';
            document.getElementById('cardPrice').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('cardPriceError').textContent = '';
            document.getElementById('cardPrice').parentElement.classList.remove('invalid');
        }

        if (!stock || stock < 0) {
            document.getElementById('cardStockError').textContent = 'Estoque deve ser 0 ou maior.';
            document.getElementById('cardStock').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('cardStockError').textContent = '';
            document.getElementById('cardStock').parentElement.classList.remove('invalid');
        }

        if (!type) {
            document.getElementById('cardTypeError').textContent = 'Selecione o tipo do cartão.';
            document.getElementById('cardType').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('cardTypeError').textContent = '';
            document.getElementById('cardType').parentElement.classList.remove('invalid');
        }

        return isValid;
    },

    saveCard() {
        if (!this.validateCardForm()) return;

        const card = {
            id: state.editingCardId || auth.generateUniqueId(),
            number: document.getElementById('cardNumber').value,
            cvv: document.getElementById('cardCvv').value,
            expiry: document.getElementById('cardExpiry').value,
            brand: document.getElementById('cardBrand').value,
            bank: document.getElementById('cardBank').value,
            country: document.getElementById('cardCountry').value,
            price: parseFloat(document.getElementById('cardPrice').value),
            stock: parseInt(document.getElementById('cardStock').value),
            type: document.getElementById('cardType').value
        };

        if (state.editingCardId) {
            const index = storage.cards.findIndex(c => c.id === state.editingCardId);
            storage.cards[index] = card;
            this.addLog(`Cartão ${card.number} atualizado`);
        } else {
            storage.cards.push(card);
            this.addLog(`Cartão ${card.number} adicionado`);
        }

        storage.saveCards();
        this.displayAdminCards();
        this.updateStats();
        this.closeCardModal();
        this.showNotification(state.editingCardId ? 'Cartão atualizado com sucesso!' : 'Cartão adicionado com sucesso!');
    },

    editCard(cardId) {
        const card = storage.cards.find(c => c.id === cardId);
        if (card) {
            state.editingCardId = cardId;
            const modal = document.getElementById('cardModal');
            const modalTitle = document.getElementById('modalTitle');
            if (modal && modalTitle) {
                modalTitle.textContent = 'Editar Cartão';
                document.getElementById('cardNumber').value = card.number;
                document.getElementById('cardCvv').value = card.cvv;
                document.getElementById('cardExpiry').value = card.expiry;
                document.getElementById('cardBrand').value = card.brand;
                document.getElementById('cardBank').value = card.bank;
                document.getElementById('cardCountry').value = card.country;
                document.getElementById('cardPrice').value = card.price;
                document.getElementById('cardStock').value = card.stock;
                document.getElementById('cardType').value = card.type;
                this.clearCardFormErrors();
                modal.style.display = 'flex';
            }
        }
    },

    deleteCard(cardId) {
        const card = storage.cards.find(c => c.id === cardId);
        if (confirm('Tem certeza que deseja excluir este cartão?')) {
            storage.cards = storage.cards.filter(c => c.id !== cardId);
            storage.saveCards();
            this.displayAdminCards();
            this.updateStats();
            this.addLog(`Cartão ${card.number} excluído`);
            this.showNotification('Cartão excluído com sucesso!');
        }
    },

    showBulkEditModal() {
        const modal = document.getElementById('bulkEditModal');
        if (modal) {
            document.getElementById('bulkEditField').value = '';
            document.getElementById('bulkEditValue').value = '';
            this.clearBulkEditFormErrors();
            modal.style.display = 'flex';
        }
    },

    closeBulkEditModal() {
        const modal = document.getElementById('bulkEditModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    clearBulkEditFormErrors() {
        const errorFields = ['bulkEditFieldError', 'bulkEditValueError'];
        errorFields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.textContent = '';
                element.parentElement.classList.remove('invalid');
            }
        });
    },

    validateBulkEditForm() {
        const field = document.getElementById('bulkEditField').value;
        const value = parseFloat(document.getElementById('bulkEditValue').value);

        let isValid = true;

        if (!field) {
            document.getElementById('bulkEditFieldError').textContent = 'Selecione um campo.';
            document.getElementById('bulkEditField').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('bulkEditFieldError').textContent = '';
            document.getElementById('bulkEditField').parentElement.classList.remove('invalid');
        }

        if (!value || value < 0) {
            document.getElementById('bulkEditValueError').textContent = 'Insira um valor válido (0 ou maior).';
            document.getElementById('bulkEditValue').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('bulkEditValueError').textContent = '';
            document.getElementById('bulkEditValue').parentElement.classList.remove('invalid');
        }

        return isValid;
    },

    applyBulkEdit() {
        if (!this.validateBulkEditForm()) return;

        const field = document.getElementById('bulkEditField').value;
        const value = parseFloat(document.getElementById('bulkEditValue').value);

        storage.cards.forEach(card => {
            if (field === 'price') card.price = value;
            else if (field === 'stock') card.stock = Math.round(value);
        });

        storage.saveCards();
        this.displayAdminCards();
        this.updateStats();
        this.closeBulkEditModal();
        this.addLog(`Edição em massa aplicada: ${field} alterado para ${value}`);
        this.showNotification('Edição em massa aplicada com sucesso!');
    },

    editUser(userId) {
        const user = storage.users.find(u => u.id === userId);
        if (user) {
            const newBalance = prompt('Novo saldo do usuário:', user.balance);
            if (newBalance !== null && !isNaN(newBalance) && newBalance >= 0) {
                user.balance = parseFloat(newBalance);
                storage.saveUsers();
                this.displayUsers();
                this.updateStats();
                this.addLog(`Saldo do usuário ${user.username} atualizado para R$ ${user.balance}`);
                this.showNotification('Saldo do usuário atualizado com sucesso!');
            } else {
                alert('Por favor, insira um valor válido para o saldo.');
            }
        }
    },

    deleteUser(userId) {
        if (userId === storage.users.find(u => u.username === state.currentUser)?.id) {
            alert('Você não pode excluir sua própria conta.');
            return;
        }
        const user = storage.users.find(u => u.id === userId);
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            storage.users = storage.users.filter(u => u.id !== userId);
            storage.saveUsers();
            this.displayUsers();
            this.updateStats();
            this.addLog(`Usuário ${user.username} excluído`);
            this.showNotification('Usuário excluído com sucesso!');
        }
    },

    showAddPixModal() {
        state.editingPixAmount = null;
        const modal = document.getElementById('pixModal');
        const modalTitle = document.getElementById('pixModalTitle');
        if (modal && modalTitle) {
            modalTitle.textContent = 'Adicionar Nova Configuração PIX';
            document.getElementById('pixAmount').value = '';
            document.getElementById('pixKey').value = '';
            document.getElementById('pixQRCode').value = '';
            this.clearPixFormErrors();
            modal.style.display = 'flex';
        }
    },

    closePixModal() {
        const modal = document.getElementById('pixModal');
        if (modal) {
            modal.style.display = 'none';
            state.editingPixAmount = null;
        }
    },

    clearPixFormErrors() {
        const errorFields = ['pixAmountError', 'pixKeyError', 'pixQRCodeError'];
        errorFields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.textContent = '';
                element.parentElement.classList.remove('invalid');
            }
        });
    },

    validatePixForm() {
        const amount = parseInt(document.getElementById('pixAmount').value);
        const key = document.getElementById('pixKey').value;
        const qrCode = document.getElementById('pixQRCode').value;

        let isValid = true;

        if (!amount || amount <= 0 || (storage.pixDetails[amount] && !state.editingPixAmount)) {
            document.getElementById('pixAmountError').textContent = 'Insira um valor válido e único.';
            document.getElementById('pixAmount').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('pixAmountError').textContent = '';
            document.getElementById('pixAmount').parentElement.classList.remove('invalid');
        }

        if (!key) {
            document.getElementById('pixKeyError').textContent = 'Chave PIX é obrigatória.';
            document.getElementById('pixKey').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('pixKeyError').textContent = '';
            document.getElementById('pixKey').parentElement.classList.remove('invalid');
        }

        if (!qrCode || !qrCode.startsWith('http')) {
            document.getElementById('pixQRCodeError').textContent = 'Insira uma URL válida para o QR Code.';
            document.getElementById('pixQRCode').parentElement.classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('pixQRCodeError').textContent = '';
            document.getElementById('pixQRCode').parentElement.classList.remove('invalid');
        }

        return isValid;
    },

    savePix() {
        if (!this.validatePixForm()) return;

        const amount = parseInt(document.getElementById('pixAmount').value);
        const pix = {
            key: document.getElementById('pixKey').value,
            qrCode: document.getElementById('pixQRCode').value
        };

        if (state.editingPixAmount !== null) {
            storage.pixDetails[state.editingPixAmount] = pix;
            this.addLog(`Configuração PIX para R$ ${state.editingPixAmount} atualizada`);
        } else {
            storage.pixDetails[amount] = pix;
            this.addLog(`Configuração PIX para R$ ${amount} adicionada`);
        }

        storage.savePixDetails();
        this.displayPixDetails();
        this.closePixModal();
        this.showNotification(state.editingPixAmount ? 'Configuração PIX atualizada com sucesso!' : 'Configuração PIX adicionada com sucesso!');
    },

    editPix(amount) {
        const pix = storage.pixDetails[amount];
        if (pix) {
            state.editingPixAmount = amount;
            const modal = document.getElementById('pixModal');
            const modalTitle = document.getElementById('pixModalTitle');
            if (modal && modalTitle) {
                modalTitle.textContent = 'Editar Configuração PIX';
                document.getElementById('pixAmount').value = amount;
                document.getElementById('pixAmount').disabled = true;
                document.getElementById('pixKey').value = pix.key;
                document.getElementById('pixQRCode').value = pix.qrCode;
                this.clearPixFormErrors();
                modal.style.display = 'flex';
            }
        }
    },

    deletePix(amount) {
        if (confirm('Tem certeza que deseja excluir esta configuração PIX?')) {
            delete storage.pixDetails[amount];
            storage.savePixDetails();
            this.displayPixDetails();
            this.addLog(`Configuração PIX para R$ ${amount} excluída`);
            this.showNotification('Configuração PIX excluída com sucesso!');
        }
    },

    displayPixDetails(searchTerm = '') {
        const pixList = document.getElementById('pixList');
        if (pixList) {
            const filteredPix = Object.entries(storage.pixDetails).filter(([amount, pix]) => 
                amount.includes(searchTerm) || pix.key.toLowerCase().includes(searchTerm.toLowerCase())
            );
            pixList.innerHTML = filteredPix.map(([amount, pix]) => `
                <div class="card-item">
                    <h2>Valor: R$ ${amount}</h2>
                    <p>Chave: ${pix.key}</p>
                    <p>QR Code: <a href="${pix.qrCode}" target="_blank">${pix.qrCode}</a></p>
                    <div class="buttons">
                        <button onclick="ui.editPix(${amount})"><i class="fas fa-edit"></i> Editar</button>
                        <button onclick="ui.deletePix(${amount})"><i class="fas fa-trash-alt"></i> Excluir</button>
                    </div>
                </div>
            `).join('');
        }
    },

    filterPurchases(searchTerm = '') {
        const userFilter = document.getElementById('purchaseFilterUser').value;
        const dateFilter = document.getElementById('purchaseFilterDate').value;
        const valueFilter = document.getElementById('purchaseFilterValue').value;
        const purchaseList = document.getElementById('purchaseList');
        if (purchaseList) {
            const allPurchases = storage.users.flatMap(user => user.purchases.map(p => ({ ...p, username: user.username })));
            const filteredPurchases = allPurchases.filter(p => 
                (!userFilter || p.username === userFilter) &&
                (!dateFilter || new Date(p.date).toISOString().split('T')[0] === dateFilter) &&
                (!valueFilter || p.price === parseFloat(valueFilter)) &&
                (p.username.toLowerCase().includes(searchTerm.toLowerCase()) || p.cardNumber.includes(searchTerm))
            );
            purchaseList.innerHTML = filteredPurchases.length > 0
                ? filteredPurchases.map(p => `
                    <div class="card-item">
                        <h2>${p.username}</h2>
                        <p>Cartão: ${p.cardNumber.slice(0, 6)} **** **** ****</p>
                        <p>Valor: R$ ${p.price.toFixed(2)}</p>
                        <p>Data: ${new Date(p.date).toLocaleDateString()}</p>
                    </div>
                `).join('')
                : '<p>Nenhuma compra encontrada.</p>';
        }
    },

    globalSearch() {
        const searchTerm = document.getElementById('globalSearch').value;
        const activeTab = document.querySelector('.tab-content[style*="block"]')?.id;
        if (activeTab === 'users') this.displayUsers(searchTerm);
        else if (activeTab === 'cards') this.displayAdminCards(searchTerm);
        else if (activeTab === 'purchases') this.filterPurchases(searchTerm);
        else if (activeTab === 'pix') this.displayPixDetails(searchTerm);
    },

    exportUsers() {
        const csv = [
            'ID,Usuário,Saldo,Compras',
            ...storage.users.map(user => `${user.id},${user.username},${user.balance.toFixed(2)},${user.purchases.length}`)
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        this.addLog('Exportação de usuários realizada');
    },

    exportCards() {
        const csv = [
            'ID,Número,CVV,Validade,Bandeira,Banco,País,Preço,Estoque,Tipo',
            ...storage.cards.map(card => `${card.id},${card.number},${card.cvv},${card.expiry},${card.brand},${card.bank},${card.country},${card.price.toFixed(2)},${card.stock},${card.type}`)
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cards.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        this.addLog('Exportação de cartões realizada');
    },

    checkOffline() {
        if (!navigator.onLine) {
            this.showNotification('Você está offline. Algumas funcionalidades podem estar limitadas.');
        }
    }
};

// === Funções de Navegação por Abas ===
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).style.display = 'block';
    document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`).classList.add('active');
    if (tabName === 'stats') ui.updateStats();
    else if (tabName === 'users') ui.displayUsers();
    else if (tabName === 'cards') ui.displayAdminCards();
    else if (tabName === 'purchases') ui.filterPurchases();
    else if (tabName === 'pix') ui.displayPixDetails();
    else if (tabName === 'logs') ui.displayLogs();
    ui.globalSearch(); // Aplica o filtro de busca ao mudar de aba
}

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
                const user = storage.users.find(u => u.username === state.currentUser);
                if (user && user.isAdmin) {
                    // Inicializar a aba de estatísticas por padrão
                    openTab('stats');
                    
                    // Preencher o filtro de usuários na aba de compras
                    const purchaseFilterUser = document.getElementById('purchaseFilterUser');
                    if (purchaseFilterUser) {
                        purchaseFilterUser.innerHTML = '<option value="">Todos</option>' +
                            storage.users.map(user => `<option value="${user.username}">${user.username}</option>`).join('');
                    }

                    // Adicionar evento para a barra de pesquisa global
                    const globalSearch = document.getElementById('globalSearch');
                    if (globalSearch) {
                        globalSearch.addEventListener('input', () => ui.globalSearch());
                    }

                    // Verificar se está offline
                    ui.checkOffline();
                    window.addEventListener('online', () => ui.showNotification('Conexão restaurada!'));
                    window.addEventListener('offline', () => ui.checkOffline());

                    // Carregar tema salvo
                    if (localStorage.getItem('theme') === 'light') {
                        document.body.classList.add('light');
                        const themeToggle = document.getElementById('themeToggle');
                        if (themeToggle) themeToggle.textContent = 'Modo Escuro';
                    }

                    // Configurar o tema
                    const themeToggle = document.getElementById('themeToggle');
                    if (themeToggle) {
                        themeToggle.addEventListener('click', () => {
                            localStorage.setItem('theme', document.body.classList.contains('light') ? 'dark' : 'light');
                        });
                    }

                    // Adicionar log de acesso ao painel
                    ui.addLog('Acessou o painel administrativo');
                } else {
                    alert('Acesso não autorizado! Você precisa ser administrador.');
                    window.location.href = 'index.html';
                }
            }
        } else {
            if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('shop.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

// === Funções Globais ===
function toggleTheme() {
    ui.toggleTheme();
}

function showAddCardModal() {
    ui.showAddCardModal();
}

function closeCardModal() {
    ui.closeCardModal();
}

function saveCard() {
    ui.saveCard();
}

function showAddPixModal() {
    ui.showAddPixModal();
}

function closePixModal() {
    ui.closePixModal();
}

function savePix() {
    ui.savePix();
}

function showBulkEditModal() {
    ui.showBulkEditModal();
}

function closeBulkEditModal() {
    ui.closeBulkEditModal();
}

function applyBulkEdit() {
    ui.applyBulkEdit();
}

function exportUsers() {
    ui.exportUsers();
}

function exportCards() {
    ui.exportCards();
}

function exportLogs() {
    ui.exportLogs();
}

function clearLogs() {
    ui.clearLogs();
}

function logout() {
    auth.logout();
}

// === Inicializar a Aplicação ===
document.addEventListener('DOMContentLoaded', initializeApp);
