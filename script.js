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
    currentUser: null,
    loginAttempts: 0,
    loginBlockedUntil: 0,
    selectedRechargeAmount: null,
    editingCardId: null,
    editingPixAmount: null,
    logs: JSON.parse(localStorage.getItem('logs')) || [],
    viewMode: 'grid'
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

// === Autenticação ===
const auth = {
    generateUniqueId() { let id; do { id = Math.floor(100000 + Math.random() * 900000).toString(); } while (storage.users.some(u => u.id === id)); return id; },
    async hashPassword(password) { if (window.crypto && window.crypto.subtle) { const encoder = new TextEncoder(); const data = encoder.encode(password); const hash = await window.crypto.subtle.digest('SHA-256', data); return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''); } function md5(str) { /* MD5 implementation */ } return md5(password); },
    validateLogin() { /* Existing validation */ },
    validateRegister() { /* Existing validation */ },
    async initializeData() { if (!storage.users.some(u => u.username === 'LVz')) { const defaultPassword = '123456'; const passwordHash = await this.hashPassword(defaultPassword); storage.users.push({ id: this.generateUniqueId(), username: 'LVz', password: passwordHash, balance: 0, purchases: [], isAdmin: false }); storage.saveUsers(); } if (storage.cards.length === 0) { storage.cards = [/* Initial cards */]; storage.saveCards(); } ui.updateNavbarVisibility(); },
    async login() { /* Existing login */ },
    async register() { /* Existing register */ },
    forgotPassword() { alert('Funcionalidade de recuperação de senha não implementada. Contate o suporte.'); },
    logout() { localStorage.removeItem('loggedIn'); localStorage.removeItem('currentUser'); state.currentUser = null; window.location.href = 'index.html'; },
    checkAdminMode() { const cartIcon = document.getElementById('cartIcon'); if (cartIcon) cartIcon.addEventListener('click', () => { state.clickCount++; if (state.clickCount >= CONFIG.ADMIN_CLICKS) { const password = prompt('Insira a senha para acessar o Painel Admin:'); if (password === CONFIG.ADMIN_PASSWORD) { const adminUser = storage.users.find(u => u.username === state.currentUser); if (adminUser) { adminUser.isAdmin = true; storage.saveUsers(); alert('Acesso ao Painel Admin concedido!'); window.location.href = 'dashboard.html'; } else { alert('Usuário não encontrado. Faça login novamente.'); window.location.href = 'index.html'; } } else { alert('Senha incorreta!'); state.clickCount = 0; } } }); }
};

