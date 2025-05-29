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
                        ? user.purchases.map(p => {
                            const card = storage.cards.find(c => c.number === p.cardNumber) || {};
                            return `
                                <div class="card-item purchased-card">
                                    <h2>${p.cardNumber.slice(0, 6)} **** **** ****</h2>
                                    <p><strong>Validade:</strong> ${p.expiry}</p>
                                    <p><strong>Bandeira:</strong> ${card.brand || p.brand || 'Desconhecido'}</p>
                                    <p><strong>Banco:</strong> ${card.bank || p.bank || 'Desconhecido'}</p>
                                    <p><strong>País:</strong> ${card.country || p.country || 'Desconhecido'}</p>
                                    <p><strong>Tipo:</strong> ${card.type || p.type || 'Desconhecido'}</p>
                                    <p><strong>Preço:</strong> R$ ${p.price.toFixed(2)}</p>
                                    <p><strong>Data da Compra:</strong> ${new Date(p.date).toLocaleDateString()}</p>
                                </div>
                            `;
                        }).join('')
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
                            <button onclick="buyCard('${card.number}')">Comprar</button>
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
        const ctx = document.getElementById('balanceChart')?.getContext('2d');
        if (!ctx) return;
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
        const ctx = document.getElementById('salesChart')?.getContext('2d');
        if (!ctx) return;
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
    },

    showAddCardModal() {
        state.editingCardId = null;
        document.getElementById('modalTitle').textContent = 'Adicionar Novo Cartão';
        document.getElementById('cardNumber').value = '';
        document.getElementById('cardCvv').value = '';
        document.getElementById('cardExpiry').value = '';
        document.getElementById('cardBrand').value = '';
        document.getElementById('cardBank').value = '';
        document.getElementById('cardCountry').value = '';
        document.getElementById('cardPrice').value = '';
        document.getElementById('cardStock').value = '';
        document.getElementById('cardType').value = '';
        document.getElementById('cardModal').style.display = 'flex';
    },

    showBulkEditModal() {
        document.getElementById('bulkEditField').value = '';
        document.getElementById('bulkEditValue').value = '';
        document.getElementById('bulkEditModal').style.display = 'flex';
    },

    showAddPixModal() {
        state.editingPixAmount = null;
        document.getElementById('pixModalTitle').textContent = 'Adicionar Configuração PIX';
        document.getElementById('pixAmount').value = '';
        document.getElementById('pixKey').value = '';
        document.getElementById('pixQRCode').value = '';
        document.getElementById('pixModal').style.display = 'flex';
    },

    editUser(userId) {
        const user = storage.users.find(u => u.id === userId);
        if (user) {
            user.balance = parseFloat(prompt(`Novo saldo para ${user.username} (R$):`, user.balance)) || user.balance;
            storage.saveUsers();
            this.displayUsers();
            this.addLog(`Editado saldo do usuário ${user.username}`);
        }
    },

    deleteUser(userId) {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            const userIndex = storage.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                storage.users.splice(userIndex, 1);
                storage.saveUsers();
                this.displayUsers();
                this.addLog(`Excluído usuário com ID ${userId}`);
            }
        }
    },

    editCard(cardId) {
        const card = storage.cards.find(c => c.id === cardId);
        if (card) {
            state.editingCardId = cardId;
            document.getElementById('modalTitle').textContent = 'Editar Cartão';
            document.getElementById('cardNumber').value = card.number;
            document.getElementById('cardCvv').value = card.cvv;
            document.getElementById('cardExpiry').value = card.expiry;
            document.getElementById('cardBrand').value = card.brand;
            document.getElementById('cardBank').value = card.bank;
            document.getElementById('cardCountry').value = card.country;
            document.getElementById('cardPrice').value = card.price;
            document.getElementById('cardStock').value = card.stock;
            document.getElementById('cardType').value = card.type;
            document.getElementById('cardModal').style.display = 'flex';
        }
    },

    deleteCard(cardId) {
        if (confirm('Tem certeza que deseja excluir este cartão?')) {
            const cardIndex = storage.cards.findIndex(c => c.id === cardId);
            if (cardIndex !== -1) {
                storage.cards.splice(cardIndex, 1);
                storage.saveCards();
                this.displayAdminCards();
                this.addLog(`Excluído cartão com ID ${cardId}`);
            }
        }
    },

    saveCard() {
        const cardNumber = document.getElementById('cardNumber').value;
        const cardCvv = document.getElementById('cardCvv').value;
        const cardExpiry = document.getElementById('cardExpiry').value;
        const cardBrand = document.getElementById('cardBrand').value;
        const cardBank = document.getElementById('cardBank').value;
        const cardCountry = document.getElementById('cardCountry').value;
        const cardPrice = parseFloat(document.getElementById('cardPrice').value);
        const cardStock = parseInt(document.getElementById('cardStock').value);
        const cardType = document.getElementById('cardType').value;

        const errors = {};
        if (!cardNumber || cardNumber.length !== 16) errors.cardNumber = 'Número do cartão deve ter 16 dígitos.';
        if (!cardCvv || cardCvv.length !== 3) errors.cardCvv = 'CVV deve ter 3 dígitos.';
        if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) errors.cardExpiry = 'Validade deve estar no formato MM/AA.';
        if (!cardBrand) errors.cardBrand = 'Bandeira é obrigatória.';
        if (!cardBank) errors.cardBank = 'Banco é obrigatório.';
        if (!cardCountry) errors.cardCountry = 'País é obrigatório.';
        if (isNaN(cardPrice) || cardPrice <= 0) errors.cardPrice = 'Preço deve ser maior que zero.';
        if (isNaN(cardStock) || cardStock < 0) errors.cardStock = 'Estoque não pode ser negativo.';
        if (!cardType) errors.cardType = 'Tipo é obrigatório.';

        if (Object.keys(errors).length > 0) {
            for (let [field, message] of Object.entries(errors)) {
                document.getElementById(`${field}Error`).textContent = message;
                document.getElementById(field).parentElement.classList.add('invalid');
            }
            return;
        }

        const cardData = {
            id: state.editingCardId || Math.random().toString(36).substr(2, 9),
            number: cardNumber,
            cvv: cardCvv,
            expiry: cardExpiry,
            brand: cardBrand,
            bank: cardBank,
            country: cardCountry,
            price: cardPrice,
            stock: cardStock,
            type: cardType
        };

        if (state.editingCardId) {
            const cardIndex = storage.cards.findIndex(c => c.id === state.editingCardId);
            if (cardIndex !== -1) {
                storage.cards[cardIndex] = cardData;
                this.addLog(`Editado cartão com ID ${state.editingCardId}`);
            }
        } else {
            storage.cards.push(cardData);
            this.addLog(`Adicionado novo cartão com ID ${cardData.id}`);
        }

        storage.saveCards();
        document.getElementById('cardModal').style.display = 'none';
        this.displayAdminCards();
        this.clearCardFormErrors();
    },

    clearCardFormErrors() {
        ['cardNumber', 'cardCvv', 'cardExpiry', 'cardBrand', 'cardBank', 'cardCountry', 'cardPrice', 'cardStock', 'cardType'].forEach(field => {
            document.getElementById(`${field}Error`).textContent = '';
            document.getElementById(field).parentElement.classList.remove('invalid');
        });
    },

    applyBulkEdit() {
        const field = document.getElementById('bulkEditField').value;
        const value = document.getElementById('bulkEditValue').value;
        if (!field || !value) {
            document.getElementById('bulkEditFieldError').textContent = 'Selecione um campo e insira um valor.';
            return;
        }
        const numericFields = ['price', 'stock'];
        const newValue = numericFields.includes(field) ? parseFloat(value) : value;
        if (isNaN(newValue) && numericFields.includes(field)) {
            document.getElementById('bulkEditValueError').textContent = 'Valor deve ser numérico.';
            return;
        }
        storage.cards.forEach(card => {
            if (field === 'price' || field === 'stock') card[field] = newValue;
        });
        storage.saveCards();
        document.getElementById('bulkEditModal').style.display = 'none';
        this.displayAdminCards();
        this.addLog(`Edição em massa aplicada no campo ${field} com valor ${value}`);
    },

    savePix() {
        const amount = parseInt(document.getElementById('pixAmount').value);
        const key = document.getElementById('pixKey').value;
        const qrCode = document.getElementById('pixQRCode').value;

        const errors = {};
        if (isNaN(amount) || ![40, 70, 150, 300].includes(amount)) errors.pixAmount = 'Valor deve ser 40, 70, 150 ou 300.';
        if (!key) errors.pixKey = 'Chave PIX é obrigatória.';
        if (!qrCode) errors.pixQRCode = 'URL do QR Code é obrigatória.';

        if (Object.keys(errors).length > 0) {
            for (let [field, message] of Object.entries(errors)) {
                document.getElementById(`${field}Error`).textContent = message;
                document.getElementById(field).parentElement.classList.add('invalid');
            }
            return;
        }

        storage.pixDetails[amount] = { key, qrCode };
        storage.savePixDetails();
        document.getElementById('pixModal').style.display = 'none';
        this.addLog(`Adicionada/Atualizada configuração PIX para R$ ${amount}`);
    },

    filterPurchases() {
        const userFilter = document.getElementById('purchaseFilterUser')?.value;
        const dateFilter = document.getElementById('purchaseFilterDate')?.value;
        const valueFilter = document.getElementById('purchaseFilterValue')?.value;
        const purchaseList = document.getElementById('purchaseList');

        if (purchaseList) {
            const allPurchases = storage.users.flatMap(user => user.purchases.map(p => ({ ...p, username: user.username })));
            const filteredPurchases = allPurchases.filter(p => 
                (!userFilter || p.username === userFilter) &&
                (!dateFilter || new Date(p.date).toISOString().split('T')[0] === dateFilter) &&
                (!valueFilter || Math.abs(p.price - valueFilter) < 0.01)
            );
            purchaseList.innerHTML = filteredPurchases.map(p => {
                const card = storage.cards.find(c => c.number === p.cardNumber) || {};
                return `
                    <div class="card-item">
                        <h2>${p.username}</h2>
                        <p><strong>Cartão:</strong> ${p.cardNumber.slice(0, 6)} **** **** ****</p>
                        <p><strong>Validade:</strong> ${p.expiry}</p>
                        <p><strong>Bandeira:</strong> ${card.brand || 'Desconhecido'}</p>
                        <p><strong>Preço:</strong> R$ ${p.price.toFixed(2)}</p>
                        <p><strong>Data:</strong> ${new Date(p.date).toLocaleDateString()}</p>
                    </div>
                `;
            }).join('');
        }
    }
};

