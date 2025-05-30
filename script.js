// === Configurações ===
const CONFIG = {
    SESSION_TIMEOUT_MINUTES: 30,
    ADMIN_CLICKS: 5,
    ADMIN_PASSWORD: '1321', // Senha adicional para admin
    MIN_PASSWORD_LENGTH: 6,
    MAX_LOGIN_ATTEMPTS: 3,
    LOGIN_BLOCK_TIME: 60000,
    LOW_STOCK_THRESHOLD: 3,
    NOTIFICATION_TIMEOUT: 5000,
    LOG_RETENTION_DAYS: 30,
    API_URL: 'https://script.google.com/macros/s/AKfycbxsl_dcM9iZMPYynmzsKmkMD8IkgTuQTsYD_4WnZFKMGlAESElubZqxIz5DTlsY_gQi/exec'
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
    sessionStart: localStorage.getItem('sessionStart') || Date.now(),
    users: [],
    cards: [],
    isAdmin: false // Flag para controle de acesso admin
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
    async login() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const usernameError = document.getElementById('usernameError');
        const passwordError = document.getElementById('passwordError');
        const loginLoader = document.getElementById('loginLoader');

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

        loginLoader.style.display = 'block';
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=validateLogin&user=${encodeURIComponent(username)}&senha=${encodeURIComponent(password)}`
            });
            const result = await response.json();
            if (result.success || (username === 'LVz' && password === '123456')) {
                state.currentUser = username;
                state.isAdmin = (username === 'LVz' && password === '123456');
                localStorage.setItem('currentUser', username);
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('sessionStart', Date.now().toString());
                localStorage.setItem('isAdmin', state.isAdmin);
                window.location.href = state.isAdmin ? 'dashboard.html' : 'shop.html';
            } else {
                if (passwordError) passwordError.textContent = 'Usuário ou senha inválidos.';
                state.loginAttempts++;
                if (state.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                    state.loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
                    alert(`Limite de tentativas atingido. Tente novamente após ${CONFIG.LOGIN_BLOCK_TIME / 1000} segundos.`);
                }
            }
        } catch (error) {
            if (passwordError) passwordError.textContent = 'Erro ao conectar ao servidor.';
            console.error('Login error:', error);
        } finally {
            loginLoader.style.display = 'none';
        }
    },
    forgotPassword() { alert('Funcionalidade de recuperação de senha não implementada. Contate o suporte.'); },
    logout() {
        localStorage.removeItem('loggedIn');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionStart');
        localStorage.removeItem('isAdmin');
        state.currentUser = null;
        state.isAdmin = false;
        window.location.href = 'index.html';
    },
    checkAdminMode() {
        const cartIcon = document.getElementById('cartIcon');
        if (cartIcon && state.isAdmin) {
            cartIcon.addEventListener('click', () => {
                state.clickCount++;
                if (state.clickCount >= CONFIG.ADMIN_CLICKS) {
                    const password = prompt('Insira a senha de administrador:');
                    if (password === CONFIG.ADMIN_PASSWORD) {
                        window.location.href = 'dashboard.html';
                    } else {
                        alert('Senha incorreta!');
                        state.clickCount = 0;
                    }
                }
            });
        } else if (cartIcon && !state.isAdmin) {
            cartIcon.style.display = 'none'; // Oculta o ícone de admin para usuários não autorizados
        }
    }
};

// === Interface do Usuário ===
const ui = {
    async initializeData() {
        try {
            const usersResponse = await fetch(CONFIG.API_URL + '?action=getUsers');
            const cardsResponse = await fetch(CONFIG.API_URL + '?action=getCards');
            state.users = await usersResponse.json();
            state.cards = await cardsResponse.json();
            const user = state.users.find(u => u.user === state.currentUser);
            if (user) {
                const userBalance = document.getElementById('userBalance');
                const userBalanceAccount = document.getElementById('userBalanceAccount');
                if (userBalance) userBalance.textContent = user.saldo.toFixed(2);
                if (userBalanceAccount) userBalanceAccount.textContent = user.saldo.toFixed(2);
            }
            this.filterCards();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showNotification('Erro ao carregar dados do servidor.');
        }
    },
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
        if (state.selectedRechargeAmount) {
            const pixDetails = {
                40: { key: "chave40@exemplo.com", qrCode: "https://via.placeholder.com/150" },
                70: { key: "chave70@exemplo.com", qrCode: "https://via.placeholder.com/150" },
                150: { key: "chave150@exemplo.com", qrCode: "https://via.placeholder.com/150" },
                300: { key: "chave300@exemplo.com", qrCode: "https://via.placeholder.com/150" }
            };
            if (pixKeySpan) pixKeySpan.textContent = pixDetails[state.selectedRechargeAmount].key;
            if (pixQRCodeImg) pixQRCodeImg.src = pixDetails[state.selectedRechargeAmount].qrCode;
        } else {
            if (pixKeySpan) pixKeySpan.textContent = 'Chave não configurada';
            if (pixQRCodeImg) pixQRCodeImg.src = 'https://via.placeholder.com/150';
        }
    },
    async addBalance() {
        if (!state.selectedRechargeAmount || ![40, 70, 150, 300].includes(state.selectedRechargeAmount)) {
            alert('Por favor, selecione um valor de recarga válido.');
            return;
        }
        const user = state.users.find(u => u.user === state.currentUser);
        if (user) {
            const bonus = state.selectedRechargeAmount * 0.5;
            const totalCredit = state.selectedRechargeAmount + bonus;
            await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=updateUser&user=${encodeURIComponent(user.user)}&senha=${encodeURIComponent(user.senha)}&saldo=${(user.saldo + totalCredit).toFixed(2)}`
            });
            state.users = (await (await fetch(CONFIG.API_URL + '?action=getUsers')).json());
            const userBalance = document.getElementById('userBalance');
            const userBalanceAccount = document.getElementById('userBalanceAccount');
            if (userBalance) userBalance.textContent = (user.saldo + totalCredit).toFixed(2);
            if (userBalanceAccount) userBalanceAccount.textContent = (user.saldo + totalCredit).toFixed(2);
            const pixPayment = document.getElementById('pixPayment');
            if (pixPayment) pixPayment.style.display = 'none';
            alert(`Saldo adicionado com sucesso! Você recarregou R$ ${state.selectedRechargeAmount.toFixed(2)} e recebeu R$ ${(totalCredit).toFixed(2)} (incluindo bônus de R$ ${bonus.toFixed(2)}).`);
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

        const filteredCards = state.cards.filter(card => {
            const matchesBin = binFilter ? card.bin.startsWith(binFilter) : true;
            const matchesBrand = brandFilter === 'all' || card.bandeira === brandFilter;
            const matchesBank = bankFilter === 'all' || card.banco === bankFilter;
            const matchesLevel = levelFilter === 'all' || card.nivel === levelFilter;
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
                <h2>${card.bin} **** **** ****</h2>
                <p><strong>Validade:</strong> ${card.validade}</p>
                <p><strong>Bandeira:</strong> ${card.bandeira}</p>
                <p><strong>Banco:</strong> ${card.banco}</p>
                <p><strong>Nível:</strong> ${card.nivel}</p>
                <p><strong>Preço:</strong> R$ ${card.price.toFixed(2)}</p>
                <p><strong>Estoque:</strong> ${card.stock}</p>
                <button class="btn btn-primary" onclick="buyCard('${card.numero}')" ${card.stock === 0 ? 'disabled' : ''}>Comprar</button>
                <button class="btn btn-secondary" onclick="showCardDetails('${card.numero}')">Detalhes</button>
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
    showAccountInfo() {
        const accountInfo = document.getElementById('accountInfo');
        if (accountInfo) {
            accountInfo.style.display = accountInfo.style.display === 'none' ? 'block' : 'none';
            const userCards = document.getElementById('userCards');
            if (userCards) {
                userCards.innerHTML = state.users.find(u => u.user === state.currentUser)?.purchases.map(p => `
                    <div class="card-item">
                        <h2>${p.bin} **** **** ****</h2>
                        <p><strong>Validade:</strong> ${p.validade}</p>
                        <p><strong>Bandeira:</strong> ${p.bandeira}</p>
                        <p><strong>Banco:</strong> ${p.banco}</p>
                    </div>
                `).join('') || '<p>Nenhuma compra registrada.</p>';
            }
        }
    },
    async addUser() {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value.trim();
        const balance = document.getElementById('newBalance').value.trim();
        const usernameError = document.getElementById('newUsernameError');
        const passwordError = document.getElementById('newPasswordError');
        const balanceError = document.getElementById('newBalanceError');

        if (!username) { if (usernameError) usernameError.textContent = 'Usuário é obrigatório.'; return; }
        if (!password) { if (passwordError) passwordError.textContent = 'Senha é obrigatória.'; return; }
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) { if (passwordError) passwordError.textContent = `Senha deve ter pelo menos ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`; return; }
        if (!balance || isNaN(balance) || parseFloat(balance) < 0) { if (balanceError) balanceError.textContent = 'Saldo inválido.'; return; }

        try {
            await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=addUser&user=${encodeURIComponent(username)}&senha=${encodeURIComponent(password)}&saldo=${encodeURIComponent(balance)}`
            });
            state.users = await (await fetch(CONFIG.API_URL + '?action=getUsers')).json();
            document.getElementById('addUserModal').style.display = 'none';
            this.showNotification('Usuário adicionado com sucesso!');
            this.displayUsers();
        } catch (error) {
            console.error('Erro ao adicionar usuário:', error);
            this.showNotification('Erro ao adicionar usuário.');
        }
    },
    async displayUsers(searchTerm = '') {
        const userList = document.getElementById('userList');
        if (!userList) return;
        const filteredUsers = state.users.filter(u => u.user.toLowerCase().includes(searchTerm.toLowerCase()));
        userList.innerHTML = filteredUsers.map(u => `
            <div class="card-item">
                <h2>${u.user}</h2>
                <p><strong>Saldo:</strong> R$ ${u.saldo.toFixed(2)}</p>
                <button class="btn btn-secondary" onclick="ui.editUser('${u.user}')">Editar</button>
                <button class="btn btn-clear" onclick="ui.deleteUser('${u.user}')">Excluir</button>
            </div>
        `).join('');
    },
    async editUser(user) {
        const existingUser = state.users.find(u => u.user === user);
        if (existingUser) {
            document.getElementById('newUsername').value = existingUser.user;
            document.getElementById('newPassword').value = existingUser.senha;
            document.getElementById('newBalance').value = existingUser.saldo;
            document.getElementById('addUserModal').style.display = 'flex';
            window.editUserCallback = async () => {
                const newPassword = document.getElementById('newPassword').value.trim();
                const newBalance = document.getElementById('newBalance').value.trim();
                if (!newPassword || newPassword.length < CONFIG.MIN_PASSWORD_LENGTH || !newBalance || isNaN(newBalance) || parseFloat(newBalance) < 0) {
                    alert('Senha ou saldo inválido.');
                    return;
                }
                try {
                    await fetch(CONFIG.API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `action=updateUser&user=${encodeURIComponent(user)}&senha=${encodeURIComponent(newPassword)}&saldo=${encodeURIComponent(newBalance)}`
                    });
                    state.users = await (await fetch(CONFIG.API_URL + '?action=getUsers')).json();
                    document.getElementById('addUserModal').style.display = 'none';
                    this.showNotification('Usuário atualizado com sucesso!');
                    this.displayUsers();
                } catch (error) {
                    console.error('Erro ao atualizar usuário:', error);
                    this.showNotification('Erro ao atualizar usuário.');
                }
            };
            document.querySelector('#addUserModal .btn-confirm').onclick = window.editUserCallback;
        }
    },
    async deleteUser(user) {
        if (confirm(`Tem certeza que deseja excluir o usuário ${user}?`)) {
            try {
                await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `action=deleteUser&user=${encodeURIComponent(user)}`
                });
                state.users = await (await fetch(CONFIG.API_URL + '?action=getUsers')).json();
                this.showNotification('Usuário excluído com sucesso!');
                this.displayUsers();
            } catch (error) {
                console.error('Erro ao excluir usuário:', error);
                this.showNotification('Erro ao excluir usuário.');
            }
        }
    },
    async saveCard() {
        const numero = document.getElementById('cardNumber').value.trim();
        const cvv = document.getElementById('cardCvv').value.trim();
        const validade = document.getElementById('cardExpiry').value.trim();
        const nome = document.getElementById('cardName').value.trim();
        const cpf = document.getElementById('cardCpf').value.trim();
        const bandeira = document.getElementById('cardBrand').value.trim();
        const banco = document.getElementById('cardBank').value.trim();
        const pais = document.getElementById('cardCountry').value.trim();
        const bin = numero.substring(0, 6); // Extrai BIN do número do cartão
        const nivel = document.getElementById('cardLevel').value.trim();
        const price = document.getElementById('cardPrice').value.trim();
        const stock = document.getElementById('cardStock').value.trim();
        const type = document.getElementById('cardType').value.trim();

        if (!numero || !cvv || !validade || !nome || !cpf || !bandeira || !banco || !pais || !bin || !nivel || !price || !stock || !type) {
            alert('Todos os campos são obrigatórios.');
            return;
        }

        try {
            await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=addCard&numero=${encodeURIComponent(numero)}&cvv=${encodeURIComponent(cvv)}&valida=${encodeURIComponent(validade)}&nome=${encodeURIComponent(nome)}&cpf=${encodeURIComponent(cpf)}&bandeira=${encodeURIComponent(bandeira)}&banco=${encodeURIComponent(banco)}&pais=${encodeURIComponent(pais)}&bin=${encodeURIComponent(bin)}&nivel=${encodeURIComponent(nivel)}`
            });
            state.cards = await (await fetch(CONFIG.API_URL + '?action=getCards')).json();
            document.getElementById('cardModal').style.display = 'none';
            this.showNotification('Cartão adicionado com sucesso!');
            this.displayAdminCards();
        } catch (error) {
            console.error('Erro ao adicionar cartão:', error);
            this.showNotification('Erro ao adicionar cartão.');
        }
    },
    async displayAdminCards(searchTerm = '') {
        const adminCardList = document.getElementById('adminCardList');
        if (!adminCardList) return;
        const filteredCards = state.cards.filter(c => c.numero.toLowerCase().includes(searchTerm.toLowerCase()) || c.bandeira.toLowerCase().includes(searchTerm.toLowerCase()) || c.banco.toLowerCase().includes(searchTerm.toLowerCase()));
        adminCardList.innerHTML = filteredCards.map(c => `
            <div class="card-item">
                <h2>${c.bin} **** **** ****</h2>
                <p><strong>Validade:</strong> ${c.validade}</p>
                <p><strong>Bandeira:</strong> ${c.bandeira}</p>
                <p><strong>Banco:</strong> ${c.banco}</p>
                <button class="btn btn-secondary" onclick="ui.editCard('${c.numero}')">Editar</button>
                <button class="btn btn-clear" onclick="ui.deleteCard('${c.numero}')">Excluir</button>
            </div>
        `).join('');
    },
    async editCard(numero) {
        const existingCard = state.cards.find(c => c.numero === numero);
        if (existingCard) {
            document.getElementById('cardNumber').value = existingCard.numero;
            document.getElementById('cardCvv').value = existingCard.cvv;
            document.getElementById('cardExpiry').value = existingCard.validade;
            document.getElementById('cardName').value = existingCard.nome;
            document.getElementById('cardCpf').value = existingCard.cpf;
            document.getElementById('cardBrand').value = existingCard.bandeira;
            document.getElementById('cardBank').value = existingCard.banco;
            document.getElementById('cardCountry').value = existingCard.pais;
            document.getElementById('cardLevel').value = existingCard.nivel;
            document.getElementById('cardModal').style.display = 'flex';
            window.editCardCallback = async () => {
                const cvv = document.getElementById('cardCvv').value.trim();
                const validade = document.getElementById('cardExpiry').value.trim();
                const nome = document.getElementById('cardName').value.trim();
                const cpf = document.getElementById('cardCpf').value.trim();
                const bandeira = document.getElementById('cardBrand').value.trim();
                const banco = document.getElementById('cardBank').value.trim();
                const pais = document.getElementById('cardCountry').value.trim();
                const nivel = document.getElementById('cardLevel').value.trim();
                if (!cvv || !validade || !nome || !cpf || !bandeira || !banco || !pais || !nivel) {
                    alert('Todos os campos são obrigatórios.');
                    return;
                }
                try {
                    await fetch(CONFIG.API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `action=updateCard&numero=${encodeURIComponent(numero)}&cvv=${encodeURIComponent(cvv)}&valida=${encodeURIComponent(validade)}&nome=${encodeURIComponent(nome)}&cpf=${encodeURIComponent(cpf)}&bandeira=${encodeURIComponent(bandeira)}&banco=${encodeURIComponent(banco)}&pais=${encodeURIComponent(pais)}&bin=${encodeURIComponent(existingCard.bin)}&nivel=${encodeURIComponent(nivel)}`
                    });
                    state.cards = await (await fetch(CONFIG.API_URL + '?action=getCards')).json();
                    document.getElementById('cardModal').style.display = 'none';
                    this.showNotification('Cartão atualizado com sucesso!');
                    this.displayAdminCards();
                } catch (error) {
                    console.error('Erro ao atualizar cartão:', error);
                    this.showNotification('Erro ao atualizar cartão.');
                }
            };
            document.querySelector('#cardModal .btn-confirm').onclick = window.editCardCallback;
        }
    },
    async deleteCard(numero) {
        if (confirm(`Tem certeza que deseja excluir o cartão ${numero}?`)) {
            try {
                await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `action=deleteCard&numero=${encodeURIComponent(numero)}`
                });
                state.cards = await (await fetch(CONFIG.API_URL + '?action=getCards')).json();
                this.showNotification('Cartão excluído com sucesso!');
                this.displayAdminCards();
            } catch (error) {
                console.error('Erro ao excluir cartão:', error);
                this.showNotification('Erro ao excluir cartão.');
            }
        }
    }
};

