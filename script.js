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
    LOG_RETENTION_DAYS: 30
};

// === Estado Global ===
const state = {
    selectedBrand: 'Nenhuma',
    clickCount: 0,
    currentUser: localStorage.getItem('currentUser') || null,
    loginAttempts: 0,
    loginBlockedUntil: 0,
    selectedRechargeAmount: null,
    editingCardId: null,
    editingPixAmount: null,
    logs: JSON.parse(localStorage.getItem('logs')) || [],
    viewMode: 'grid',
    sessionStart: localStorage.getItem('sessionStart') || Date.now()
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
    saveCards() { localStorage.setItem('cards', JSON.stringify(this.cards)); },
    savePixDetails() { localStorage.setItem('pixDetails', JSON.stringify(this.pixDetails)); },
    saveLogs() { localStorage.setItem('logs', JSON.stringify(state.logs)); }
};

// === Funções de Formatação Automática ===
function formatCardNumber(input) { let value = input.value.replace(/\D/g, ''); if (value.length > 16) value = value.substring(0, 16); value = value.replace(/(\d{4})(?=\d)/g, '$1 '); input.value = value; }
function restrictCvv(input) { let value = input.value.replace(/\D/g, ''); if (value.length > 3) value = value.substring(0, 3); input.value = value; }
function formatExpiry(input) { let value = input.value.replace(/\D/g, ''); if (value.length > 4) value = value.substring(0, 4); if (value.length > 2) value = value.substring(0, 2) + '/' + value.substring(2); input.value = value; }
function formatCpf(input) { let value = input.value.replace(/\D/g, ''); if (value.length > 11) value = value.substring(0, 11); value = value.replace(/(\d{3})(\d)/, '$1.$2'); value = value.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3'); value = value.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4'); input.value = value; }

// === Função de Verificação de Login ===
function checkLogin() {
    const currentUser = localStorage.getItem('currentUser');
    const isLoggedIn = localStorage.getItem('loggedIn');
    const sessionStart = parseInt(localStorage.getItem('sessionStart') || '0');
    const sessionTimeout = CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;

    if (!currentUser || !isLoggedIn) {
        if (window.location.pathname !== '/index.html') {
            window.location.href = 'index.html';
        }
        return false;
    }

    if (Date.now() - sessionStart > sessionTimeout) {
        auth.logout();
        alert('Sua sessão expirou. Faça login novamente.');
        return false;
    }

    return true;
}