// === Interface do Usuário ===
const ui = {
    toggleTheme() { document.body.classList.toggle('dark'); const themeToggle = document.getElementById('themeToggle'); if (themeToggle) themeToggle.textContent = document.body.classList.contains('dark') ? 'Modo Claro' : 'Modo Escuro'; },
    updateNavbarVisibility() { const navbar = document.getElementById('navbar'); if (navbar && localStorage.getItem('loggedIn')) navbar.style.display = 'flex'; else if (navbar) navbar.style.display = 'none'; },
    showRegisterForm() { /* Existing implementation */ },
    showLoginForm() { /* Existing implementation */ },
    showAccountInfo() { /* Existing implementation */ },
    showAddBalanceForm() { const rechargeModal = document.getElementById('rechargeModal'); if (rechargeModal) rechargeModal.style.display = 'flex'; },
    closeModal() { const rechargeModal = document.getElementById('rechargeModal'); if (rechargeModal) rechargeModal.style.display = 'none'; },
    selectRecharge(amount) { state.selectedRechargeAmount = amount; this.closeModal(); const pixPayment = document.getElementById('pixPayment'); if (pixPayment) { pixPayment.style.display = 'block'; document.getElementById('pixLoading').style.display = 'block'; document.getElementById('pixKey').textContent = 'Carregando...'; document.getElementById('pixQRCode').src = 'https://via.placeholder.com/150'; setTimeout(() => { document.getElementById('pixLoading').style.display = 'none'; this.updatePixDetailsDisplay(); }, 5000); } },
    copyPixKey() { const pixKey = document.getElementById('pixKey')?.textContent; if (pixKey && pixKey !== 'Carregando...') { navigator.clipboard.writeText(pixKey).then(() => alert('Chave Pix copiada para a área de transferência!')); } else alert('Chave Pix não disponível.'); },
    updatePixDetailsDisplay() { const pixKeySpan = document.getElementById('pixKey'); const pixQRCodeImg = document.getElementById('pixQRCode'); if (state.selectedRechargeAmount && storage.pixDetails[state.selectedRechargeAmount]) { if (pixKeySpan) pixKeySpan.textContent = storage.pixDetails[state.selectedRechargeAmount].key; if (pixQRCodeImg) pixQRCodeImg.src = storage.pixDetails[state.selectedRechargeAmount].qrCode; } else { if (pixKeySpan) pixKeySpan.textContent = 'Chave não configurada'; if (pixQRCodeImg) pixQRCodeImg.src = 'https://via.placeholder.com/150'; } },
    addBalance() { if (!state.selectedRechargeAmount || ![40, 70, 150, 300].includes(state.selectedRechargeAmount)) { alert('Por favor, selecione um valor de recarga válido.'); return; } const user = storage.users.find(u => u.username === state.currentUser); if (user) { const bonus = state.selectedRechargeAmount * 0.5; const totalCredit = state.selectedRechargeAmount + bonus; user.balance += totalCredit; storage.saveUsers(); const userBalance = document.getElementById('userBalance'); const userBalanceAccount = document.getElementById('userBalanceAccount'); if (userBalance) userBalance.textContent = user.balance.toFixed(2); if (userBalanceAccount) userBalanceAccount.textContent = user.balance.toFixed(2); const pixPayment = document.getElementById('pixPayment'); if (pixPayment) pixPayment.style.display = 'none'; alert(`Saldo adicionado com sucesso! Você recarregou R$ ${state.selectedRechargeAmount.toFixed(2)} e recebeu R$ ${totalCredit.toFixed(2)} (incluindo bônus de R$ ${bonus.toFixed(2)}).`); state.selectedRechargeAmount = null; this.showNotification('Saldo atualizado!'); } },
    filterCards() {
        const binFilter = document.getElementById('binFilter')?.value;
        const brandFilter = document.getElementById('brandFilter')?.value;
        const bankFilter = document.getElementById('bankFilter')?.value;
        const levelFilter = document.getElementById('levelFilter')?.value;
        const typeFilter = document.getElementById('typeFilter')?.value;
        const priceRangeFilter = document.getElementById('priceRangeFilter')?.value;
        const stockFilter = document.getElementById('stockFilter')?.value;
        const cardList = document.getElementById('cardList');
        if (cardList) {
            cardList.innerHTML = storage.cards
                .filter(card => {
                    const binMatch = !binFilter || card.number.startsWith(binFilter);
                    const brandMatch = brandFilter === 'all' || card.brand === brandFilter;
                    const bankMatch = bankFilter === 'all' || card.bank === bankFilter;
                    const levelMatch = levelFilter === 'all' || card.level === levelFilter;
                    const typeMatch = typeFilter === 'all' || card.type === typeFilter;
                    const priceMatch = this.filterPriceRange(card.price, priceRangeFilter);
                    const stockMatch = this.filterStock(card.stock, stockFilter);
                    return binMatch && brandMatch && bankMatch && levelMatch && typeMatch && priceMatch && stockMatch;
                })
                .map(card => {
                    const formattedNumber = card.number.replace(/(\d{4})(?=\d)/g, '$1 ');
                    const viewClass = state.viewMode === 'list' ? 'card-list-item' : 'card-list-grid';
                    return `
                        <div class="card-item ${viewClass}" data-card-number="${card.number}">
                            <h2>${formattedNumber.slice(0, 19)}</h2>
                            <p>Validade: ${card.expiry}</p>
                            <p>${card.brand} - ${card.bank} (${card.level})</p>
                            <p>${card.country}</p>
                            <div class="price">R$ ${card.price.toFixed(2)}</div>
                            <div class="buttons">
                                <button onclick="buyCard('${card.number}')">Comprar</button>
                            </div>
                        </div>
                    `;
                }).join('');
        }
    },
    filterPriceRange(price, range) {
        if (range === 'all') return true;
        const [min, max] = range.split('-').map(v => v === '+' ? Infinity : parseFloat(v) || 0);
        return price >= min && price <= max;
    },
    filterStock(stock, filter) {
        if (filter === 'all') return true;
        return filter === 'inStock' ? stock > 0 : stock <= 0;
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
        state.viewMode = document.getElementById('viewMode').value;
        document.getElementById('cardList').className = `card-list card-list-${state.viewMode}`;
        this.filterCards();
    },
    updateStats() {
        const totalUsers = storage.users.length;
        const totalCards = storage.cards.length;
        const totalBalance = storage.users.reduce((sum, user) => sum + (user.balance || 0), 0);

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalCards').textContent = totalCards;
        document.getElementById('totalBalance').textContent = totalBalance.toFixed(2);

        this.updateBalanceChart();
        this.updateSalesChart();
        this.updateSalesByBrandChart();
        this.updateConversionRateChart();
    },
    updateBalanceChart() { /* Existing implementation */ },
    updateSalesChart() { /* Existing implementation */ },
    updateSalesByBrandChart() {
        const ctx = document.getElementById('salesByBrandChart')?.getContext('2d');
        if (!ctx) return;
        if (window.salesByBrandChart) window.salesByBrandChart.destroy();
        const salesByBrand = {};
        storage.users.flatMap(user => user.purchases).forEach(p => {
            const card = storage.cards.find(c => c.number === p.cardNumber) || {};
            salesByBrand[card.brand || 'Desconhecido'] = (salesByBrand[card.brand || 'Desconhecido'] || 0) + p.price;
        });
        window.salesByBrandChart = new Chart(ctx, {
            type: 'pie',
            data: { labels: Object.keys(salesByBrand), datasets: [{ label: 'Vendas por Bandeira (R$)', data: Object.values(salesByBrand), backgroundColor: ['#28a745', '#007bff', '#dc3545', '#ffc107'] }] },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
    },
    updateConversionRateChart() {
        const ctx = document.getElementById('conversionRateChart')?.getContext('2d');
        if (!ctx) return;
        if (window.conversionRateChart) window.conversionRateChart.destroy();
        const totalViews = storage.cards.length * 10; // Estimativa de visualizações
        const totalPurchases = storage.users.flatMap(u => u.purchases).length;
        const conversionRate = totalPurchases / totalViews * 100 || 0;
        window.conversionRateChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Taxa de Conversão', 'Não Convertido'], datasets: [{ data: [conversionRate, 100 - conversionRate], backgroundColor: ['#28a745', '#ccc'] }] },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
    },
    displayUsers(searchTerm = '') { /* Existing implementation */ },
    displayAdminCards(searchTerm = '') { /* Existing implementation */ },
    checkLowStockAlerts() {
        const lowStockCards = storage.cards.filter(card => card.stock <= CONFIG.LOW_STOCK_THRESHOLD);
        const alertDiv = document.getElementById('lowStockAlert');
        if (alertDiv && lowStockCards.length > 0) {
            alertDiv.style.display = 'block';
            alertDiv.innerHTML = `<p class="alert-text">Atenção: ${lowStockCards.length} cartão(s) com estoque baixo (${CONFIG.LOW_STOCK_THRESHOLD} ou menos).</p>`;
            this.showNotification(`Estoque baixo: ${lowStockCards.length} cartão(s).`);
        } else if (alertDiv) {
            alertDiv.style.display = 'none';
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
        }
    },
    addLog(action, details = {}) {
        const ip = '127.0.0.1'; // Placeholder, substituir por API de IP real
        const log = {
            timestamp: new Date().toISOString(),
            action: action,
            user: state.currentUser,
            ip: ip,
            details: details,
            type: action.includes('Exclu') ? 'delete' : action.includes('Edit') ? 'edit' : action.includes('Adicion') ? 'create' : 'other'
        };
        state.logs.push(log);
        // Limpeza automática de logs antigos
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
    },
    clearLogs() { if (confirm('Tem certeza que deseja limpar todos os logs?')) { state.logs = []; storage.saveLogs(); this.displayLogs(); this.showNotification('Logs limpos com sucesso!'); } },
    exportLogs(format) {
        const data = state.logs.map(log => ({
            timestamp: new Date(log.timestamp).toLocaleString(),
            user: log.user,
            ip: log.ip,
            action: log.action,
            type: log.type,
            details: JSON.stringify(log.details)
        }));
        let content;
        if (format === 'csv') {
            content = ['Data,Usuário,IP,Ação,Tipo,Detalhes', ...data.map(d => `${d.timestamp},${d.user},${d.ip},${d.action},${d.type},${d.details}`).join('\n')].join('\n');
            const blob = new Blob([content], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'logs.csv'; a.click(); window.URL.revokeObjectURL(url);
        } else if (format === 'json') {
            content = JSON.stringify(data, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'logs.json'; a.click(); window.URL.revokeObjectURL(url);
        }
    },
    exportUsers() { /* Existing implementation */ },
    exportCards() { /* Existing implementation */ },
    importCards() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const lines = text.split('\n').slice(1); // Ignora cabeçalho
                lines.forEach(line => {
                    const [id, number, cvv, expiry, brand, bank, country, price, stock, type, name, cpf, level] = line.split(',');
                    if (number && cvv && expiry) {
                        storage.cards.push({ id, number, cvv, expiry, brand, bank, country, price: parseFloat(price), stock: parseInt(stock), type, name, cpf, level });
                    }
                });
                storage.saveCards();
                this.displayAdminCards();
                this.addLog('Importados cartões via CSV');
            };
            reader.readAsText(file);
        };
        input.click();
    },
    showAddCardModal() { state.editingCardId = null; document.getElementById('modalTitle').textContent = 'Adicionar Novo Cartão'; /* Clear form */ document.getElementById('cardModal').style.display = 'flex'; },
    showBulkEditModal() { document.getElementById('bulkEditField').value = ''; document.getElementById('bulkEditValue').value = ''; document.getElementById('bulkEditModal').style.display = 'flex'; },
    showAddPixModal() { state.editingPixAmount = null; document.getElementById('pixModalTitle').textContent = 'Adicionar Configuração PIX'; /* Clear form */ document.getElementById('pixModal').style.display = 'flex'; },
    editUser(userId) { const user = storage.users.find(u => u.id === userId); if (user) { user.balance = parseFloat(prompt(`Novo saldo para ${user.username} (R$):`, user.balance)) || user.balance; storage.saveUsers(); this.displayUsers(); this.addLog(`Editado saldo do usuário ${user.username}`, { newBalance: user.balance }); } },
    deleteUser(userId) { if (confirm('Tem certeza que deseja excluir este usuário?')) { const userIndex = storage.users.findIndex(u => u.id === userId); if (userIndex !== -1) { storage.users.splice(userIndex, 1); storage.saveUsers(); this.displayUsers(); this.addLog(`Excluído usuário com ID ${userId}`); } } },
    editCard(cardId) { const card = storage.cards.find(c => c.id === cardId); if (card) { state.editingCardId = cardId; document.getElementById('modalTitle').textContent = 'Editar Cartão'; /* Fill form */ document.getElementById('cardModal').style.display = 'flex'; } },
    deleteCard(cardId) { if (confirm('Tem certeza que deseja excluir este cartão?')) { const cardIndex = storage.cards.findIndex(c => c.id === cardId); if (cardIndex !== -1) { storage.cards.splice(cardIndex, 1); storage.saveCards(); this.displayAdminCards(); this.addLog(`Excluído cartão com ID ${cardId}`); } } },
    saveCard() { const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, ''); /* Existing validation */ const cardData = { id: state.editingCardId || Math.random().toString(36).substr(2, 9), number: cardNumber, /* Other fields */ }; if (state.editingCardId) { const cardIndex = storage.cards.findIndex(c => c.id === state.editingCardId); if (cardIndex !== -1) { storage.cards[cardIndex] = cardData; this.addLog(`Editado cartão com ID ${state.editingCardId}`, { changes: cardData }); } } else { storage.cards.push(cardData); this.addLog(`Adicionado novo cartão com ID ${cardData.id}`, { card: cardData }); } storage.saveCards(); document.getElementById('cardModal').style.display = 'none'; this.clearCardFormErrors(); },
    clearCardFormErrors() { /* Existing implementation */ },
    applyBulkEdit() { const field = document.getElementById('bulkEditField').value; const value = document.getElementById('bulkEditValue').value; if (!field || !value) { document.getElementById('bulkEditFieldError').textContent = 'Selecione um campo e insira um valor.'; return; } const numericFields = ['price', 'stock']; const newValue = numericFields.includes(field) ? parseFloat(value) : value; if (isNaN(newValue) && numericFields.includes(field)) { document.getElementById('bulkEditValueError').textContent = 'Valor deve ser numérico.'; return; } storage.cards.forEach(card => card[field] = newValue); storage.saveCards(); document.getElementById('bulkEditModal').style.display = 'none'; this.displayAdminCards(); this.addLog(`Edição em massa aplicada no campo ${field} com valor ${value}`, { field, value }); },
    savePix() { /* Existing implementation */ },
    editPix(amount) { /* Existing implementation */ },
    displayPixConfigs() { /* Existing implementation */ },
    filterPurchases() { /* Existing implementation */ }
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
                <p><strong>Nível:</strong> ${card.level}</p>
            </div>
        `;
        confirmPurchaseModal.style.display = 'flex';
    }
}

function closeConfirmPurchaseModal() { document.getElementById('confirmPurchaseModal').style.display = 'none'; }
function confirmPurchase() {
    const cardNumber = document.querySelector('#confirmCardDetails .card-item h2')?.textContent.replace(/\s/g, '');
    const card = storage.cards.find(c => c.number === cardNumber);
    const user = storage.users.find(u => u.username === state.currentUser);

    if (card && user && user.balance >= card.price && card.stock > 0) {
        user.balance -= card.price;
        card.stock--;
        user.purchases.push({ cardNumber: card.number, expiry: card.expiry, brand: card.brand, bank: card.bank, country: card.country, type: card.type, price: card.price, date: new Date().toISOString(), name: card.name, cpf: card.cpf, level: card.level });
        storage.saveUsers();
        storage.saveCards();
        document.getElementById('userBalance').textContent = user.balance.toFixed(2);
        closeConfirmPurchaseModal();
        alert('Compra realizada com sucesso!');
        ui.filterCards();
        ui.addLog(`Compra realizada por ${user.username} do cartão ${card.number}`, { price: card.price, stock: card.stock });
        ui.showNotification('Compra confirmada!');
    } else {
        alert('Saldo insuficiente ou cartão fora de estoque.');
    }
}

function showCardDetails(cardNumber) { /* Existing implementation */ }
function closeCardDetailsModal() { document.getElementById('cardDetailsModal').style.display = 'none'; }

// === Inicialização ===
document.addEventListener('DOMContentLoaded', () => {
    state.currentUser = localStorage.getItem('currentUser');
    if (!state.currentUser || !localStorage.getItem('loggedIn')) window.location.href = 'index.html';
    auth.initializeData();
    auth.checkAdminMode();
    const user = storage.users.find(u => u.username === state.currentUser);
    if (user) document.getElementById('userBalance').textContent = user.balance.toFixed(2);
    ui.filterCards();

    const cardNumberInput = document.getElementById('cardNumber');
    const cardCvvInput = document.getElementById('cardCvv');
    const cardExpiryInput = document.getElementById('cardExpiry');
    const cardCpfInput = document.getElementById('cardCpf');

    if (cardNumberInput) cardNumberInput.addEventListener('input', () => formatCardNumber(cardNumberInput));
    if (cardCvvInput) cardCvvInput.addEventListener('input', () => restrictCvv(cardCvvInput));
    if (cardExpiryInput) cardExpiryInput.addEventListener('input', () => formatExpiry(cardExpiryInput));
    if (cardCpfInput) cardCpfInput.addEventListener('input', () => formatCpf(cardCpfInput));

    if (document.getElementById('navbar')?.classList.contains('navbar')) ui.updateStats();
});