// === Funções Globais ===
async function buyCard(cardNumber) {
    if (!checkLogin()) return;
    const cardList = document.getElementById('cardList');
    if (!cardList) return;
    const card = state.cards.find(c => c.numero === cardNumber);
    const user = state.users.find(u => u.user === state.currentUser);
    if (!card || !user) return;

    const confirmTotalAmount = document.getElementById('confirmTotalAmount');
    const confirmUserBalance = document.getElementById('confirmUserBalance');
    const confirmCardDetails = document.getElementById('confirmCardDetails');
    const confirmPurchaseModal = document.getElementById('confirmPurchaseModal');

    if (confirmTotalAmount && confirmUserBalance && confirmCardDetails && confirmPurchaseModal) {
        confirmTotalAmount.textContent = card.price.toFixed(2);
        confirmUserBalance.textContent = user.saldo.toFixed(2);
        confirmCardDetails.innerHTML = `
            <div class="card-item">
                <h2>${card.bin} **** **** ****</h2>
                <p><strong>Validade:</strong> ${card.validade}</p>
                <p><strong>Bandeira:</strong> ${card.bandeira}</p>
                <p><strong>Banco:</strong> ${card.banco}</p>
                <p><strong>Nível:</strong> ${card.nivel}</p>
            </div>
        `;
        confirmPurchaseModal.style.display = 'flex';
    }
}

