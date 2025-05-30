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
    viewMode: 'grid',
    achievements: JSON.parse(localStorage.getItem('achievements')) || {}
};

// === Gerenciamento de Armazenamento ===
const storage = {
    users: JSON.parse(localStorage.getItem('users')) || [],
    cards: JSON.parse(localStorage.getItem('cards')) || [/* Cartões iniciais */],
    pixDetails: JSON.parse(localStorage.getItem('pixDetails')) || [/* Detalhes PIX */],
    saveUsers() { localStorage.setItem('users', JSON.stringify(this.users)); },
    saveCards() { localStorage.setItem('cards', JSON.stringify(this.cards)); },
    savePixDetails() { localStorage.setItem('pixDetails', JSON.stringify(this.pixDetails)); },
    saveLogs() { localStorage.setItem('logs', JSON.stringify(state.logs)); },
    saveAchievements() { localStorage.setItem('achievements', JSON.stringify(state.achievements)); }
};

// === Funções de Formatação Automática ===
function formatCardNumber(input) { /* Existente */ }
function restrictCvv(input) { /* Existente */ }
function formatExpiry(input) { /* Existente */ }
function formatCpf(input) { /* Existente */ }

// === Autenticação ===
const auth = {
    generateUniqueId() { /* Existente */ },
    async hashPassword(password) { /* Existente */ },
    validateLogin() { /* Existente */ },
    validateRegister() { /* Existente */ },
    async initializeData() { /* Existente */ },
    async login() { /* Existente */ },
    async register() { /* Existente */ },
    forgotPassword() { /* Existente */ },
    logout() { /* Existente */ },
    checkAdminMode() { /* Existente */ }
};

// === Interface do Usuário ===
const ui = {
    toggleTheme() { /* Existente */ },
    updateNavbarVisibility() { /* Existente */ },
    showRegisterForm() { /* Existente */ },
    showLoginForm() { /* Existente */ },
    showAccountInfo() {
        const accountInfo = document.getElementById('accountInfo');
        if (accountInfo) {
            const user = storage.users.find(u => u.username === state.currentUser);
            if (user) {
                accountInfo.innerHTML = `
                    <h2>Minha Conta</h2>
                    <p>Usuário: ${user.username}</p>
                    <p>Saldo: R$ ${user.balance.toFixed(2)}</p>
                    <h3>Conquistas</h3>
                    <div id="achievementsList" class="achievements"></div>
                `;
                this.updateAchievements();
            }
        }
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
    showAddBalanceForm() { const rechargeModal = document.getElementById('rechargeModal'); if (rechargeModal) rechargeModal.style.display = 'flex'; },
    closeModal() { const rechargeModal = document.getElementById('rechargeModal'); if (rechargeModal) rechargeModal.style.display = 'none'; },
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
            }, 2000);
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
    addBalance(amount, bonus) {
        const user = storage.users.find(u => u.username === state.currentUser);
        if (user) {
            const totalCredit = amount + bonus;
            user.balance += totalCredit;
            storage.saveUsers();
            const userBalance = document.getElementById('userBalance');
            if (userBalance) userBalance.textContent = user.balance.toFixed(2);
            const pixPayment = document.getElementById('pixPayment');
            if (pixPayment) pixPayment.style.display = 'none';
            alert(`Saldo adicionado com sucesso! Você recarregou R$ ${amount.toFixed(2)} e recebeu R$ ${totalCredit.toFixed(2)} (incluindo bônus de R$ ${bonus.toFixed(2)}).`);
            this.showNotification('Saldo atualizado!');
            this.checkAchievements(amount);
            this.updateProgressBar();
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
                    document.getElementById('userBalance').textContent = user.balance.toFixed(2);
                    this.showNotification('Cartão grátis creditado!');
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
            if (user.balance < 10) this.showNotification('Seu saldo está baixo! Adicione R$ 40 e ganhe bônus.');
        }
    },
    // ... (outras funções existentes como filterCards, toggleViewMode, etc.) ...
};

// ... (funções globais e inicialização existentes) ...
