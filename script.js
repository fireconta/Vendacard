const CONFIG = {
    SESSION_TIMEOUT_MINUTES: 30,
    ADMIN_CLICKS: 6,
    MIN_PASSWORD_LENGTH: 6,
    MAX_LOGIN_ATTEMPTS: 3,
    LOGIN_BLOCK_TIME: 60000 // 1 minuto em milissegundos
};

// Variáveis globais
let cartTotal = 0;
let cartItems = [];
let selectedBrand = 'Nenhuma';
let clickCount = 0;
let currentUser = null;
let debounceTimeout;
let loginAttempts = 0;
let loginBlockedUntil = 0;

// Cache de dados
let usersCache = JSON.parse(localStorage.getItem('users')) || [];
let cardsCache = JSON.parse(localStorage.getItem('cards')) || [];
let pixDetailsCache = JSON.parse(localStorage.getItem('pixDetails')) || { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" };

/**
 * Salva o cache de usuários no localStorage.
 */
function saveUsersCache() {
    localStorage.setItem('users', JSON.stringify(usersCache));
}

/**
 * Salva o cache de cartões no localStorage.
 */
function saveCardsCache() {
    localStorage.setItem('cards', JSON.stringify(cardsCache));
}

/**
 * Salva o cache de detalhes do Pix no localStorage.
 */
function savePixDetailsCache() {
    localStorage.setItem('pixDetails', JSON.stringify(pixDetailsCache));
}

/**
 * Gera um ID único de 6 dígitos para usuários.
 * @param {Array} users - Lista de usuários.
 * @returns {string} - ID gerado.
 */
function generateUniqueId(users) {
    let id;
    do {
        id = Math.floor(100000 + Math.random() * 900000).toString();
    } while (users.some(u => u.id === id));
    return id;
}

/**
 * Sanitiza uma string para prevenir ataques XSS.
 * @param {string} str - String a ser sanitizada.
 * @returns {string} - String sanitizada.
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Valida os campos de login em tempo real.
 */
function validateLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    let isValid = true;

    if (!username) {
        usernameError.textContent = 'Usuário é obrigatório.';
        document.querySelector('#username').parentElement.classList.add('invalid');
        isValid = false;
    } else {
        usernameError.textContent = '';
        document.querySelector('#username').parentElement.classList.remove('invalid');
    }

    if (!password) {
        passwordError.textContent = 'Senha é obrigatória.';
        document.querySelector('#password').parentElement.classList.add('invalid');
        isValid = false;
    } else if (password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        passwordError.textContent = `Senha deve ter no mínimo ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
        document.querySelector('#password').parentElement.classList.add('invalid');
        isValid = false;
    } else {
        passwordError.textContent = '';
        document.querySelector('#password').parentElement.classList.remove('invalid');
    }

    return isValid;
}

/**
 * Realiza o login do usuário, verificando credenciais e iniciando a sessão.
 */
function login() {
    if (Date.now() < loginBlockedUntil) {
        const timeLeft = Math.ceil((loginBlockedUntil - Date.now()) / 1000);
        document.getElementById('loginAttempts').textContent = `Aguarde ${timeLeft} segundos antes de tentar novamente.`;
        return;
    }

    if (!validateLogin()) return;

    const loginButton = document.getElementById('loginButton');
    const loginLoader = document.getElementById('loginLoader');
    loginButton.style.display = 'none';
    loginLoader.style.display = 'block';

    const username = sanitizeHTML(document.getElementById('username').value);
    const password = document.getElementById('password').value;
    const hashedPassword = CryptoJS.SHA256(password).toString();
    console.log('Senha digitada:', password);
    console.log('Hash gerado:', hashedPassword);

    const user = usersCache.find(u => u.username === username);
    if (user) {
        console.log('Usuário encontrado:', user.username);
        console.log('Hash armazenado:', user.password);
    }

    const matchedUser = usersCache.find(u => u.username === username && u.password === hashedPassword);

    setTimeout(() => {
        if (matchedUser) {
            loginAttempts = 0;
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('currentUser', username);
            localStorage.setItem('loginTime', Date.now());
            currentUser = matchedUser;
            alert(`Bem-vindo, ${username}!`);
            window.location.href = 'index.html'; // Redireciona para carregar accountInfo
        } else {
            loginAttempts++;
            document.getElementById('loginAttempts').textContent = `Tentativa ${loginAttempts} de ${CONFIG.MAX_LOGIN_ATTEMPTS}.`;
            if (loginAttempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                loginBlockedUntil = Date.now() + CONFIG.LOGIN_BLOCK_TIME;
                document.getElementById('loginAttempts').textContent = 'Limite de tentativas atingido. Tente novamente em 1 minuto.';
                loginButton.disabled = true;
                setTimeout(() => {
                    loginAttempts = 0;
                    loginBlockedUntil = 0;
                    loginButton.disabled = false;
                    document.getElementById('loginAttempts').textContent = '';
                }, CONFIG.LOGIN_BLOCK_TIME);
            } else {
                alert("Usuário ou senha inválidos!");
            }
        }
        loginButton.style.display = 'block';
        loginLoader.style.display = 'none';
    }, 1000); // Simula delay de autenticação
}

/**
 * Registra um novo usuário, criptografando a senha e gerando um ID único.
 */
function register() {
    const username = sanitizeHTML(document.getElementById('newUsername').value);
    const password = document.getElementById('newPassword').value;
    const newUsernameError = document.getElementById('newUsernameError');
    const newPasswordError = document.getElementById('newPasswordError');

    if (!username) {
        newUsernameError.textContent = 'Usuário é obrigatório.';
        return;
    } else if (usersCache.find(u => u.username === username)) {
        newUsernameError.textContent = 'Usuário já existe.';
        return;
    } else {
        newUsernameError.textContent = '';
    }

    if (!password || password.length < CONFIG.MIN_PASSWORD_LENGTH) {
        newPasswordError.textContent = `Senha deve ter no mínimo ${CONFIG.MIN_PASSWORD_LENGTH} caracteres.`;
        return;
    } else {
        newPasswordError.textContent = '';
    }

    const newId = generateUniqueId(usersCache);
    const hashedPassword = CryptoJS.SHA256(password).toString();
    usersCache.push({ username, password: hashedPassword, id: newId, balance: 0, purchases: [] });
    saveUsersCache();
    alert("Usuário registrado com sucesso!");
    showLoginForm();
}

/**
 * Exibe o formulário de registro e oculta o de login.
 */
function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

/**
 * Exibe o formulário de login e oculta o de registro.
 */
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

/**
 * Lógica básica para "Esqueceu a Senha?" (placeholder por enquanto).
 */
function forgotPassword() {
    alert("Funcionalidade em desenvolvimento. Entre em contato com o suporte.");
}

/**
 * Realiza o logout do usuário, limpando a sessão e os dados do carrinho.
 */
function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    cartTotal = 0;
    cartItems = [];
    currentUser = null;
    window.location.href = 'index.html';
}

/**
 * Verifica se a sessão expirou com base no tempo de login.
 */
function checkSession() {
    const loginTime = localStorage.getItem('loginTime');
    if (loginTime) {
        const currentTime = Date.now();
        const timeDiff = (currentTime - loginTime) / 1000 / 60;
        if (timeDiff > CONFIG.SESSION_TIMEOUT_MINUTES) {
            logout();
            alert("Sessão expirada. Por favor, faça login novamente.");
        }
    }
}

/**
 * Exibe as informações da conta do usuário após o login.
 */
function showAccountInfo() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('accountInfo').style.display = 'block';
    document.getElementById('pageTitle').textContent = 'Ver Conta';
    document.getElementById('accountLink').classList.add('active');
    document.getElementById('storeLink').classList.remove('active');

    const user = usersCache.find(u => u.username === localStorage.getItem('currentUser'));
    currentUser = user;
    document.getElementById('userName').textContent = sanitizeHTML(user.username);
    document.getElementById('userId').textContent = sanitizeHTML(user.id);
    document.getElementById('userBalanceAccount').textContent = user.balance.toFixed(2).replace('.', ',');
    const purchaseHistory = document.getElementById('purchaseHistory');
    purchaseHistory.innerHTML = '';
    user.purchases.forEach(purchase => {
        const purchaseDiv = document.createElement('div');
        purchaseDiv.className = 'card-item';
        let itemsList = purchase.items.map(item => `<p>${sanitizeHTML(item.name.substring(0, 6))} **** **** **** - R$ ${item.price.toFixed(2).replace('.', ',')}</p>`).join('');
        purchaseDiv.innerHTML = `
            <h2>Compra em ${sanitizeHTML(purchase.date)}</h2>
            ${itemsList}
            <div class="price">Total: R$ ${purchase.total.toFixed(2).replace('.', ',')}</div>
        `;
        purchaseHistory.appendChild(purchaseDiv);
    });

    document.getElementById('accountLink').addEventListener('click', function(e) {
        clickCount++;
        if (clickCount === CONFIG.ADMIN_CLICKS) {
            clickCount = 0;
            window.location.href = 'dashboard.html';
        }
    });
}

/**
 * Carrega os cartões disponíveis para venda na página da loja, aplicando filtros.
 */
function loadCards() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    filterCards();
    loadCart();
}

/**
 * Filtra e exibe os cartões com base na bandeira e tipo selecionados.
 */
function filterCards() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        const brandFilter = document.getElementById('brandFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const cardList = document.getElementById('cardList');
        cardList.innerHTML = '';
        cardsCache.forEach(card => {
            if (card.stock > 0) {
                const matchesBrand = brandFilter === 'all' || card.brand === brandFilter;
                const matchesType = typeFilter === 'all' || card.type === typeFilter;
                if (matchesBrand && matchesType) {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'card-item';
                    const bin = card.number.substring(0, 6);
                    cardDiv.innerHTML = `
                        <h2>${sanitizeHTML(bin)} **** **** ****</h2>
                        <p>${sanitizeHTML(card.brand)} - Banco do Brasil S.A.</p>
                        <p>Brasil</p>
                        <div class="price">R$ ${card.price.toFixed(2).replace('.', ',')}</div>
                        <div class="buttons">
                            <button onclick="addToCart('${card.number}', ${card.price})">${sanitizeHTML(card.type)}</button>
                            <button onclick="buyCard('${card.number}')">Comprar</button>
                        </div>
                    `;
                    cardList.appendChild(cardDiv);
                }
            }
        });
    }, 300);
}

/**
 * Adiciona um cartão ao carrinho e atualiza a interface.
 * @param {string} cardNumber - Número do cartão.
 * @param {number} price - Preço do cartão.
 */
function addToCart(cardNumber, price) {
    cartTotal += price;
    cartItems.push({ name: cardNumber, price });
    updateTotal();
    loadCart();
    alert(`${cardNumber.substring(0, 6)} **** **** **** adicionado ao carrinho!`);
    document.getElementById('cartContainer').classList.add('active');
    const cardElements = document.querySelectorAll('.card-item');
    cardElements.forEach(card => {
        if (card.querySelector('h2').textContent.includes(cardNumber.substring(0, 6))) {
            card.classList.add('added');
        }
    });
}

/**
 * Compra um cartão diretamente, deduzindo o saldo do usuário.
 * @param {string} cardNumber - Número do cartão a ser comprado.
 */
function buyCard(cardNumber) {
    const card = cardsCache.find(c => c.number === cardNumber);
    const user = usersCache.find(u => u.username === localStorage.getItem('currentUser'));
    if (user.balance < card.price) {
        const missingAmount = (card.price - user.balance).toFixed(2).replace('.', ',');
        alert(`Saldo insuficiente! Faltam R$ ${missingAmount} para completar a compra. Adicione mais saldo via Pix.`);
        return;
    }
    card.stock -= 1;
    if (card.stock < 0) card.stock = 0;
    user.balance -= card.price;
    user.purchases.push({ date: new Date().toLocaleString(), items: [{ name: card.number, price: card.price }], total: card.price });
    saveUsersCache();
    saveCardsCache();
    alert(`Cartão ${card.number.substring(0, 6)} **** **** **** comprado com sucesso!`);
    loadCards();
    updateBalanceDisplay();
    cartItems = cartItems.filter(item => item.name !== cardNumber);
    loadCart();
}

/**
 * Atualiza o total do carrinho e o saldo exibido na interface.
 */
function updateTotal() {
    const totalElement = document.getElementById('cartTotal');
    const cartTotalElement = document.getElementById('cartTotalAmount');
    if (totalElement && currentUser) {
        totalElement.textContent = `Saldo R$ ${currentUser.balance.toFixed(2).replace('.', ',')}`;
    }
    if (cartTotalElement) {
        cartTotalElement.textContent = cartTotal.toFixed(2).replace('.', ',');
    }
}

/**
 * Carrega os itens do carrinho na interface.
 */
function loadCart() {
    const cartList = document.getElementById('cartList');
    const cartContainer = document.getElementById('cartContainer');
    if (!cartList || !cartContainer) return;
    cartList.innerHTML = '';
    if (cartItems.length > 0) {
        cartContainer.classList.add('active');
        cartItems.forEach(item => {
            const card = cardsCache.find(c => c.number === item.name);
            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'card-item';
            const bin = item.name.substring(0, 6);
            cartItemDiv.innerHTML = `
                <h2>${sanitizeHTML(bin)} **** **** ****</h2>
                <p>${sanitizeHTML(card.brand)} - Banco do Brasil S.A.</p>
                <p>Brasil</p>
                <div class="price">R$ ${item.price.toFixed(2).replace('.', ',')}</div>
                <div class="buttons">
                    <button onclick="removeFromCart('${item.name}')">Remover</button>
                    <button onclick="buyCard('${item.name}')">Comprar</button>
                </div>
            `;
            cartList.appendChild(cartItemDiv);
        });
    } else {
        cartContainer.classList.remove('active');
    }
    updateTotal();
    loadPixDetails();
    updateBalanceDisplay();
}

/**
 * Remove um item do carrinho.
 * @param {string} cardNumber - Número do cartão a ser removido.
 */
function removeFromCart(cardNumber) {
    const itemIndex = cartItems.findIndex(item => item.name === cardNumber);
    if (itemIndex !== -1) {
        cartTotal -= cartItems[itemIndex].price;
        cartItems.splice(itemIndex, 1);
        loadCart();
        updateTotal();
        alert(`Cartão ${cardNumber.substring(0, 6)} **** **** **** removido do carrinho!`);
    }
}

/**
 * Finaliza a compra de todos os itens no carrinho.
 */
function finalizePurchase() {
    if (cartItems.length === 0) {
        alert("Carrinho vazio!");
        return;
    }
    if (!confirm("Tem certeza que deseja finalizar a compra?")) {
        return;
    }
    const user = usersCache.find(u => u.username === localStorage.getItem('currentUser'));
    if (user.balance < cartTotal) {
        const missingAmount = (cartTotal - user.balance).toFixed(2).replace('.', ',');
        alert(`Saldo insuficiente! Faltam R$ ${missingAmount} para completar a compra. Adicione mais saldo via Pix.`);
        return;
    }
    cartItems.forEach(item => {
        const card = cardsCache.find(c => c.number === item.name);
        if (card) {
            card.stock -= 1;
            if (card.stock < 0) card.stock = 0;
        }
    });
    user.balance -= cartTotal;
    user.purchases.push({ date: new Date().toLocaleString(), items: [...cartItems], total: cartTotal });
    saveUsersCache();
    saveCardsCache();
    alert("Compra finalizada com sucesso!");
    cartTotal = 0;
    cartItems = [];
    loadCart();
    updateBalanceDisplay();
}

/**
 * Exibe o formulário para adicionar saldo via Pix.
 */
function showAddBalanceForm() {
    document.getElementById('pixPayment').style.display = 'block';
}

/**
 * Copia a chave Pix para a área de transferência.
 */
function copyPixKey() {
    const pixKey = document.getElementById('pixKey').textContent;
    navigator.clipboard.writeText(pixKey).then(() => {
        alert("Chave Pix copiada!");
    });
}

/**
 * Adiciona saldo à conta do usuário.
 */
function addBalance() {
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    if (isNaN(amount) || amount <= 0) {
        alert("Insira um valor válido!");
        return;
    }
    const user = usersCache.find(u => u.username === localStorage.getItem('currentUser'));
    user.balance += amount;
    saveUsersCache();
    updateBalanceDisplay();
    document.getElementById('pixPayment').style.display = 'none';
    alert(`Saldo de R$ ${amount.toFixed(2).replace('.', ',')} adicionado com sucesso!`);
}

/**
 * Atualiza a exibição do saldo do usuário na interface.
 */
function updateBalanceDisplay() {
    if (!currentUser) return;
    currentUser = usersCache.find(u => u.username === localStorage.getItem('currentUser'));
    const balanceElements = document.querySelectorAll('#userBalance, #userBalanceAccount');
    balanceElements.forEach(element => {
        if (element) element.textContent = currentUser.balance.toFixed(2).replace('.', ',');
    });
    updateTotal();
}

/**
 * Carrega os cartões no painel admin para gerenciamento.
 */
function loadAdminCards() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    const cardList = document.getElementById('productList');
    cardList.innerHTML = '';
    cardsCache.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        cardDiv.innerHTML = `
            <h2>${sanitizeHTML(card.number)}</h2>
            <div class="card-info">
                <span>CVV: ${sanitizeHTML(card.cvv)}</span>
                <span>Validade: ${sanitizeHTML(card.expiry)}</span>
                <span>Bandeira: ${sanitizeHTML(card.brand)}</span>
                <span>Tipo: ${sanitizeHTML(card.type)}</span>
            </div>
            <div class="price">R$ ${card.price.toFixed(2).replace('.', ',')}</div>
            <p>Estoque: ${card.stock}</p>
            <div class="buttons">
                <button class="edit" onclick="editCard('${card.id}')">Editar</button>
                <button class="delete" onclick="deleteCard('${card.id}')">Deletar</button>
            </div>
        `;
        cardList.appendChild(cardDiv);
    });
}

/**
 * Adiciona um novo cartão ao estoque com validação de dados.
 */
function addCard() {
    const id = document.getElementById('cardId').value;
    const number = document.getElementById('cardNumber').value;
    const cvv = document.getElementById('cardCVV').value;
    const expiry = document.getElementById('cardExpiry').value;
    const type = document.getElementById('cardType').value;
    const price = parseFloat(document.getElementById('cardPrice').value);
    const stock = parseInt(document.getElementById('cardStock').value);

    // Validações
    if (!id || id.length < 1) {
        alert("O ID do cartão é obrigatório!");
        return;
    }
    if (!/^\d{16}$/.test(number)) {
        alert("O número do cartão deve ter exatamente 16 dígitos!");
        return;
    }
    if (!/^\d{3}$/.test(cvv)) {
        alert("O CVV deve ter exatamente 3 dígitos!");
        return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
        alert("A validade deve estar no formato MM/AA!");
        return;
    }
    if (isNaN(price) || price <= 0) {
        alert("O preço deve ser um valor positivo!");
        return;
    }
    if (isNaN(stock) || stock < 0) {
        alert("O estoque deve ser um número não negativo!");
        return;
    }
    if (selectedBrand === 'Nenhuma') {
        alert("Selecione uma bandeira para o cartão!");
        return;
    }

    if (cardsCache.find(c => c.id === id)) {
        alert("ID já existe!");
        return;
    }
    cardsCache.push({ id, number, cvv, expiry, brand: selectedBrand, type, price, stock });
    saveCardsCache();
    alert("Cartão adicionado com sucesso!");
    loadAdminCards();
    document.getElementById('cardId').value = '';
    document.getElementById('cardNumber').value = '';
    document.getElementById('cardCVV').value = '';
    document.getElementById('cardExpiry').value = '';
    document.getElementById('cardPrice').value = '';
    document.getElementById('cardStock').value = '';
    selectedBrand = 'Nenhuma';
    document.getElementById('selectedBrand').textContent = selectedBrand;
}

/**
 * Edita os dados de um cartão existente.
 * @param {string} id - ID do cartão a ser editado.
 */
function editCard(id) {
    const card = cardsCache.find(c => c.id === id);
    const newNumber = prompt("Novo número:", card.number);
    if (!/^\d{16}$/.test(newNumber)) {
        alert("O número do cartão deve ter exatamente 16 dígitos!");
        return;
    }
    const newCVV = prompt("Novo CVV:", card.cvv);
    if (!/^\d{3}$/.test(newCVV)) {
        alert("O CVV deve ter exatamente 3 dígitos!");
        return;
    }
    const newExpiry = prompt("Nova validade (MM/AA):", card.expiry);
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(newExpiry)) {
        alert("A validade deve estar no formato MM/AA!");
        return;
    }
    const newBrand = prompt("Nova bandeira:", card.brand);
    const newType = prompt("Novo tipo (Crédito/Débito):", card.type);
    const newPrice = parseFloat(prompt("Novo preço:", card.price));
    if (isNaN(newPrice) || newPrice <= 0) {
        alert("O preço deve ser um valor positivo!");
        return;
    }
    const newStock = parseInt(prompt("Novo estoque:", card.stock));
    if (isNaN(newStock) || newStock < 0) {
        alert("O estoque deve ser um número não negativo!");
        return;
    }
    card.number = newNumber;
    card.cvv = newCVV;
    card.expiry = newExpiry;
    card.brand = newBrand;
    card.type = newType;
    card.price = newPrice;
    card.stock = newStock;
    saveCardsCache();
    loadAdminCards();
}

/**
 * Deleta um cartão do estoque.
 * @param {string} id - ID do cartão a ser deletado.
 */
function deleteCard(id) {
    if (!confirm("Tem certeza que deseja deletar este cartão?")) {
        return;
    }
    cardsCache = cardsCache.filter(c => c.id !== id);
    saveCardsCache();
    loadAdminCards();
}

/**
 * Seleciona a bandeira do cartão no formulário de adição.
 * @param {string} brand - Bandeira selecionada (Visa, Mastercard, Amex).
 */
function selectBrand(brand) {
    selectedBrand = brand;
    document.getElementById('selectedBrand').textContent = selectedBrand;
}

/**
 * Filtra e exibe usuários no painel admin com base na pesquisa.
 */
function searchUsers() {
    const searchTerm = document.getElementById('searchUser').value.toLowerCase();
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    usersCache.forEach(user => {
        if (user.username.toLowerCase().includes(searchTerm) || user.id.includes(searchTerm)) {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.innerHTML = `
                <h2>${sanitizeHTML(user.username)}</h2>
                <p>ID: ${sanitizeHTML(user.id)}</p>
                <p>Saldo: R$ ${user.balance.toFixed(2).replace('.', ',')}</p>
                <div class="buttons">
                    <button class="edit-balance" onclick="editUserBalance('${user.id}')">Editar Saldo</button>
                </div>
            `;
            userList.appendChild(userDiv);
        }
    });
}

/**
 * Edita o saldo de um usuário no painel admin.
 * @param {string} userId - ID do usuário a ter o saldo editado.
 */
function editUserBalance(userId) {
    const newBalance = parseFloat(prompt("Novo saldo (R$):"));
    if (isNaN(newBalance) || newBalance < 0) {
        alert("Insira um valor válido!");
        return;
    }
    const user = usersCache.find(u => u.id === userId);
    user.balance = newBalance;
    saveUsersCache();
    alert(`Saldo de ${sanitizeHTML(user.username)} atualizado para R$ ${newBalance.toFixed(2).replace('.', ',')}!`);
    searchUsers();
}

/**
 * Carrega os detalhes do Pix na interface.
 */
function loadPixDetails() {
    const pixKeyElement = document.getElementById('pixKey');
    const pixQRCodeElement = document.getElementById('pixQRCode');
    if (pixKeyElement && pixQRCodeElement) {
        pixKeyElement.textContent = pixDetailsCache.key;
        pixQRCodeElement.src = pixDetailsCache.qrCode;
    }
}

/**
 * Atualiza os detalhes do Pix no cache.
 */
function updatePixDetails() {
    const key = document.getElementById('pixKeyInput').value;
    const qrCode = document.getElementById('pixQRCodeInput').value;
    pixDetailsCache = { key, qrCode };
    savePixDetailsCache();
    alert("Detalhes do Pix atualizados!");
}

/**
 * Alterna entre os modos claro e escuro, salvando a preferência.
 */
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    if (body.classList.contains('light')) {
        body.classList.remove('light');
        themeToggle.textContent = 'Modo Claro';
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.add('light');
        themeToggle.textContent = 'Modo Escuro';
        localStorage.setItem('theme', 'light');
    }
}

// Inicializa dados no localStorage
(function initializeData() {
    // Forçar a reinicialização do usuário padrão para corrigir o problema
    localStorage.removeItem('users'); // Limpa usuários existentes para evitar conflitos
    if (!localStorage.getItem('users')) {
        const newId = generateUniqueId([]);
        const defaultPassword = "123456";
        const hashedPassword = CryptoJS.SHA256(defaultPassword).toString();
        console.log('Inicializando usuário padrão LVz...');
        console.log('Senha padrão:', defaultPassword);
        console.log('Hash gerado para LVz:', hashedPassword);
        usersCache = [{ username: "LVz", password: hashedPassword, id: newId, balance: 0, purchases: [] }];
        saveUsersCache();
        console.log('Usuário padrão criado:', usersCache);
    }
    if (!localStorage.getItem('cards')) {
        cardsCache = [
            { id: "1", number: "1234567890123456", cvv: "123", expiry: "12/25", brand: "Visa", type: "Crédito", price: 10.00, stock: 10 },
            { id: "2", number: "9876543210987654", cvv: "456", expiry: "06/26", brand: "Mastercard", type: "Débito", price: 15.00, stock: 5 }
        ];
        saveCardsCache();
    }
    if (!localStorage.getItem('pixDetails')) {
        pixDetailsCache = { key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" };
        savePixDetailsCache();
    }
})();

// Carrega tema e verifica autenticação
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light');
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.textContent = 'Modo Escuro';
    }

    // Pré-preenche os campos de login com "LVz" e "123456"
    if (window.location.pathname.includes('index.html')) {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (usernameInput && passwordInput) {
            usernameInput.value = "LVz";
            passwordInput.value = "123456";
            console.log('Campos de login preenchidos com usuário padrão LVz e senha 123456.');
        }
    }

    // Adiciona validação em tempo real
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput && passwordInput) {
        usernameInput.addEventListener('input', validateLogin);
        passwordInput.addEventListener('input', validateLogin);
    }

    // Verifica autenticação em todas as páginas
    if (!window.location.pathname.includes('index.html') && !localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }

    if (window.location.pathname.includes('index.html')) {
        if (localStorage.getItem('loggedIn')) {
            currentUser = usersCache.find(u => u.username === localStorage.getItem('currentUser'));
            if (currentUser) {
                showAccountInfo();
                console.log('User logged in, showing account info.');
            } else {
                localStorage.removeItem('loggedIn');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('loginTime');
                document.getElementById('loginForm').style.display = 'block';
                console.log('Invalid session, showing login form.');
            }
        } else {
            document.getElementById('loginForm').style.display = 'block';
            console.log('No session, showing login form.');
        }
    } else if (window.location.pathname.includes('shop.html')) {
        if (localStorage.getItem('loggedIn')) {
            loadCards();
            console.log('Shop page loaded.');
        } else {
            window.location.href = 'index.html';
        }
    } else if (window.location.pathname.includes('dashboard.html')) {
        if (localStorage.getItem('loggedIn')) {
            loadAdminCards();
            searchUsers();
            console.log('Dashboard page loaded.');
        } else {
            window.location.href = 'index.html';
        }
    }

    setInterval(checkSession, 60000);
    checkSession();
});
