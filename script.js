const CONFIG = {
    SESSION_TIMEOUT_MINUTES: 30,
    MIN_PASSWORD_LENGTH: 6,
    MAX_LOGIN_ATTEMPTS: 3,
    LOGIN_BLOCK_TIME: 60000,
    NOTIFICATION_TIMEOUT: 5000,
    LOG_RETENTION_DAYS: 30,
    API_URL: 'https://script.google.com/macros/s/AKfycbzEJ7vsoGOM73X5WgooghEUYxuKkBergWYN4gBrX7zDSp28QTWn0fsBTnJQT52koZQO/exec'
};

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

function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    const sessionStart = parseInt(localStorage.getItem('sessionStart') || '0');
    const sessionTimeout = CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;

    if (!currentUser) return false;

    if (Date.now() - sessionStart > sessionTimeout) {
        auth.logout();
        return false;
    }

    state.currentUser = JSON.parse(currentUser);
    state.isAdmin = state.currentUser.ISADMIN === 'TRUE';
    return true;
}

const auth = {
    async login() {
        console.log('Função de login chamada em ' + new Date().toLocaleString());
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const usernameError = document.getElementById('usernameError');
        const passwordError = document.getElementById('passwordError');

        if (!usernameInput || !passwordInput) {
            console.error('Elementos de entrada não encontrados em ' + new Date().toLocaleString());
            return;
        }

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
            const encodedUsername = encodeURIComponent(username);
            const encodedPassword = encodeURIComponent(password);
            console.log(`Enviando login: user="${username}" (encoded: "${encodedUsername}"), password="${password}" (encoded: "${encodedPassword}") em ${new Date().toLocaleString()}.`);
            const loginUrl = `${CONFIG.API_URL}?action=login&user=${encodedUsername}&password=${encodedPassword}`;
            console.log(`URL de login: ${loginUrl}`);
            const response = await fetch(loginUrl, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
            });
            const responseText = await response.text();
            console.log('Resposta bruta do servidor:', responseText);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const result = JSON.parse(responseText);
            console.log('Resultado parsed:', result);
            if (result.success) {
                state.currentUser = result.user;
                state.isAdmin = result.user.ISADMIN === 'TRUE';
                localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
                localStorage.setItem('sessionStart', Date.now().toString());
                state.loginAttempts = 0;
                console.log('Login bem-sucedido, redirecionando para shop.html em ' + new Date().toLocaleString());
                window.location.href = 'shop.html';
            } else {
                if (passwordError) passwordError.textContent = result.message || 'Usuário ou senha inválidos.';
                state.loginAttempts++;
                if (state.loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                    state.loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
                    alert(`Limite de tentativas atingido. Tente novamente após ${CONFIG.LOGIN_BLOCK_TIME / 1000} segundos.`);
                }
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error.message, 'em ' + new Date().toLocaleString());
            if (passwordError) passwordError.textContent = 'Erro ao conectar ao servidor. Verifique a URL da API e a implantação do script.';
        }
    },

    async register() {
        console.log('Função de registro chamada em ' + new Date().toLocaleString());
        const usernameInput = document.getElementById('newUsername');
        const passwordInput = document.getElementById('newPassword');
        const usernameError = document.getElementById('newUsernameError');
        const passwordError = document.getElementById('newPasswordError');

        if (!usernameInput || !passwordInput) {
            console.error('Elementos de entrada de registro não encontrados.');
            return;
        }

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

        try {
            const registerData = new URLSearchParams({
                action: 'register',
                user: username,
                password: password,
                saldo: '0',
                isadmin: 'FALSE'
            });
            console.log(`Enviando registro: user="${username}", password="${password}" em ${new Date().toLocaleString()}.`);
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: registerData
            });
            const responseText = await response.text();
            console.log('Resposta bruta do servidor:', responseText);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const result = JSON.parse(responseText);
            console.log('Resultado parsed:', result);
            if (result.success) {
                alert('Registro bem-sucedido! Faça login para continuar.');
                ui.showLoginForm();
            } else {
                if (usernameError) usernameError.textContent = result.message || 'Erro ao registrar.';
                if (passwordError) passwordError.textContent = result.message || 'Erro ao registrar.';
            }
        } catch (error) {
            console.error('Erro ao registrar:', error.message);
            if (usernameError) usernameError.textContent = 'Erro ao conectar ao servidor.';
            if (passwordError) passwordError.textContent = 'Erro ao conectar ao servidor.';
        }
    },

    logout() {
        state.currentUser = null;
        state.isAdmin = false;
        state.loginAttempts = 0;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionStart');
        window.location.href = 'index.html';
    }
};