// === Funções Globais ===
function buyCard(cardNumber) {
    const card = storage.cards.find(c => c.number === cardNumber);
    const user = storage.users.find(u => u.username === state.currentUser);
    if (!card || !user) return;

    const confirmTotalAmount = document.getElementById('confirmTotalAmount');
    const confirmUserBalance = document.getElementById('confirmUserBalance');
    const confirmCardDetails = document.getElementById('confirmCardDetails');
    const confirmPurchaseModal = document.getElementById('confirmPurchaseModal');

    if (confirmTotalAmount && confirmUserBalance && confirmCardDetails && confirmPurchaseModal) {
        confirmTotalAmount.textContent = card.price.toFixed(2);
        confirmUserBalance.textContent = user.balance.toFixed(2);
        confirmCardDetails.innerHTML = `
            <div class="card-item">
                <h2>${card.number.slice(0, 6)} **** **** ****</h2>
                <p><strong>Validade:</strong> ${card.expiry}</p>
                <p><strong>Bandeira:</strong> ${card.brand}</p>
                <p><strong>Banco:</strong> ${card.bank}</p>
                <p><strong>País:</strong> ${card.country}</p>
                <p><strong>Tipo:</strong> ${card.type}</p>
            </div>
        `;
        confirmPurchaseModal.style.display = 'flex';
    }
}

