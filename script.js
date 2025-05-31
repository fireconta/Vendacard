// === Configurações ===
const CONFIG = {
    SESSION_TIMEOUT_MINUTES: 30,
    MIN_PASSWORD_LENGTH: 6,
    MAX_LOGIN_ATTEMPTS: 3,
    LOGIN_BLOCK_TIME: 60000,
    NOTIFICATION_TIMEOUT: 5000,
    LOG_RETENTION_DAYS: 30,
    API_URL: 'https://script.google.com/macros/s/AKfycbzEJ7vsoGOM73X5WgooghEUYxuKkBergWYN4gBrX7zDSp28QTWn0fsBTnJQT52koZQO/exec' // URL fornecida
};

// === Estado Global ===
const state = {
    currentUser: null,
    loginAttempts: 0,
    loginBlockedUntil: 0,
    logs: JSON.parse(localStorage.getItem('logs')) || [],
    sessionStart: localStorage.getItem('sessionStart') || Date.now(),
    users: [],
    cards: [],
    userCards: [],
    isAdmin: false,
    theme: localStorage.getItem('theme') || 'dark'
};

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

// === Função de Verificação de Login ===
function checkLogin() {
    const currentUser = localStorage.getItem('currentUser');
    const sessionStart = parseInt(localStorage.getItem('sessionStart') || '0');
    const sessionTimeout = CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;

    if (!currentUser) {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
        return false;
    }

    if (Date.now() - sessionStart > sessionTimeout) {
        auth.logout();
        alert('Sua sessão expirou. Faça login novamente.');
        return false;
    }

    state.currentUser = JSON.parse(currentUser);
    state.isAdmin = state.currentUser.isAdmin === 'TRUE';
    return true;
}