const shop = {
    async loadCards() {
        if (!state.currentUser) {
            alert('Você precisa estar logado para acessar os cartões.');
            window.location.href = 'index.html';
            return;
        }
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=getCards`);
            const cards = await response.json();
            console.log('Cartões carregados:', cards);
            const cardList = document.getElementById('cardList');
            if (cardList) {
                cardList.innerHTML = '';
                cards.forEach(card => {
                    const cardElement = document.createElement('div');
                    cardElement.className = 'card bg-gray-800 p-4 rounded shadow';
                    cardElement.innerHTML = `
                        <p><strong>Número:</strong> ${card.numero}</p>
                        <p><strong>CVV:</strong> ${card.cvv}</p>
                        <p><strong>Validade:</strong> ${card.validade}</p>
                        <p><strong>Nome:</strong> ${card.nome}</p>
                        <p><strong>Preço:</strong> R$ 10.00</p>
                        <button class="buy-button mt-2 bg-green-600 p-2 rounded hover:bg-green-500" data-card-number="${card.numero}" data-price="10.00">Comprar</button>
                    `;
                    cardList.appendChild(cardElement);
                });
                document.querySelectorAll('.buy-button').forEach(button => {
                    button.addEventListener('click', () => {
                        shop.purchaseCard(button.getAttribute('data-card-number'), button.getAttribute('data-price'));
                    });
                });
            }
            if (state.isAdmin) {
                const navbar = document.getElementById('navbar');
                if (navbar) {
                    const adminButton = document.createElement('button');
                    adminButton.textContent = 'Painel Administrador';
                    adminButton.className = 'bg-blue-600 p-2 rounded hover:bg-blue-500 ml-2';
                    adminButton.onclick = () => window.location.href = 'dashboard.html';
                    navbar.querySelector('div').appendChild(adminButton);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar cartões:', error);
        }
    },

    async purchaseCard(cardNumber, price) {
        if (!state.currentUser) {
            alert('Você precisa estar logado para comprar um cartão.');
            window.location.href = 'index.html';
            return;
        }
        try {
            const encodedCardNumber = encodeURIComponent(cardNumber);
            const encodedPrice = encodeURIComponent(price);
            const response = await fetch(`${CONFIG.API_URL}?action=purchaseCard&user=${encodeURIComponent(state.currentUser.user)}&cardNumber=${encodedCardNumber}&price=${encodedPrice}`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                alert('Compra realizada com sucesso!');
                shop.loadCards();
            } else {
                alert(result.message || 'Erro ao comprar o cartão.');
            }
        } catch (error) {
            console.error('Erro ao comprar cartão:', error);
            alert('Erro ao conectar ao servidor.');
        }
    }
};

const admin = {
    async loadUsers() {
        if (!state.isAdmin) {
            alert('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
            window.location.href = 'shop.html';
            return;
        }
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=getUsers`);
            state.users = await response.json();
            ui.displayUsers();
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    },

    async loadAdminCards() {
        if (!state.isAdmin) {
            alert('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
            window.location.href = 'shop.html';
            return;
        }
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=getCards`);
            state.cards = await response.json();
            ui.displayAdminCards();
        } catch (error) {
            console.error('Erro ao carregar cartões:', error);
        }
    },

    async deleteUser(username) {
        if (!state.isAdmin) {
            alert('Acesso negado. Apenas administradores podem excluir usuários.');
            return;
        }
        if (confirm(`Tem certeza que deseja excluir o usuário ${username}?`)) {
            try {
                const response = await fetch(`${CONFIG.API_URL}?action=deleteUser&user=${encodeURIComponent(username)}`, { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                    alert('Usuário excluído com sucesso!');
                    admin.loadUsers();
                } else {
                    alert(result.message || 'Erro ao excluir usuário.');
                }
            } catch (error) {
                console.error('Erro ao excluir usuário:', error);
                alert('Erro ao conectar ao servidor.');
            }
        }
    },

    async deleteCard(cardNumber) {
        if (!state.isAdmin) {
            alert('Acesso negado. Apenas administradores podem excluir cartões.');
            return;
        }
        if (confirm(`Tem certeza que deseja excluir o cartão ${cardNumber}?`)) {
            try {
                const response = await fetch(`${CONFIG.API_URL}?action=deleteCard&cardNumber=${encodeURIComponent(cardNumber)}`, { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                    alert('Cartão excluído com sucesso!');
                    admin.loadAdminCards();
                } else {
                    alert(result.message || 'Erro ao excluir cartão.');
                }
            } catch (error) {
                console.error('Erro ao excluir cartão:', error);
                alert('Erro ao conectar ao servidor.');
            }
        }
    }
};

const ui = {
    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    },

    showRegisterForm() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
    },

    displayUsers(searchTerm = '') {
        const userList = document.getElementById('userList');
        if (userList) {
            userList.innerHTML = '';
            const filteredUsers = state.users.filter(user =>
                user.user.toLowerCase().includes(searchTerm.toLowerCase())
            );
            filteredUsers.forEach(user => {
                const userElement = document.createElement('div');
                userElement.className = 'bg-gray-800 p-4 rounded shadow';
                userElement.innerHTML = `
                    <p><strong>Usuário:</strong> ${user.user}</p>
                    <p><strong>Saldo:</strong> R$ ${user.SALDO.toFixed(2)}</p>
                    <p><strong>Admin:</strong> ${user.ISADMIN ? 'Sim' : 'Não'}</p>
                    <button class="delete-user mt-2 bg-red-600 p-2 rounded hover:bg-red-500" data-user="${user.user}">Excluir</button>
                `;
                userList.appendChild(userElement);
            });
            document.querySelectorAll('.delete-user').forEach(button => {
                button.addEventListener('click', () => {
                    admin.deleteUser(button.getAttribute('data-user'));
                });
            });
        }
    },

    displayAdminCards(searchTerm = '') {
        const cardList = document.getElementById('adminCardList');
        if (cardList) {
            cardList.innerHTML = '';
            const filteredCards = state.cards.filter(card =>
                card.numero.toLowerCase().includes(searchTerm.toLowerCase())
            );
            filteredCards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'bg-gray-800 p-4 rounded shadow';
                cardElement.innerHTML = `
                    <p><strong>Número:</strong> ${card.numero}</p>
                    <p><strong>CVV:</strong> ${card.cvv}</p>
                    <p><strong>Validade:</strong> ${card.validade}</p>
                    <p><strong>Nome:</strong> ${card.nome}</p>
                    <button class="delete-card mt-2 bg-red-600 p-2 rounded hover:bg-red-500" data-card-number="${card.numero}">Excluir</button>
                `;
                cardList.appendChild(cardElement);
            });
            document.querySelectorAll('.delete-card').forEach(button => {
                button.addEventListener('click', () => {
                    admin.deleteCard(button.getAttribute('data-card-number'));
                });
            });
        }
    },

    async addUser() {
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value.trim();
        const balance = document.getElementById('newBalance').value.trim();
        const isAdmin = document.getElementById('isAdmin').value;

        if (!username || !password || !balance) {
            alert('Preencha todos os campos.');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}?action=register&user=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&saldo=${encodeURIComponent(balance)}&isadmin=${encodeURIComponent(isAdmin)}`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                alert('Usuário adicionado com sucesso!');
                document.getElementById('addUserModal').style.display = 'none';
                admin.loadUsers();
            } else {
                alert(result.message || 'Erro ao adicionar usuário.');
            }
        } catch (error) {
            console.error('Erro ao adicionar usuário:', error);
            alert('Erro ao conectar ao servidor.');
        }
    },

    async saveCard() {
        const cardData = {
            numero: document.getElementById('cardNumber').value.trim(),
            cvv: document.getElementById('cardCvv').value.trim(),
            valida: document.getElementById('cardExpiry').value.trim(),
            nome: document.getElementById('cardName').value.trim(),
            cpf: document.getElementById('cardCpf').value.trim(),
            bandeira: document.getElementById('cardBrand').value.trim(),
            banco: document.getElementById('cardBank').value.trim(),
            pais: document.getElementById('cardCountry').value.trim(),
            nivel: document.getElementById('cardLevel').value.trim()
        };

        if (!cardData.numero || !cardData.cvv || !cardData.valida || !cardData.nome || !cardData.cpf || !cardData.bandeira || !cardData.banco || !cardData.pais || !cardData.nivel) {
            alert('Preencha todos os campos.');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}?action=addCard&${new URLSearchParams(cardData).toString()}`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                alert('Cartão adicionado com sucesso!');
                document.getElementById('cardModal').style.display = 'none';
                admin.loadAdminCards();
            } else {
                alert(result.message || 'Erro ao adicionar cartão.');
            }
        } catch (error) {
            console.error('Erro ao salvar cartão:', error);
            alert('Erro ao conectar ao servidor.');
        }
    },

    filterCards() {
        const binFilter = document.getElementById('binFilter').value.toLowerCase();
        const brandFilter = document.getElementById('brandFilter').value.toLowerCase();
        const bankFilter = document.getElementById('bankFilter').value.toLowerCase();
        const levelFilter = document.getElementById('levelFilter').value.toLowerCase();
        const cardList = document.getElementById('cardList');
        if (cardList) {
            cardList.innerHTML = '';
            state.cards.filter(card => {
                return (binFilter === '' || card.bin.toLowerCase().includes(binFilter)) &&
                       (brandFilter === 'all' || card.bandeira.toLowerCase() === brandFilter) &&
                       (bankFilter === 'all' || card.banco.toLowerCase() === bankFilter) &&
                       (levelFilter === 'all' || card.nivel.toLowerCase() === levelFilter);
            }).forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.className = 'card bg-gray-800 p-4 rounded shadow';
                cardElement.innerHTML = `
                    <p><strong>Número:</strong> ${card.numero}</p>
                    <p><strong>CVV:</strong> ${card.cvv}</p>
                    <p><strong>Validade:</strong> ${card.validade}</p>
                    <p><strong>Nome:</strong> ${card.nome}</p>
                    <p><strong>Preço:</strong> R$ 10.00</p>
                    <button class="buy-button mt-2 bg-green-600 p-2 rounded hover:bg-green-500" data-card-number="${card.numero}" data-price="10.00">Comprar</button>
                `;
                cardList.appendChild(cardElement);
            });
            document.querySelectorAll('.buy-button').forEach(button => {
                button.addEventListener('click', () => {
                    shop.purchaseCard(button.getAttribute('data-card-number'), button.getAttribute('data-price'));
                });
            });
        }
    },

    clearFilters() {
        document.getElementById('binFilter').value = '';
        document.getElementById('brandFilter').value = 'all';
        document.getElementById('bankFilter').value = 'all';
        document.getElementById('levelFilter').value = 'all';
        ui.filterCards();
    },

    showAccountInfo() {
        const accountInfo = document.getElementById('accountInfo');
        if (accountInfo) {
            accountInfo.classList.remove('hidden');
            accountInfo.innerHTML = `
                <h2 class="text-2xl font-bold mb-4">Minha Conta</h2>
                <p><strong>Usuário:</strong> <span id="userName">${state.currentUser.user}</span></p>
                <p><strong>Saldo:</strong> <span id="userBalanceAccount">R$ ${state.currentUser.SALDO.toFixed(2)}</span></p>
                <div id="userCards" class="mt-4"></div>
                <button onclick="ui.showAddBalanceForm()" class="mt-4 bg-green-600 p-2 rounded hover:bg-green-500" aria-label="Adicionar saldo">Adicionar Saldo</button>
            `;
            ui.loadUserCards();
        }
    },

    async loadUserCards() {
        if (!state.currentUser) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=getUserCards&user=${encodeURIComponent(state.currentUser.user)}`);
            state.userCards = await response.json();
            const userCardsDiv = document.getElementById('userCards');
            if (userCardsDiv) {
                userCardsDiv.innerHTML = state.userCards.map(card => `
                    <div class="bg-gray-700 p-2 rounded mb-2">
                        <p><strong>Número:</strong> ${card.numero}</p>
                        <p><strong>CVV:</strong> ${card.cvv}</p>
                        <p><strong>Validade:</strong> ${card.validade}</p>
                        <p><strong>Nome:</strong> ${card.nome}</p>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Erro ao carregar cartões do usuário:', error);
        }
    },

    showAddBalanceForm() {
        document.getElementById('rechargeModal').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('rechargeModal').classList.add('hidden');
        document.getElementById('rechargeAmount').value = '';
    },

    async addBalance() {
        const amount = document.getElementById('rechargeAmount').value.trim();
        if (!amount || parseFloat(amount) <= 0) {
            alert('Digite um valor válido para recarga.');
            return;
        }
        try {
            const response = await fetch(`${CONFIG.API_URL}?action=register&user=${encodeURIComponent(state.currentUser.user)}&password=${encodeURIComponent(state.currentUser.password)}&saldo=${encodeURIComponent(amount)}&isadmin=${encodeURIComponent(state.currentUser.ISADMIN)}`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                state.currentUser.SALDO += parseFloat(amount);
                localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
                alert('Saldo adicionado com sucesso!');
                ui.showAccountInfo();
                ui.closeModal();
            } else {
                alert(result.message || 'Erro ao adicionar saldo.');
            }
        } catch (error) {
            console.error('Erro ao adicionar saldo:', error);
            alert('Erro ao conectar ao servidor.');
        }
    },

    toggleTheme() {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.className = state.theme;
        localStorage.setItem('theme', state.theme);
        document.getElementById('themeToggle').textContent = state.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
    }
};

function closeCardDetailsModal() {
    document.getElementById('cardDetailsModal').classList.add('hidden');
}

function closeConfirmPurchaseModal() {
    document.getElementById('confirmPurchaseModal').classList.add('hidden');
}

function confirmPurchase() {
    const modal = document.getElementById('confirmPurchaseModal');
    const cardNumber = modal.getAttribute('data-card-number');
    shop.purchaseCard(cardNumber, '10.00');
    closeConfirmPurchaseModal();
}