// === Autenticação ===
const auth = {
    generateUniqueId() { let id; do { id = Math.floor(100000 + Math.random() * 900000).toString(); } while (storage.users.some(u => u.id === id)); return id; },
    async hashPassword(password) {
        if (window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hash = await window.crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        function md5(str) { /* MD5 implementation */ }
        return md5(password);
    },
    validateLogin() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const usernameError = document.getElementById('usernameError');
        const passwordError = document.getElementById('passwordError');

        if (!usernameInput || !passwordInput) return false;

        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username) {
            if (usernameError) usernameError.textContent = 'Por favor, preencha o usuário.';
            return false;
        }
        if (!password) {
            if (passwordError) passwordError.textContent = 'Por favor, preencha a senha.';
            return false;
        }
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            if (passwordError) passwordError.textContent = `A senha deve ter pelo menos ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
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
            storage.cards = [];
            storage.saveCards();
        }
        ui.updateNavbarVisibility();
    },
    async login() {
        if (!this.validateLogin()) return;

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const passwordHash = await this.hashPassword(password);
        const user = storage.users.find(u => u.username === username && u.password === passwordHash);

        if (user) {
            state.currentUser = username;
            localStorage.setItem('currentUser', username);
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('sessionStart', Date.now().toString());
            const loginForm = document.getElementById('loginForm');
            const accountInfo = document.getElementById('accountInfo');
            if (loginForm) loginForm.style.display = 'none';
            if (accountInfo) accountInfo.style.display = 'block';
            ui.updateNavbarVisibility();
            ui.showNotification('Login realizado com sucesso!');
        } else {
            const passwordError = document.getElementById('passwordError');
            if (passwordError) passwordError.textContent = 'Usuário ou senha inválidos.';
        }
    },
    forgotPassword() { alert('Funcionalidade de recuperação de senha não implementada. Contate o suporte.'); },
    logout() {
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionStart');
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
        document.body.classList.toggle('dark');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.textContent = document.body.classList.contains('dark') ? 'Modo Claro' : 'Modo Escuro';
    },
    updateNavbarVisibility() {
        const navbar = document.getElementById('navbar');
        if (navbar && localStorage.getItem('loggedIn')) navbar.style.display = 'flex';
        else if (navbar) navbar.style.display = 'none';
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
            }, 5000);
        }
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
            this.showNotification('Saldo atualizado!');
        }
    },
    showNotification(message) {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notifications.appendChild(notification);
        setTimeout(() => notification.remove(), CONFIG.NOTIFICATION_TIMEOUT);
    },
    filterCards() {
        const cardList = document.getElementById('cardList');
        if (!cardList) return;

        const binFilter = document.getElementById('binFilter')?.value || '';
        const brandFilter = document.getElementById('brandFilter')?.value || 'all';
        const bankFilter = document.getElementById('bankFilter')?.value || 'all';
        const levelFilter = document.getElementById('levelFilter')?.value || 'all';
        const typeFilter = document.getElementById('typeFilter')?.value || 'all';
        const priceRangeFilter = document.getElementById('priceRangeFilter')?.value || 'all';
        const stockFilter = document.getElementById('stockFilter')?.value || 'all';

        const filteredCards = storage.cards.filter(card => {
            const matchesBin = binFilter ? card.number.startsWith(binFilter) : true;
            const matchesBrand = brandFilter === 'all' || card.brand === brandFilter;
            const matchesBank = bankFilter === 'all' || card.bank === bankFilter;
            const matchesLevel = levelFilter === 'all' || card.level === levelFilter;
            const matchesType = typeFilter === 'all' || card.type === typeFilter;
            const matchesPrice = priceRangeFilter === 'all' ||
                (priceRangeFilter === '0-10' && card.price >= 0 && card.price <= 10) ||
                (priceRangeFilter === '10-20' && card.price > 10 && card.price <= 20) ||
                (priceRangeFilter === '20+' && card.price > 20);
            const matchesStock = stockFilter === 'all' ||
                (stockFilter === 'inStock' && card.stock > 0) ||
                (stockFilter === 'outOfStock' && card.stock === 0);

            return matchesBin && matchesBrand && matchesBank && matchesLevel && matchesType && matchesPrice && matchesStock;
        });

        cardList.innerHTML = filteredCards.map(card => `
            <div class="card-item">
                <h2>${card.number.slice(0, 6)} **** **** ****</h2>
                <p><strong>Validade:</strong> ${card.expiry}</p>
                <p><strong>Bandeira:</strong> ${card.brand}</p>
                <p><strong>Banco:</strong> ${card.bank}</p>
                <p><strong>Nível:</strong> ${card.level}</p>
                <p><strong>Preço:</strong> R$ ${card.price.toFixed(2)}</p>
                <p><strong>Estoque:</strong> ${card.stock}</p>
                <button class="btn btn-primary" onclick="buyCard('${card.number}')" ${card.stock === 0 ? 'disabled' : ''}>Comprar</button>
                <button class="btn btn-secondary" onclick="showCardDetails('${card.number}')">Detalhes</button>
            </div>
        `).join('');
    },
    clearFilters() {
        document.getElementById('binFilter').value = '';
        document.getElementById('brandFilter').value = 'all';
        document.getElementById('bankFilter').value = 'all';
        document.getElementById('levelFilter').value = 'all';
        document.getElementById('typeFilter').value = 'all';
        document.getElementById('priceRangeFilter').value = 'all';
        document.getElementById('stockFilter').value = 'all';
        this.filterCards();
    },
    toggleViewMode() {
        const viewMode = document.getElementById('viewMode').value;
        const cardList = document.getElementById('cardList');
        if (cardList) {
            cardList.className = `card-list card-list-${viewMode}`;
        }
    },
    showRegisterForm() {
        alert('Funcionalidade de registro não implementada. Contate o suporte.');
    },
    addLog(message, details = {}) {
        const logEntry = { message, details, timestamp: new Date().toISOString() };
        state.logs.push(logEntry);
        storage.saveLogs();
    },
    // Funções do Admin (lazy loading)
    displayUsers: (searchTerm) => {
        const userList = document.getElementById('userList');
        if (!userList) return;
        const filteredUsers = storage.users.filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
            user.id.includes(searchTerm)
        );
        userList.innerHTML = filteredUsers.map(user => `
            <div class="card-item">
                <p><strong>ID:</strong> ${user.id}</p>
                <p><strong>Usuário:</strong> ${user.username}</p>
                <p><strong>Saldo:</strong> R$ ${user.balance.toFixed(2)}</p>
                <p><strong>Compras:</strong> ${user.purchases.length}</p>
            </div>
        `).join('');
    },
    displayAdminCards: (searchTerm) => {
        const adminCardList = document.getElementById('adminCardList');
        if (!adminCardList) return;
        const filteredCards = storage.cards.filter(card => 
            card.number.includes(searchTerm) || 
            card.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
            card.bank.toLowerCase().includes(searchTerm.toLowerCase())
        );
        adminCardList.innerHTML = filteredCards.map(card => `
            <div class="card-item">
                <h2>${card.number}</h2>
                <p><strong>Validade:</strong> ${card.expiry}</p>
                <p><strong>Bandeira:</strong> ${card.brand}</p>
                <p><strong>Banco:</strong> ${card.bank}</p>
                <p><strong>Preço:</strong> R$ ${card.price.toFixed(2)}</p>
                <p><strong>Estoque:</strong> ${card.stock}</p>
                <button class="btn btn-secondary" onclick="ui.editCard('${card.id}')">Editar</button>
                <button class="btn btn-clear" onclick="ui.deleteCard('${card.id}')">Excluir</button>
            </div>
        `).join('');
    },
    showAddCardModal() {
        const modal = document.getElementById('cardModal');
        if (modal) {
            document.getElementById('modalTitle').textContent = 'Adicionar Novo Cartão';
            state.editingCardId = null;
            modal.style.display = 'flex';
        }
    },
    saveCard() {
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
            type: document.getElementById('cardType').value,
            name: document.getElementById('cardName').value,
            cpf: document.getElementById('cardCpf').value,
            level: document.getElementById('cardLevel').value
        };

        if (!card.number || !card.cvv || !card.expiry || !card.brand || !card.bank || !card.country || !card.price || !card.stock || !card.type || !card.name || !card.cpf || !card.level) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        if (state.editingCardId) {
            const index = storage.cards.findIndex(c => c.id === state.editingCardId);
            storage.cards[index] = card;
        } else {
            storage.cards.push(card);
        }
        storage.saveCards();
        document.getElementById('cardModal').style.display = 'none';
        ui.displayAdminCards('');
    },
    editCard(cardId) {
        const card = storage.cards.find(c => c.id === cardId);
        if (card) {
            state.editingCardId = cardId;
            document.getElementById('cardNumber').value = card.number;
            document.getElementById('cardCvv').value = card.cvv;
            document.getElementById('cardExpiry').value = card.expiry;
            document.getElementById('cardBrand').value = card.brand;
            document.getElementById('cardBank').value = card.bank;
            document.getElementById('cardCountry').value = card.country;
            document.getElementById('cardPrice').value = card.price;
            document.getElementById('cardStock').value = card.stock;
            document.getElementById('cardType').value = card.type;
            document.getElementById('cardName').value = card.name;
            document.getElementById('cardCpf').value = card.cpf;
            document.getElementById('cardLevel').value = card.level;
            document.getElementById('modalTitle').textContent = 'Editar Cartão';
            document.getElementById('cardModal').style.display = 'flex';
        }
    },
    deleteCard(cardId) {
        storage.cards = storage.cards.filter(c => c.id !== cardId);
        storage.saveCards();
        ui.displayAdminCards('');
    },
    showBulkEditModal() {
        document.getElementById('bulkEditModal').style.display = 'flex';
    },
    applyBulkEdit() {
        const field = document.getElementById('bulkEditField').value;
        const value = document.getElementById('bulkEditValue').value;
        if (!field || !value) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        storage.cards.forEach(card => {
            if (field === 'price') card.price = parseFloat(value);
            if (field === 'stock') card.stock = parseInt(value);
            if (field === 'brand') card.brand = value;
            if (field === 'bank') card.bank = value;
        });
        storage.saveCards();
        document.getElementById('bulkEditModal').style.display = 'none';
        ui.displayAdminCards('');
    },
    importCards() {
        alert('Funcionalidade de importação de cartões não implementada.');
    },
    exportCards() {
        const csv = storage.cards.map(card => Object.values(card).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cards.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    },
    exportLogs(format) {
        const data = format === 'csv' ? state.logs.map(log => `${log.message},${log.timestamp}`).join('\n') : JSON.stringify(state.logs);
        const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
    },
    clearLogs() {
        state.logs = [];
        storage.saveLogs();
        const logList = document.getElementById('logList');
        if (logList) logList.innerHTML = '';
    }
};

// === Funções Globais ===
function buyCard(cardNumber) {
    if (!checkLogin()) return;
    const cardList = document.getElementById('cardList');
    if (!cardList) return;
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
                <p><strong>Nível:</strong> ${card.level}</p>
            </div>
        `;
        confirmPurchaseModal.style.display = 'flex';
    }
}