// === Autenticação ===
const auth = {
    async login() {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const usernameError = document.getElementById('usernameError');
        const passwordError = document.getElementById('passwordError');

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

        if (state.loginBlockedUntil > Date.now()) {
            alert(`Você está bloqueado. Tente novamente em ${(state.loginBlockedUntil - Date.now()) / 1000} segundos.`);
            return;
        }

        try {
            const loginUrl = `${CONFIG.API_URL}?action=login&user=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
            console.log(`Tentando login com URL: ${loginUrl}`);
            const response = await fetch(loginUrl);
            const responseText = await response.text();
            console.log('Resposta bruta do servidor:', responseText);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const result = JSON.parse(responseText);
            console.log('Resultado parsed:', result);
            if (result.success) {
                state.currentUser = result.user;
                state.isAdmin = result.user.isAdmin === 'TRUE';
                localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
                localStorage.setItem('sessionStart', Date.now().toString());
                state.loginAttempts = 0;
                window.location.href = state.isAdmin ? 'dashboard.html' : 'shop.html';
            } else {
                if (passwordError) passwordError.textContent = result.message || 'Usuário ou senha inválidos.';
                state.loginAttempts++;
                if (state.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                    state.loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
                    alert(`Limite de tentativas atingido. Tente novamente após ${CONFIG.LOGIN_BLOCK_TIME / 1000} segundos.`);
                }
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error.message);
            if (passwordError) passwordError.textContent = 'Erro ao conectar ao servidor. Verifique a URL da API e a implantação do script.';
        }
    },

    async register() {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value.trim();
        const usernameError = document.getElementById('newUsernameError');
        const passwordError = document.getElementById('newPasswordError');

        if (!username) {
            if (usernameError) usernameError.textContent = 'Usuário é obrigatório.';
            return;
        }
        if (!password) {
            if (passwordError) passwordError.textContent = 'Senha é obrigatória.';
            return;
        }
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            if (passwordError) passwordError.textContent = `A senha deve ter pelo menos ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
            return;
        }

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=register&user=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&saldo=0&isAdmin=FALSE`
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const result = await response.json();

            if (result.success) {
                ui.showNotification('Registro realizado com sucesso! Faça login.');
                ui.showLoginForm();
            } else {
                if (usernameError) usernameError.textContent = result.message || 'Erro ao registrar.';
            }
        } catch (error) {
            console.error('Erro ao registrar:', error.message);
            if (usernameError) usernameError.textContent = 'Erro ao conectar ao servidor.';
        }
    },

    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionStart');
        state.currentUser = null;
        state.isAdmin = false;
        window.location.href = 'index.html';
    }
};

// === Interface do Usuário ===
const ui = {
    async initializeData() {
        try {
            const usersResponse = await fetch(`${CONFIG.API_URL}?action=getUsers`);
            if (!usersResponse.ok) throw new Error(`HTTP error! Status: ${usersResponse.status}`);
            const cardsResponse = await fetch(`${CONFIG.API_URL}?action=getCards`);
            if (!cardsResponse.ok) throw new Error(`HTTP error! Status: ${cardsResponse.status}`);
            const userCardsResponse = await fetch(`${CONFIG.API_URL}?action=getUserCards&user=${encodeURIComponent(state.currentUser.user)}`);
            if (!userCardsResponse.ok) throw new Error(`HTTP error! Status: ${userCardsResponse.status}`);

            state.users = await usersResponse.json();
            state.cards = await cardsResponse.json();
            state.userCards = await userCardsResponse.json();

            const userBalance = document.getElementById('userBalance');
            const userBalanceAccount = document.getElementById('userBalanceAccount');
            if (userBalance) userBalance.textContent = parseFloat(state.currentUser.saldo).toFixed(2);
            if (userBalanceAccount) userBalanceAccount.textContent = parseFloat(state.currentUser.saldo).toFixed(2);

            this.displayCards();
        } catch (error) {
            console.error('Erro ao carregar dados:', error.message);
            this.showNotification('Erro ao carregar dados do servidor.');
        }
    },

    updateNavbarVisibility() {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            navbar.classList.remove('hidden');
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) themeToggle.textContent = state.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
        }
    },

    displayCards(searchQuery = '') {
        const cardList = document.getElementById('cardList');
        if (!cardList) return;

        let filteredCards = state.cards.filter(card => {
            const binFilter = document.getElementById('binFilter')?.value.trim().toLowerCase() || '';
            const brandFilter = document.getElementById('brandFilter')?.value.toLowerCase();
            const bankFilter = document.getElementById('bankFilter')?.value.toLowerCase();
            const levelFilter = document.getElementById('levelFilter')?.value.toLowerCase();

            return (
                (!binFilter || card.bin.toLowerCase().includes(binFilter)) &&
                (brandFilter === 'all' || card.bandeira.toLowerCase() === brandFilter) &&
                (bankFilter === 'all' || card.banco.toLowerCase() === bankFilter) &&
                (levelFilter === 'all' || card.nivel.toLowerCase() === levelFilter) &&
                (!searchQuery || 
                    card.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    card.bandeira.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    card.banco.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        });

        cardList.innerHTML = filteredCards.map(card => `
            <div class="card-item">
                <p><strong>Número:</strong> ${card.numero}</p>
                <p><strong>Bandeira:</strong> ${card.bandeira}</p>
                <p><strong>Banco:</strong> ${card.banco}</p>
                <p><strong>Nível:</strong> ${card.nivel}</p>
                <p><strong>Preço:</strong> R$ 10.00</p>
                <button class="p-2 bg-blue-600 text-white rounded hover:bg-blue-500" onclick="showCardDetails('${card.numero}')">Detalhes</button>
                <button class="p-2 bg-green-600 text-white rounded hover:bg-green-500" onclick="openConfirmPurchaseModal('${card.numero}')">Comprar</button>
            </div>
        `).join('');
    },

    displayAdminCards(searchQuery = '') {
        const adminCardList = document.getElementById('adminCardList');
        if (!adminCardList) return;

        let filteredCards = state.cards.filter(card => {
            return !searchQuery || 
                card.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.bandeira.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.banco.toLowerCase().includes(searchQuery.toLowerCase());
        });

        adminCardList.innerHTML = filteredCards.map(card => `
            <div class="card-item">
                <p><strong>Número:</strong> ${card.numero}</p>
                <p><strong>Bandeira:</strong> ${card.bandeira}</p>
                <p><strong>Banco:</strong> ${card.banco}</p>
                <p><strong>Nível:</strong> ${card.nivel}</p>
                <button class="p-2 bg-blue-600 text-white rounded hover:bg-blue-500" onclick="ui.editCard('${card.numero}')">Editar</button>
                <button class="p-2 bg-red-600 text-white rounded hover:bg-red-500" onclick="ui.deleteCard('${card.numero}')">Excluir</button>
            </div>
        `).join('');
    },

    displayUsers(searchQuery = '') {
        const userList = document.getElementById('userList');
        if (!userList) return;

        let filteredUsers = state.users.filter(user => {
            return !searchQuery || user.user.toLowerCase().includes(searchQuery.toLowerCase());
        });

        userList.innerHTML = filteredUsers.map(user => `
            <div class="card-item">
                <p><strong>Usuário:</strong> ${user.user}</p>
                <p><strong>Saldo:</strong> R$ ${parseFloat(user.saldo).toFixed(2)}</p>
                <p><strong>Admin:</strong> ${user.isAdmin}</p>
                <button class="p-2 bg-blue-600 text-white rounded hover:bg-blue-500" onclick="ui.editUser('${user.user}')">Editar</button>
                <button class="p-2 bg-red-600 text-white rounded hover:bg-red-500" onclick="ui.deleteUser('${user.user}')">Excluir</button>
            </div>
        `).join('');
    },

    filterCards() {
        this.displayCards();
    },

    clearFilters() {
        document.getElementById('binFilter').value = '';
        document.getElementById('brandFilter').value = 'all';
        document.getElementById('bankFilter').value = 'all';
        document.getElementById('levelFilter').value = 'all';
        this.displayCards();
    },

    showAccountInfo() {
        const accountInfo = document.getElementById('accountInfo');
        const cardList = document.getElementById('cardList');
        const shopHeader = document.querySelector('.shop-header');
        const filters = document.querySelector('.filters');

        if (accountInfo && cardList && shopHeader && filters) {
            accountInfo.classList.toggle('hidden');
            cardList.classList.toggle('hidden');
            shopHeader.classList.toggle('hidden');
            filters.classList.toggle('hidden');

            if (!accountInfo.classList.contains('hidden')) {
                const userCards = document.getElementById('userCards');
                if (userCards) {
                    userCards.innerHTML = state.userCards.map(card => `
                        <div class="card-item">
                            <p><strong>Número:</strong> ${card.numero}</p>
                            <p><strong>Bandeira:</strong> ${card.bandeira}</p>
                            <p><strong>Banco:</strong> ${card.banco}</p>
                            <p><strong>Nível:</strong> ${card.nivel}</p>
                            <button class="p-2 bg-blue-600 text-white rounded hover:bg-blue-500" onclick="showCardDetails('${card.numero}')">Detalhes</button>
                        </div>
                    `).join('');
                }
            }
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

    async addUser() {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value.trim();
        const balance = document.getElementById('newBalance').value.trim();
        const usernameError = document.getElementById('newUsernameError');
        const passwordError = document.getElementById('newPasswordError');
        const balanceError = document.getElementById('newBalanceError');

        if (!username) {
            if (usernameError) usernameError.textContent = 'Usuário é obrigatório.';
            return;
        }
        if (!password) {
            if (passwordError) passwordError.textContent = 'Senha é obrigatória.';
            return;
        }
        if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
            if (passwordError) passwordError.textContent = `A senha deve ter pelo menos ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
            return;
        }
        if (!balance || isNaN(balance) || parseFloat(balance) < 0) {
            if (balanceError) balanceError.textContent = 'Saldo inválido.';
            return;
        }

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=register&user=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&saldo=${balance}&isAdmin=FALSE`
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const result = await response.json();

            if (result.success) {
                state.users = await (await fetch(`${CONFIG.API_URL}?action=getUsers`)).json();
                document.getElementById('addUserModal').style.display = 'none';
                this.showNotification('Usuário adicionado com sucesso!');
                this.displayUsers();
            } else {
                if (usernameError) usernameError.textContent = result.message || 'Erro ao adicionar usuário.';
            }
        } catch (error) {
            console.error('Erro ao adicionar usuário:', error.message);
            this.showNotification('Erro ao adicionar usuário.');
        }
    },

    async editUser(username) {
        const user = state.users.find(u => u.user === username);
        if (!user) return;

        document.getElementById('newUsername').value = user.user;
        document.getElementById('newPassword').value = user.password;
        document.getElementById('newBalance').value = user.saldo;
        document.getElementById('addUserModal').style.display = 'flex';

        window.editUserCallback = async () => {
            const newPassword = document.getElementById('newPassword').value.trim();
            const newBalance = document.getElementById('newBalance').value.trim();
            if (!newPassword || newPassword.length < CONFIG.MIN_PASSWORD_LENGTH || !newBalance || isNaN(newBalance) || parseFloat(newBalance) < 0) {
                alert('Senha ou saldo inválido.');
                return;
            }
            try {
                const response = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `action=register&user=${encodeURIComponent(username)}&password=${encodeURIComponent(newPassword)}&saldo=${encodeURIComponent(newBalance)}&isAdmin=${user.isAdmin}`
                });
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                state.users = await (await fetch(`${CONFIG.API_URL}?action=getUsers`)).json();
                document.getElementById('addUserModal').style.display = 'none';
                this.showNotification('Usuário atualizado com sucesso!');
                this.displayUsers();
            } catch (error) {
                console.error('Erro ao atualizar usuário:', error.message);
                this.showNotification('Erro ao atualizar usuário.');
            }
        };
        document.querySelector('#addUserModal .btn-confirm').onclick = window.editUserCallback;
    },

    async deleteUser(username) {
        if (!confirm(`Tem certeza que deseja excluir o usuário ${username}?`)) return;

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=deleteUser&user=${encodeURIComponent(username)}`
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            state.users = state.users.filter(u => u.user !== username);
            this.showNotification('Usuário excluído com sucesso!');
            this.displayUsers();
            state.logs.push({
                timestamp: new Date().toISOString(),
                user: state.currentUser.user,
                action: `Excluiu usuário ${username}`
            });
            localStorage.setItem('logs', JSON.stringify(state.logs));
        } catch (error) {
            console.error('Erro ao excluir usuário:', error.message);
            this.showNotification('Erro ao excluir usuário.');
        }
    },

    async saveCard() {
        const cardNumber = document.getElementById('cardNumber').value.trim();
        const cvv = document.getElementById('cardCvv').value.trim();
        const expiry = document.getElementById('cardExpiry').value.trim();
        const name = document.getElementById('cardName').value.trim();
        const cpf = document.getElementById('cardCpf').value.trim();
        const brand = document.getElementById('cardBrand').value;
        const bank = document.getElementById('cardBank').value;
        const country = document.getElementById('cardCountry').value.trim();
        const level = document.getElementById('cardLevel').value;

        const errors = [
            'cardNumberError', 'cardCvvError', 'cardExpiryError', 'cardNameError', 'cardCpfError',
            'cardBrandError', 'cardBankError', 'cardCountryError', 'cardLevelError'
        ].forEach(id => document.getElementById(id).textContent = '');

        if (!cardNumber || !cvv || !expiry || !name || !cpf || !brand || !bank || !country || !level) {
            if (!cardNumber) document.getElementById('cardNumberError').textContent = 'Número é obrigatório.';
            if (!cvv) document.getElementById('cardCvvError').textContent = 'CVV é obrigatório.';
            if (!expiry) document.getElementById('cardExpiryError').textContent = 'Validade é obrigatória.';
            if (!name) document.getElementById('cardNameError').textContent = 'Nome é obrigatório.';
            if (!cpf) document.getElementById('cardCpfError').textContent = 'CPF é obrigatório.';
            if (!brand) document.getElementById('cardBrandError').textContent = 'Bandeira é obrigatória.';
            if (!bank) document.getElementById('cardBankError').textContent = 'Banco é obrigatório.';
            if (!country) document.getElementById('cardCountryError').textContent = 'País é obrigatório.';
            if (!level) document.getElementById('cardLevelError').textContent = 'Nível é obrigatório.';
            return;
        }

        const bin = cardNumber.substring(0, 6);
        const cardData = {
            numero: cardNumber,
            cvv: cvv,
            validade: expiry,
            nome: name,
            cpf: cpf,
            bandeira: brand,
            banco: bank,
            pais: country,
            bin: bin,
            nivel: level
        };

        try {
            const action = state.cards.some(card => card.numero === cardNumber) ? 'updateCard' : 'addCard';
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=${action}&numero=${encodeURIComponent(cardNumber)}&cvv=${encodeURIComponent(cvv)}&valida=${encodeURIComponent(expiry)}&nome=${encodeURIComponent(name)}&cpf=${encodeURIComponent(cpf)}&bandeira=${encodeURIComponent(brand)}&banco=${encodeURIComponent(bank)}&pais=${encodeURIComponent(country)}&bin=${encodeURIComponent(bin)}&nivel=${encodeURIComponent(level)}`
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            state.cards = await (await fetch(`${CONFIG.API_URL}?action=getCards`)).json();
            document.getElementById('cardModal').style.display = 'none';
            this.showNotification('Cartão salvo com sucesso!');
            this.displayAdminCards();
        } catch (error) {
            console.error('Erro ao salvar cartão:', error.message);
            this.showNotification('Erro ao salvar cartão.');
        }
    },

    async editCard(numero) {
        const card = state.cards.find(c => c.numero === numero);
        if (!card) return;

        document.getElementById('cardNumber').value = card.numero;
        document.getElementById('cardCvv').value = card.cvv;
        document.getElementById('cardExpiry').value = card.validade;
        document.getElementById('cardName').value = card.nome;
        document.getElementById('cardCpf').value = card.cpf;
        document.getElementById('cardBrand').value = card.bandeira;
        document.getElementById('cardBank').value = card.banco;
        document.getElementById('cardCountry').value = card.pais;
        document.getElementById('cardLevel').value = card.nivel;
        document.getElementById('modalTitle').textContent = 'Editar Cartão';
        document.getElementById('cardModal').style.display = 'flex';

        window.editCardCallback = async () => {
            await this.saveCard();
        };
        document.querySelector('#cardModal .btn-confirm').onclick = window.editCardCallback;
    },

    async deleteCard(numero) {
        if (!confirm(`Tem certeza que deseja excluir o cartão ${numero}?`)) return;

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=deleteCard&cardNumber=${encodeURIComponent(numero)}`
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            state.cards = state.cards.filter(c => c.numero !== numero);
            this.showNotification('Cartão excluído com sucesso!');
            this.displayAdminCards();
            state.logs.push({
                timestamp: new Date().toISOString(),
                user: state.currentUser.user,
                action: `Excluiu cartão ${numero}`
            });
            localStorage.setItem('logs', JSON.stringify(state.logs));
        } catch (error) {
            console.error('Erro ao excluir cartão:', error.message);
            this.showNotification('Erro ao excluir cartão.');
        }
    },

    showNotification(message) {
        const notifications = document.getElementById('notifications');
        if (!notifications) return;
        const notification = document.createElement('div');
        notification.className = 'bg-blue-600 text-white p-2 rounded';
        notification.textContent = message;
        notifications.appendChild(notification);
        setTimeout(() => notification.remove(), CONFIG.NOTIFICATION_TIMEOUT);
    },

    showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm && registerForm) {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        }
    },

    showRegisterForm() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        if (loginForm && registerForm) {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
    },

    toggleTheme() {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.body.classList.toggle('light', state.theme === 'light');
        localStorage.setItem('theme', state.theme);
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.textContent = state.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
    }
};