function closeConfirmPurchaseModal() {
    document.getElementById('confirmPurchaseModal').style.display = 'none';
}

function confirmPurchase() {
    const cardNumber = document.querySelector('#confirmCardDetails .card-item h2')?.textContent.replace(/\s\*\*\*\*/g, '');
    const card = storage.cards.find(c => c.number === cardNumber);
    const user = storage.users.find(u => u.username === state.currentUser);

    if (card && user && user.balance >= card.price && card.stock > 0) {
        user.balance -= card.price;
        card.stock--;
        user.purchases.push({
            cardNumber: card.number,
            expiry: card.expiry,
            brand: card.brand,
            bank: card.bank,
            country: card.country,
            type: card.type,
            price: card.price,
            date: new Date().toISOString()
        });
        storage.saveUsers();
        storage.saveCards();
        const userBalance = document.getElementById('userBalance');
        if (userBalance) userBalance.textContent = user.balance.toFixed(2);
        closeConfirmPurchaseModal();
        ui.showAccountInfo();
        ui.addLog(`Compra realizada por ${state.currentUser} - Cartão ${cardNumber}`);
        alert('Compra realizada com sucesso!');
    } else if (user.balance < card.price) {
        alert('Saldo insuficiente!');
    } else if (card.stock <= 0) {
        alert('Estoque esgotado!');
    }
}