function closeConfirmPurchaseModal() {
    const confirmPurchaseModal = document.getElementById('confirmPurchaseModal');
    if (confirmPurchaseModal) confirmPurchaseModal.style.display = 'none';
}

function confirmPurchase() {
    if (!checkLogin()) return;
    const cardNumberElement = document.querySelector('#confirmCardDetails .card-item h2');
    if (!cardNumberElement) return;
    const cardNumber = cardNumberElement.textContent.replace(/\s/g, '');
    const card = storage.cards.find(c => c.number === cardNumber);
    const user = storage.users.find(u => u.username === state.currentUser);

    if (card && user && user.balance >= card.price && card.stock > 0) {
        user.balance -= card.price;
        card.stock--;
        user.purchases.push({ cardNumber: card.number, expiry: card.expiry, brand: card.brand, bank: card.bank, country: card.country, type: card.type, price: card.price, date: new Date().toISOString(), name: card.name, cpf: card.cpf, level: card.level });
        storage.saveUsers();
        storage.saveCards();
        const userBalance = document.getElementById('userBalance');
        if (userBalance) userBalance.textContent = user.balance.toFixed(2);
        closeConfirmPurchaseModal();
        alert('Compra realizada com sucesso!');
        ui.filterCards();
        ui.addLog(`Compra realizada por ${user.username} do cartão ${card.number}`, { price: card.price, stock: card.stock });
        ui.showNotification('Compra confirmada!');
    } else {
        alert('Saldo insuficiente ou cartão fora de estoque.');
    }
}