// === Funções Globais ===
async function showCardDetails(cardNumber) {
    const card = state.cards.find(c => c.numero === cardNumber) || state.userCards.find(c => c.numero === cardNumber);
    if (!card) return;

    const cardDetailsContent = document.getElementById('cardDetailsContent');
    if (cardDetailsContent) {
        cardDetailsContent.innerHTML = `
            <p><strong>Número:</strong> ${card.numero}</p>
            <p><strong>CVV:</strong> ${card.cvv}</p>
            <p><strong>Validade:</strong> ${card.validade}</p>
            <p><strong>Nome:</strong> ${card.nome}</p>
            <p><strong>CPF:</strong> ${card.cpf}</p>
            <p><strong>Bandeira:</strong> ${card.bandeira}</p>
            <p><strong>Banco:</strong> ${card.banco}</p>
            <p><strong>País:</strong> ${card.pais}</p>
            <p><strong>BIN:</strong> ${card.bin}</p>
            <p><strong>Nível:</strong> ${card.nivel}</p>
        `;
        document.getElementById('cardDetailsModal').style.display = 'flex';
    }
}

function closeCardDetailsModal() {
    const cardDetailsModal = document.getElementById('cardDetailsModal');
    if (cardDetailsModal) cardDetailsModal.style.display = 'none';
}