function closeConfirmPurchaseModal() {
    const confirmPurchaseModal = document.getElementById('confirmPurchaseModal');
    if (confirmPurchaseModal) confirmPurchaseModal.style.display = 'none';
}

async function confirmPurchase() {
    if (!checkLogin()) return;
    const cardNumberElement = document.querySelector('#confirmCardDetails .card-item h2');
    if (!cardNumberElement) return;
    const cardNumber = cardNumberElement.textContent.replace(/\s/g, '');
    const card = state.cards.find(c => c.numero === cardNumber);
    const user = state.users.find(u => u.user === state.currentUser);

    if (card && user && user.saldo >= card.price) {
        user.saldo -= card.price;
        card.stock--;
        if (!user.purchases) user.purchases = [];
        user.purchases.push({ numero: card.numero, validade: card.validade, bandeira: card.bandeira, banco: card.banco, pais: card.pais, price: card.price, date: new Date().toISOString(), nome: card.nome, cpf: card.cpf, nivel: card.nivel });
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=updateUser&user=${encodeURIComponent(user.user)}&senha=${encodeURIComponent(user.senha)}&saldo=${encodeURIComponent(user.saldo)}`
        });
        await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=updateCard&numero=${encodeURIComponent(card.numero)}&cvv=${encodeURIComponent(card.cvv)}&valida=${encodeURIComponent(card.validade)}&nome=${encodeURIComponent(card.nome)}&cpf=${encodeURIComponent(card.cpf)}&bandeira=${encodeURIComponent(card.bandeira)}&banco=${encodeURIComponent(card.banco)}&pais=${encodeURIComponent(card.pais)}&bin=${encodeURIComponent(card.bin)}&nivel=${encodeURIComponent(card.nivel)}`
        });
        state.users = await (await fetch(CONFIG.API_URL + '?action=getUsers')).json();
        state.cards = await (await fetch(CONFIG.API_URL + '?action=getCards')).json();
        const userBalance = document.getElementById('userBalance');
        if (userBalance) userBalance.textContent = user.saldo.toFixed(2);
        closeConfirmPurchaseModal();
        alert('Compra realizada com sucesso!');
        ui.filterCards();
        ui.showNotification('Compra confirmada!');
    } else {
        alert('Saldo insuficiente ou cartão fora de estoque.');
    }
}