function showCardDetails(cardNumber) {
    const card = storage.cards.find(c => c.number === cardNumber);
    if (card) {
        const cardDetailsContent = document.getElementById('cardDetailsContent');
        if (cardDetailsContent) {
            cardDetailsContent.innerHTML = `
                <p><strong>Número:</strong> ${card.number}</p>
                <p><strong>Validade:</strong> ${card.expiry}</p>
                <p><strong>Bandeira:</strong> ${card.brand}</p>
                <p><strong>Banco:</strong> ${card.bank}</p>
                <p><strong>Nível:</strong> ${card.level}</p>
                <p><strong>Tipo:</strong> ${card.type}</p>
                <p><strong>Preço:</strong> R$ ${card.price.toFixed(2)}</p>
                <p><strong>Estoque:</strong> ${card.stock}</p>
            `;
            document.getElementById('cardDetailsModal').style.display = 'flex';
        }
    }
}

function closeCardDetailsModal() {
    const cardDetailsModal = document.getElementById('cardDetailsModal');
    if (cardDetailsModal) cardDetailsModal.style.display = 'none';
}

// === Inicialização ===
document.addEventListener('DOMContentLoaded', () => {
    if (!checkLogin()) return;

    auth.initializeData();
    auth.checkAdminMode();
    const user = storage.users.find(u => u.username === state.currentUser);
    if (user) {
        const userBalance = document.getElementById('userBalance');
        const userBalanceAccount = document.getElementById('userBalanceAccount');
        if (userBalance) userBalance.textContent = user.balance.toFixed(2);
        if (userBalanceAccount) userBalanceAccount.textContent = user.balance.toFixed(2);
    }
    ui.updateNavbarVisibility();
    if (window.location.pathname.includes('shop.html')) ui.filterCards();
});