function openConfirmPurchaseModal(cardNumber) {
    const card = state.cards.find(c => c.numero === cardNumber);
    if (!card) return;

    const price = 10.00; // Preço fixo
    const confirmTotalAmount = document.getElementById('confirmTotalAmount');
    const confirmUserBalance = document.getElementById('confirmUserBalance');
    const confirmCardDetails = document.getElementById('confirmCardDetails');
    const confirmPurchaseModal = document.getElementById('confirmPurchaseModal');

    if (confirmTotalAmount && confirmUserBalance && confirmCardDetails && confirmPurchaseModal) {
        confirmTotalAmount.textContent = price.toFixed(2);
        confirmUserBalance.textContent = parseFloat(state.currentUser.saldo).toFixed(2);
        confirmCardDetails.innerHTML = `
            <p><strong>Número:</strong> ${card.numero}</p>
            <p><strong>Bandeira:</strong> ${card.bandeira}</p>
            <p><strong>Banco:</strong> ${card.banco}</p>
            <p><strong>Nível:</strong> ${card.nivel}</p>
        `;
        confirmPurchaseModal.dataset.cardNumber = cardNumber;
        confirmPurchaseModal.style.display = 'flex';
    }
}

function closeConfirmPurchaseModal() {
    const confirmPurchaseModal = document.getElementById('confirmPurchaseModal');
    if (confirmPurchaseModal) confirmPurchaseModal.style.display = 'none';
}

