// === Configurações ===
const CONFIG = {
    SESSION_TIMEOUT_MINUTES: 30,
    ADMIN_CLICKS: 5,
    ADMIN_PASSWORD: 'LOVEz',
    MIN_PASSWORD_LENGTH: 6,
    MAX_LOGIN_ATTEMPTS: 3,
    LOGIN_BLOCK_TIME: 60000,
    LOW_STOCK_THRESHOLD: 3,
    NOTIFICATION_TIMEOUT: 5000,
    LOG_RETENTION_DAYS: 30,
    FREE_CARD_THRESHOLD: 50,
    ACHIEVEMENTS: {
        'FIRST_DEPOSIT': { name: 'Primeiro Depósito', threshold: 1 },
        'DEPOSIT_100': { name: 'Depósito de R$ 100', threshold: 100 }
    }
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
    logs: JSON.parse(localStorage.getItem('logs')) || [],
    cachedCards: null,
    achievements: JSON.parse(localStorage.getItem('achievements')) || {}
};

// === Gerenciamento de Armazenamento ===
const storage = {
    users: JSON.parse(localStorage.getItem('users')) || [],
    cards: JSON.parse(localStorage.getItem('cards')) || [
        { id: '1', number: '1234567890123456', cvv: '123', expiry: '12/25', brand: 'Visa', bank: 'Banco do Brasil S.A.', country: 'Brasil', price: 10.00, stock: 10, type: 'Crédito', name: 'João Silva', cpf: '123.456.789-00', level: 'Padrão' },
        { id: '2', number: '9876543210987654', cvv: '456', expiry: '11/26', brand: 'Mastercard', bank: 'Banco Inter', country: 'Brasil', price: 15.00, stock: 5, type: 'Débito', name: 'Maria Oliveira', cpf: '987.654.321-00', level: 'Gold' }
    ],
    pixDetails: JSON.parse(localStorage.getItem('pixDetails')) || {
        40: { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" },
        70: { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" },
        150: { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" },
        300: { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" }
    },
    saveUsers() { localStorage.setItem('users', JSON.stringify(this.users)); },
    saveCards() { 
        localStorage.setItem('cards', JSON.stringify(this.cards)); 
        state.cachedCards = null; // Invalida o cache quando os cartões são atualizados
    },
    savePixDetails() { localStorage.setItem('pixDetails', JSON.stringify(this.pixDetails)); },
    saveLogs() { localStorage.setItem('logs', JSON.stringify(state.logs)); },
    saveAchievements() { localStorage.setItem('achievements', JSON.stringify(state.achievements)); }
};

// === Funções de Sanitização ===
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// === Funções de Formatação Automática ===
function formatCardNumber(input) { 
    let value = input.value.replace(/\D/g, ''); 
    if (value.length > 16) value = value.substring(0, 16); 
    value = value.replace(/(\d{4})(?=\d)/g, '$1 '); 
    input.value = value; 
}
function restrictCvv(input) { 
    let value = input.value.replace(/\D/g, ''); 
    if (value.length > 3) value = value.substring(0, 3); 
    input.value = value; 
}
function formatExpiry(input) { 
    let value = input.value.replace(/\D/g, ''); 
    if (value.length > 4) value = value.substring(0, 4); 
    if (value.length > 2) value = value.substring(0, 2) + '/' + value.substring(2); 
    input.value = value; 
}
function formatCpf(input) { 
    let value = input.value.replace(/\D/g, ''); 
    if (value.length > 11) value = value.substring(0, 11); 
    value = value.replace(/(\d{3})(\d)/, '$1.$2'); 
    value = value.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3'); 
    value = value.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4'); 
    input.value = value; 
}

// === Autenticação ===
const auth = {
    generateUniqueId() { 
        let id; 
        do { id = Math.floor(100000 + Math.random() * 900000).toString(); } 
        while (storage.users.some(u => u.id === id)); 
        return id; 
    },
    async hashPassword(password) { 
        if (window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hash = await window.crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        function md5(str) { return str; }
        return md5(password);
    },
    validateLogin(username, password) {
        username = sanitizeInput(username);
        if (!username || !password) {
            document.getElementById('usernameError').textContent = !username ? 'Usuário é obrigatório.' : '';
            document.getElementById('passwordError').textContent = !password ? 'Senha é obrigatória.' : '';
            return false;
        }
        const user = storage.users.find(u => u.username === username);
        if (!user) {
            document.getElementById('usernameError').textContent = 'Usuário não encontrado.';
            return false;
        }
        return user;
    },
    validateRegister(username, password) {
        username = sanitizeInput(username);
        if (!username || !password) {
            document.getElementById('newUsernameError').textContent = !username ? 'Usuário é obrigatório.' : '';
            document.getElementById('newPasswordError').textContent = !password ? 'Senha é obrigatória.' : '';
            return false;
        }
        if (username.length < 3) {
            document.getElementById('newUsernameError').textContent = 'Usuário deve ter pelo menos 3 caracteres.';
            return false;
        }
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            document.getElementById('newPasswordError').textContent = `Senha deve ter pelo menos ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
            return false;
        }
        if (storage.users.some(u => u.username === username)) {
            document.getElementById('newUsernameError').textContent = 'Usuário já existe.';
            return false;
        }
        return true;
    },
    async initializeData() {
        if (!storage.users.some(u => u.username === 'LVz')) {
            const defaultPassword = '123456';
            const passwordHash = await this.hashPassword(defaultPassword);
            storage.users.push({ id: this.generateUniqueId(), username: 'LVz', password: passwordHash, balance: 0, purchases: [], isAdmin: false });
            storage.saveUsers();
        }
        if (storage.cards.length === 0) {
            storage.cards = [
                { id: '1', number: '1234567890123456', cvv: '123', expiry: '12/25', brand: 'Visa', bank: 'Banco do Brasil S.A.', country: 'Brasil', price: 10.00, stock: 10, type: 'Crédito', name: 'João Silva', cpf: '123.456.789-00', level: 'Padrão' },
                { id: '2', number: '9876543210987654', cvv: '456', expiry: '11/26', brand: 'Mastercard', bank: 'Banco Inter', country: 'Brasil', price: 15.00, stock: 5, type: 'Débito', name: 'Maria Oliveira', cpf: '987.654.321-00', level: 'Gold' }
            ];
            storage.saveCards();
        }
        ui.updateNavbarVisibility();
        ui.showAccountInfo();
    },
    async login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const loginLoader = document.getElementById('loginLoader');
        const loginAttemptsDisplay = document.getElementById('loginAttempts');

        if (state.loginBlockedUntil > Date.now()) {
            const remainingTime = Math.ceil((state.loginBlockedUntil - Date.now()) / 1000);
            loginAttemptsDisplay.textContent = `Muitas tentativas. Tente novamente em ${remainingTime} segundos.`;
            return;
        }

        const user = this.validateLogin(username, password);
        if (!user) {
            state.loginAttempts++;
            if (state.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                state.loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
                state.loginAttempts = 0;
                loginAttemptsDisplay.textContent = `Muitas tentativas. Tente novamente em ${CONFIG.LOGIN_BLOCK_TIME / 1000} segundos.`;
            } else {
                loginAttemptsDisplay.textContent = `Tentativas restantes: ${CONFIG.MAX_LOGIN_ATTEMPTS - state.loginAttempts}`;
            }
            return;
        }

        loginLoader.style.display = 'block';
        const hashedPassword = await this.hashPassword(password);
        if (hashedPassword === user.password) {
            state.currentUser = username;
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('currentUser', username);
            state.loginAttempts = 0;
            loginAttemptsDisplay.textContent = '';
            ui.showAccountInfo();
            ui.addLog(`Login bem-sucedido para ${username}`);
            ui.showNotification('Login bem-sucedido!');
        } else {
            document.getElementById('passwordError').textContent = 'Senha incorreta.';
            state.loginAttempts++;
            if (state.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                state.loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
                state.loginAttempts = 0;
                loginAttemptsDisplay.textContent = `Muitas tentativas. Tente novamente em ${CONFIG.LOGIN_BLOCK_TIME / 1000} segundos.`;
            } else {
                loginAttemptsDisplay.textContent = `Tentativas restantes: ${CONFIG.MAX_LOGIN_ATTEMPTS - state.loginAttempts}`;
            }
        }
        loginLoader.style.display = 'none';
    },
    async register() {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value.trim();

        if (!this.validateRegister(username, password)) return;

        const hashedPassword = await this.hashPassword(password);
        const newUser = {
            id: this.generateUniqueId(),
            username: username,
            password: hashedPassword,
            balance: 0,
            purchases: [],
            isAdmin: false
        };
        storage.users.push(newUser);
        storage.saveUsers();
        state.currentUser = username;
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('currentUser', username);
        ui.showAccountInfo();
        ui.addLog(`Novo usuário registrado: ${username}`);
        ui.showNotification('Registro bem-sucedido! Bem-vindo ao CardShop!');
    },
    forgotPassword() { alert('Funcionalidade de recuperação de senha não implementada. Contate o suporte.'); },
    logout() { 
        localStorage.removeItem('loggedIn'); 
        localStorage.removeItem('currentUser'); 
        state.currentUser = null; 
        ui.addLog('Logout realizado');
        window.location.href = 'index.html'; 
    },
    checkAdminMode() { 
        const cartIcon = document.getElementById('cartIcon'); 
        if (cartIcon) cartIcon.addEventListener('click', () => { 
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
};

// === Interface do Usuário ===
const ui = {
    toggleTheme() { 
        document.body.classList.toggle('dark'); 
        const themeToggle = document.getElementById('themeToggle'); 
        if (themeToggle) themeToggle.textContent = document.body.classList.contains('dark') ? 'Modo Claro' : 'Modo Escuro'; 
        localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    },
    updateNavbarVisibility() { 
        const navbar = document.getElementById('navbar'); 
        if (navbar && localStorage.getItem('loggedIn')) navbar.style.display = 'flex'; 
        else if (navbar) navbar.style.display = 'none'; 
    },
    showRegisterForm() { 
        document.getElementById('loginForm').style.display = 'none'; 
        document.getElementById('registerForm').style.display = 'block'; 
        document.getElementById('accountInfo').style.display = 'none'; 
        document.getElementById('usernameError').textContent = '';
        document.getElementById('passwordError').textContent = '';
    },
    showLoginForm() { 
        document.getElementById('loginForm').style.display = 'block'; 
        document.getElementById('registerForm').style.display = 'none'; 
        document.getElementById('accountInfo').style.display = 'none'; 
        document.getElementById('newUsernameError').textContent = '';
        document.getElementById('newPasswordError').textContent = '';
    },
    showAccountInfo() {
        const user = storage.users.find(u => u.username === state.currentUser);
        if (!user) return;

        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('accountInfo').style.display = 'block';

        document.getElementById('userName').textContent = user.username;
        document.getElementById('userId').textContent = user.id;
        document.getElementById('userBalanceAccount').textContent = user.balance.toFixed(2);

        const purchaseHistory = document.getElementById('purchaseHistory');
        if (purchaseHistory) {
            purchaseHistory.innerHTML = user.purchases.length > 0 
                ? user.purchases.map(p => `
                    <div class="purchase-item">
                        <p><strong>Cartão:</strong> ${p.cardNumber.slice(0, 6)} **** **** ****</p>
                        <p><strong>Bandeira:</strong> ${p.brand}</p>
                        <p><strong>Preço:</strong> R$ ${p.price.toFixed(2)}</p>
                        <p><strong>Data:</strong> ${new Date(p.date).toLocaleString()}</p>
                    </div>
                `).join('')
                : '<p>Sem compras realizadas.</p>';
        }

        this.updateAchievements();
        this.updateProgressBar();
        ui.updateNavbarVisibility();
    },
    updateAchievements() {
        const user = storage.users.find(u => u.username === state.currentUser);
        const achievementsList = document.getElementById('achievementsList');
        if (user && achievementsList) {
            achievementsList.innerHTML = Object.entries(CONFIG.ACHIEVEMENTS)
                .map(([key, { name, threshold }]) => {
                    const achieved = state.achievements[user.username]?.[key] || false;
                    return `<div class="achievement ${achieved ? 'achieved' : ''}">${name} ${achieved ? '✓' : ''}</div>`;
                }).join('');
        }
    },
    showAddBalanceForm() { 
        const rechargeModal = document.getElementById('rechargeModal'); 
        if (rechargeModal) rechargeModal.style.display = 'flex'; 
    },
    closeModal() { 
        const rechargeModal = document.getElementById('rechargeModal'); 
        if (rechargeModal) rechargeModal.style.display = 'none'; 
    },
    selectRecharge(amount) {
        state.selectedRechargeAmount = amount;
        let bonusRate = 0.5;
        if (amount >= 150 && amount < 300) bonusRate = 0.6;
        else if (amount >= 300) bonusRate = 0.7;
        const bonus = amount * bonusRate;
        const totalCredit = amount + bonus;
        this.closeModal();
        const pixPayment = document.getElementById('pixPayment');
        if (pixPayment) {
            pixPayment.style.display = 'block';
            document.getElementById('pixLoading').style.display = 'block';
            document.getElementById('pixKey').textContent = 'Carregando...';
            document.getElementById('pixQRCode').src = 'https://via.placeholder.com/150';
            setTimeout(() => {
                document.getElementById('pixLoading').style.display = 'none';
                this.updatePixDetailsDisplay();
                pixPayment.innerHTML += `<p>Você receberá R$ ${totalCredit.toFixed(2)} (R$ ${amount.toFixed(2)} + bônus de R$ ${bonus.toFixed(2)}).</p>`;
                this.addBalance(amount, bonus);
            }, 1000);
        }
    },
    selectCustomRecharge() {
        const amount = parseFloat(document.getElementById('customDeposit').value) || 0;
        if (amount < 10) { alert('Valor mínimo de R$ 10.'); return; }
        let bonusRate = 0.5;
        if (amount >= 150 && amount < 300) bonusRate = 0.6;
        else if (amount >= 300) bonusRate = 0.7;
        const bonus = amount * bonusRate;
        document.getElementById('customBonusText').textContent = `Bônus: R$ ${bonus.toFixed(2)} (${(bonusRate * 100)}%)`;
        this.selectRecharge(amount);
    },
    copyPixKey() { 
        const pixKey = document.getElementById('pixKey')?.textContent; 
        if (pixKey && pixKey !== 'Carregando...') { 
            navigator.clipboard.writeText(pixKey).then(() => alert('Chave Pix copiada para a área de transferência!')); 
        } else alert('Chave Pix não disponível.'); 
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
    addBalance(amount, bonus) {
        const user = storage.users.find(u => u.username === state.currentUser);
        if (user) {
            const totalCredit = amount + bonus;
            user.balance += totalCredit;
            storage.saveUsers();
            const userBalance = document.getElementById('userBalance');
            const userBalanceAccount = document.getElementById('userBalanceAccount');
            if (userBalance) userBalance.textContent = user.balance.toFixed(2);
            if (userBalanceAccount) userBalanceAccount.textContent = user.balance.toFixed(2);
            const pixPayment = document.getElementById('pixPayment');
            if (pixPayment) pixPayment.style.display = 'none';
            alert(`Saldo adicionado com sucesso! Você recarregou R$ ${amount.toFixed(2)} e recebeu R$ ${totalCredit.toFixed(2)} (incluindo bônus de R$ ${bonus.toFixed(2)}).`);
            this.showNotification('Saldo atualizado!');
            this.checkAchievements(amount);
            this.updateProgressBar();
            this.showAccountInfo();
        }
    },
    checkAchievements(amount) {
        const user = storage.users.find(u => u.username === state.currentUser);
        if (user) {
            let userAchievements = state.achievements[user.username] || {};
            if (!userAchievements['FIRST_DEPOSIT'] && user.purchases.length === 0) {
                userAchievements['FIRST_DEPOSIT'] = true;
                this.showNotification(`Conquista desbloqueada: Primeiro Depósito!`);
            }
            if (!userAchievements['DEPOSIT_100'] && amount >= 100) {
                userAchievements['DEPOSIT_100'] = true;
                this.showNotification(`Conquista desbloqueada: Depósito de R$ 100!`);
            }
            state.achievements[user.username] = userAchievements;
            storage.saveAchievements();
            this.updateAchievements();
        }
    },
    updateProgressBar() {
        const user = storage.users.find(u => u.username === state.currentUser);
        if (user) {
            const currentBalance = user.balance;
            const target = CONFIG.FREE_CARD_THRESHOLD;
            const progress = Math.min(currentBalance / target * 100, 100);
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            if (progressFill && progressText) {
                progressFill.style.width = `${progress}%`;
                progressFill.style.backgroundColor = progress === 100 ? '#28a745' : '#007bff';
                progressText.textContent = progress === 100 ? 'Parabéns! Você ganhou um cartão grátis!' : `Faltam R$ ${(target - currentBalance).toFixed(2)} para um cartão grátis!`;
                if (progress === 100) {
                    user.balance -= target;
                    storage.saveUsers();
                    if (document.getElementById('userBalance')) document.getElementById('userBalance').textContent = user.balance.toFixed(2);
                    if (document.getElementById('userBalanceAccount')) document.getElementById('userBalanceAccount').textContent = user.balance.toFixed(2);
                    this.showNotification('Cartão grátis creditado!');
                    this.updateProgressBar();
                }
            }
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
            if (Notification.permission === 'granted') {
                new Notification('CardShop', { body: message });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
            const user = storage.users.find(u => u.username === state.currentUser);
            if (user && user.balance < 10) this.showNotification('Seu saldo está baixo! Adicione R$ 40 e ganhe bônus.');
        }
    },
    filterCards() {
        const binFilter = sanitizeInput(document.getElementById('binFilter')?.value || '');
        const brandFilter = document.getElementById('brandFilter')?.value;
        const bankFilter = document.getElementById('bankFilter')?.value;
        const cardList = document.getElementById('cardList');
        
        if (!cardList) return;

        // Usar cache se disponível
        if (!state.cachedCards) {
            state.cachedCards = storage.cards.map(card => ({
                ...card,
                formattedNumber: card.number.replace(/(\d{4})(?=\d)/g, '$1 ')
            }));
        }

        const filteredCards = state.cachedCards.filter(card => {
            const binMatch = !binFilter || card.number.startsWith(binFilter);
            const brandMatch = brandFilter === 'all' || card.brand === brandFilter;
            const bankMatch = bankFilter === 'all' || card.bank === bankFilter;
            return binMatch && brandMatch && bankMatch;
        });

        cardList.innerHTML = filteredCards.length > 0
            ? filteredCards.map(card => `
                <div class="card-item" data-card-number="${card.number}">
                    <h2>${card.formattedNumber.slice(0, 19)}</h2>
                    <p>Validade: ${card.expiry}</p>
                    <p>${card.brand} - ${card.bank} (${card.level})</p>
                    <p>${card.country}</p>
                    <div class="price">R$ ${card.price.toFixed(2)}</div>
                    <div class="buttons">
                        <button onclick="buyCard('${card.number}')">Comprar</button>
                    </div>
                </div>
            `).join('')
            : '<p>Nenhum cartão encontrado.</p>';
    },
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
    },
    addLog(action, details = {}) {
        const ip = '127.0.0.1'; // Placeholder
        const log = {
            timestamp: new Date().toISOString(),
            action: action,
            user: state.currentUser || 'Anônimo',
            ip: ip,
            details: details,
            type: action.includes('Exclu') ? 'delete' : action.includes('Edit') ? 'edit' : action.includes('Adicion') ? 'create' : 'other'
        };
        state.logs.push(log);
        const cutoffDate = new Date(Date.now() - CONFIG.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
        state.logs = state.logs.filter(log => log.timestamp > cutoffDate);
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
                    <p><strong>IP:</strong> ${log.ip}</p>
                    <p><strong>Ação:</strong> ${log.action}</p>
                    <p><strong>Tipo:</strong> ${log.type}</p>
                    <p><strong>Detalhes:</strong> ${JSON.stringify(log.details)}</p>
                </div>
            `).join('');
        }
    }
};

// === Funções Globais ===
function buyCard(cardNumber) {
    const card = storage.cards.find(c => c.number === cardNumber);
    const user = storage.users.find(u => u.username === state.currentUser);
    if (!card || !user) return;

    // Validação inicial
    if (card.stock <= 0) {
        alert('Cartão fora de estoque.');
        return;
    }
    if (user.balance < card.price) {
        alert('Saldo insuficiente. Adicione mais saldo para continuar.');
        return;
    }

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
                <p><strong>Nível:</strong> ${card.level}</p>
            </div>
        `;
        confirmPurchaseModal.style.display = 'flex';
    }
}

function closeConfirmPurchaseModal() { 
    document.getElementById('confirmPurchaseModal').style.display = 'none'; 
}

function confirmPurchase() {
    const cardNumber = document.querySelector('#confirmCardDetails .card-item h2')?.textContent.replace(/\s/g, '');
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
            date: new Date().toISOString(), 
            name: card.name, 
            cpf: card.cpf, 
            level: card.level 
        });
        storage.saveUsers();
        storage.saveCards();
        document.getElementById('userBalance').textContent = user.balance.toFixed(2);
        if (document.getElementById('userBalanceAccount')) document.getElementById('userBalanceAccount').textContent = user.balance.toFixed(2);
        closeConfirmPurchaseModal();
        alert('Compra realizada com sucesso!');
        ui.filterCards();
        ui.addLog(`Compra realizada por ${user.username} do cartão ${card.number}`, { price: card.price, stock: card.stock });
        ui.showNotification('Compra confirmada!');
        ui.showAccountInfo();
    } else {
        alert('Saldo insuficiente ou cartão fora de estoque.');
    }
}

// === Inicialização ===
document.addEventListener('DOMContentLoaded', () => {
    state.currentUser = localStorage.getItem('currentUser');
    const isLoggedIn = localStorage.getItem('loggedIn');

    if (document.getElementById('themeToggle')) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
            document.getElementById('themeToggle').textContent = 'Modo Claro';
        }
    }

    if (isLoggedIn && state.currentUser) {
        ui.showAccountInfo();
    } else {
        ui.showLoginForm();
    }

    auth.initializeData();
    auth.checkAdminMode();

    const user = storage.users.find(u => u.username === state.currentUser);
    if (user && document.getElementById('userBalance')) {
        document.getElementById('userBalance').textContent = user.balance.toFixed(2);
    }
    if (document.getElementById('cardList')) ui.filterCards();
    if (document.getElementById('totalUsers')) ui.updateStats();
});