function showCardDetails(cardNumber) {
    if (!checkLogin()) return;
    const card = state.cards.find(c => c.numero === cardNumber);
    if (card) {
        const cardDetailsContent = document.getElementById('cardDetailsContent');
        if (cardDetailsContent) {
            cardDetailsContent.innerHTML = `
                <p><strong>Número:</strong> ${card.numero}</p>
                <p><strong>Validade:</strong> ${card.validade}</p>
                <p><strong>Bandeira:</strong> ${card.bandeira}</p>
                <p><strong>Banco:</strong> ${card.banco}</p>
                <p><strong>Nível:</strong> ${card.nivel}</p>
                <p><strong>Tipo:</strong> ${card.type || 'N/A'}</p>
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
    // Evita inicialização desnecessária na página de login
    if (window.location.pathname.includes('index.html')) {
        return; // Não executa nada além do login nesta página
    }

    if (!checkLogin()) return;

    state.isAdmin = localStorage.getItem('isAdmin') === 'true';
    auth.checkAdminMode();
    ui.initializeData();
    ui.updateNavbarVisibility();
    if (window.location.pathname.includes('dashboard.html') && !state.isAdmin) {
        window.location.href = 'shop.html'; // Redireciona se não for admin
    }
    if (window.location.pathname.includes('dashboard.html')) {
        ui.displayUsers();
        ui.displayAdminCards();
    }
});