async function confirmPurchase() {
    const cardNumber = document.getElementById('confirmPurchaseModal').dataset.cardNumber;
    const card = state.cards.find(c => c.numero === cardNumber);
    const price = 10.00;

    if (parseFloat(state.currentUser.saldo) < price) {
        ui.showNotification('Saldo insuficiente para realizar a compra.');
        return;
    }

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=purchaseCard&user=${encodeURIComponent(state.currentUser.user)}&cardNumber=${encodeURIComponent(cardNumber)}&price=${price}`
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();

        if (result.success) {
            state.currentUser.saldo = parseFloat(state.currentUser.saldo) - price;
            localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
            state.cards = state.cards.filter(c => c.numero !== cardNumber);
            state.userCards.push(card);
            const userBalance = document.getElementById('userBalance');
            const userBalanceAccount = document.getElementById('userBalanceAccount');
            if (userBalance) userBalance.textContent = parseFloat(state.currentUser.saldo).toFixed(2);
            if (userBalanceAccount) userBalanceAccount.textContent = parseFloat(state.currentUser.saldo).toFixed(2);
            closeConfirmPurchaseModal();
            ui.showNotification('Compra realizada com sucesso!');
            ui.displayCards();
            state.logs.push({
                timestamp: new Date().toISOString(),
                user: state.currentUser.user,
                action: `Comprou cartão ${cardNumber}`
            });
            localStorage.setItem('logs', JSON.stringify(state.logs));
        } else {
            ui.showNotification(result.message || 'Erro ao realizar a compra.');
        }
    } catch (error) {
        console.error('Erro ao realizar compra:', error.message);
        ui.showNotification('Erro ao realizar a compra.');
    }
}

// === Inicialização ===
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html')) {
        if (checkLogin()) {
            window.location.href = state.isAdmin ? 'dashboard.html' : 'shop.html';
        }
        return;
    }

    if (!checkLogin()) return;

    ui.initializeData();
    ui.updateNavbarVisibility();

    if (window.location.pathname.includes('dashboard.html')) {
        if (!state.isAdmin) {
            window.location.href = 'shop.html';
            return;
        }
        ui.displayUsers();
        ui.displayAdminCards();
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
    }

    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon && !state.isAdmin) {
        cartIcon.style.display = 'none';
    }
});