function closeCardModal() {
    document.getElementById('cardModal').style.display = 'none';
    ui.clearCardFormErrors();
}

function closeBulkEditModal() {
    document.getElementById('bulkEditModal').style.display = 'none';
}

function closePixModal() {
    document.getElementById('pixModal').style.display = 'none';
}

function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabName).style.display = 'block';
    document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`).classList.add('active');

    if (tabName === 'stats') ui.updateStats();
    else if (tabName === 'users') ui.displayUsers();
    else if (tabName === 'cards') ui.displayAdminCards();
    else if (tabName === 'purchases') ui.filterPurchases();
    else if (tabName === 'pix') ui.displayPixConfigs();
    else if (tabName === 'logs') ui.displayLogs();
}

// === Inicialização ===
document.addEventListener('DOMContentLoaded', () => {
    auth.initializeData();
    if (localStorage.getItem('loggedIn')) {
        state.currentUser = localStorage.getItem('currentUser');
        ui.updateNavbarVisibility();
        if (window.location.pathname.includes('index.html')) ui.showAccountInfo();
        else if (window.location.pathname.includes('shop.html')) {
            ui.filterCards();
            const userBalance = document.getElementById('userBalance');
            if (userBalance) {
                const user = storage.users.find(u => u.username === state.currentUser);
                userBalance.textContent = user ? user.balance.toFixed(2) : '0.00';
            }
        } else if (window.location.pathname.includes('dashboard.html')) {
            const user = storage.users.find(u => u.username === state.currentUser);
            if (user && user.isAdmin) {
                openTab('stats');
                ui.updateStats();
                ui.displayUsers();
                ui.displayAdminCards();
                ui.filterPurchases();
                ui.displayLogs();
                const searchInput = document.getElementById('globalSearch');
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        const searchTerm = e.target.value;
                        ui.displayUsers(searchTerm);
                        ui.displayAdminCards(searchTerm);
                    });
                }
            } else {
                alert('Acesso negado. Você não é administrador.');
                window.location.href = 'shop.html';
            }
        }
        auth.checkAdminMode();
    }

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});
