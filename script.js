let cartTotal = 0;
let cartItems = [];
let selectedBrand = 'Nenhuma';
let clickCount = 0;
let currentUser = null;

// Função para gerar ID único de 6 dígitos
function generateUniqueId(users) {
    let id;
    do {
        id = Math.floor(100000 + Math.random() * 900000).toString();
    } while (users.some(u => u.id === id));
    return id;
}

// Inicializa dados no localStorage
(function initializeData() {
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([{ username: "LVz", password: "LVz", id: generateUniqueId([]), balance: 0, purchases: [] }]));
    }
    if (!localStorage.getItem('cards')) {
        localStorage.setItem('cards', JSON.stringify([
            { id: "1", number: "1234567890123456", cvv: "123", expiry: "12/25", brand: "Visa", type: "Crédito", price: 10.00, stock: 10 },
            { id: "2", number: "9876543210987654", cvv: "456", expiry: "06/26", brand: "Mastercard", type: "Débito", price: 15.00, stock: 5 }
        ]));
    }
    if (!localStorage.getItem('pixDetails')) {
        localStorage.setItem('pixDetails', JSON.stringify({ key: "chave@exemplo.com", qrCode: "https://via.placeholder.com/150" }));
    }
})();

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('currentUser', username);
        currentUser = user;
        showAccountInfo();
    } else {
        alert("Usuário ou senha inválidos!");
    }
}

function register() {
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    if (password.length < 6) {
        alert("A senha deve ter no mínimo 6 caracteres!");
        return;
    }
    let users = JSON.parse(localStorage.getItem('users'));
    if (users.find(u => u.username === username)) {
        alert("Usuário já existe!");
        return;
    }
    const newId = generateUniqueId(users);
    users.push({ username, password, id: newId, balance: 0, purchases: [] });
    localStorage.setItem('users', JSON.stringify(users));
    alert("Usuário registrado com sucesso!");
    showLoginForm();
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('currentUser');
    cartTotal = 0;
    cartItems = [];
    currentUser = null;
    window.location.href = 'index.html';
}

function loadCards() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    const cards = JSON.parse(localStorage.getItem('cards'));
    const cardList = document.getElementById('cardList');
    cardList.innerHTML = '';
    cards.forEach(card => {
        if (card.stock > 0) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-item';
            const bin = card.number.substring(0, 6);
            cardDiv.innerHTML = `
                <h2>${bin} **** **** ****</h2>
                <p>${card.brand} - Banco do Brasil S.A.</p>
                <p>Brasil</p>
                <div class="price">R$ ${card.price.toFixed(2).replace('.', ',')}</div>
                <div class="buttons">
                    <button onclick="addToCart('${card.number}', ${card.price})">${card.type}</button>
                    <button onclick="buyCard('${card.number}')">Comprar</button>
                </div>
            `;
            cardList.appendChild(cardDiv);
        }
    });
    loadCart();
}

function loadAdminCards() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    const cards = JSON.parse(localStorage.getItem('cards'));
    const cardList = document.getElementById('productList');
    cardList.innerHTML = '';
    cards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        cardDiv.innerHTML = `
            <h2>${card.number}</h2>
            <div class="card-info">
                <span>CVV: ${card.cvv}</span>
                <span>Validade: ${card.expiry}</span>
                <span>Bandeira: ${card.brand}</span>
                <span>Tipo: ${card.type}</span>
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

function addToCart(cardNumber, price) {
    cartTotal += price;
    cartItems.push({ name: cardNumber, price });
    updateTotal();
    loadCart();
    alert(`${cardNumber.substring(0, 6)} **** **** **** adicionado ao carrinho!`);
}

function buyCard(cardNumber) {
    const cards = JSON.parse(localStorage.getItem('cards'));
    const card = cards.find(c => c.number === cardNumber);
    let users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === localStorage.getItem('currentUser'));
    if (user.balance < card.price) {
        alert("Saldo insuficiente! Adicione mais saldo via Pix.");
        return;
    }
    card.stock -= 1;
    if (card.stock < 0) card.stock = 0;
    user.balance -= card.price;
    user.purchases.push({ date: new Date().toLocaleString(), items: [{ name: card.number, price: card.price }], total: card.price });
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('cards', JSON.stringify(cards));
    alert(`Cartão ${card.number.substring(0, 6)} **** **** **** comprado com sucesso!`);
    loadCards();
    updateBalanceDisplay();
}

function updateTotal() {
    const totalElement = document.getElementById('cartTotal');
    if (totalElement) {
        totalElement.textContent = `Saldo R$ ${currentUser ? currentUser.balance.toFixed(2).replace('.', ',') : '0,00'}`;
    }
}

function loadCart() {
    const cartList = document.getElementById('cartList');
    if (!cartList) return;
    cartList.innerHTML = '';
    cartItems.forEach(item => {
        const cards = JSON.parse(localStorage.getItem('cards'));
        const card = cards.find(c => c.number === item.name);
        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'card-item';
        const bin = item.name.substring(0, 6);
        cartItemDiv.innerHTML = `
            <h2>${bin} **** **** ****</h2>
            <p>${card.brand} - Banco do Brasil S.A.</p>
            <p>Brasil</p>
            <div class="price">R$ ${item.price.toFixed(2).replace('.', ',')}</div>
            <div class="buttons">
                <button onclick="removeFromCart('${item.name}')">Remover</button>
                <button onclick="buyCard('${item.name}')">Comprar</button>
            </div>
        `;
        cartList.appendChild(cartItemDiv);
    });
    updateTotal();
    loadPixDetails();
    updateBalanceDisplay();
}

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

function loadPixDetails() {
    const pixDetails = JSON.parse(localStorage.getItem('pixDetails'));
    const pixKeyElement = document.getElementById('pixKey');
    const pixQRCodeElement = document.getElementById('pixQRCode');
    if (pixKeyElement && pixQRCodeElement) {
        pixKeyElement.textContent = pixDetails.key;
        pixQRCodeElement.src = pixDetails.qrCode;
    }
}

function updatePixDetails() {
    const key = document.getElementById('pixKeyInput').value;
    const qrCode = document.getElementById('pixQRCodeInput').value;
    localStorage.setItem('pixDetails', JSON.stringify({ key, qrCode }));
    alert("Detalhes do Pix atualizados!");
}

function showAddBalanceForm() {
    document.getElementById('pixPayment').style.display = 'block';
}

function copyPixKey() {
    const pixKey = document.getElementById('pixKey').textContent;
    navigator.clipboard.writeText(pixKey).then(() => {
        alert("Chave Pix copiada!");
    });
}

function addBalance() {
    const amount = parseFloat(document.getElementById('balanceAmount').value);
    if (isNaN(amount) || amount <= 0) {
        alert("Insira um valor válido!");
        return;
    }
    let users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === localStorage.getItem('currentUser'));
    user.balance += amount;
    localStorage.setItem('users', JSON.stringify(users));
    updateBalanceDisplay();
    document.getElementById('pixPayment').style.display = 'none';
    alert(`Saldo de R$ ${amount.toFixed(2).replace('.', ',')} adicionado com sucesso!`);
}

function updateBalanceDisplay() {
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === localStorage.getItem('currentUser'));
    currentUser = user;
    const balanceElements = document.querySelectorAll('#userBalance, #userBalanceAccount');
    balanceElements.forEach(element => {
        if (element) element.textContent = user.balance.toFixed(2).replace('.', ',');
    });
    updateTotal();
}

function finalizePurchase() {
    if (cartItems.length === 0) {
        alert("Carrinho vazio!");
        return;
    }
    let users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === localStorage.getItem('currentUser'));
    if (user.balance < cartTotal) {
        alert("Saldo insuficiente! Adicione mais saldo via Pix.");
        return;
    }
    let cards = JSON.parse(localStorage.getItem('cards'));
    cartItems.forEach(item => {
        const card = cards.find(c => c.number === item.name);
        if (card) {
            card.stock -= 1;
            if (card.stock < 0) card.stock = 0;
        }
    });
    user.balance -= cartTotal;
    user.purchases.push({ date: new Date().toLocaleString(), items: [...cartItems], total: cartTotal });
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('cards', JSON.stringify(cards));
    alert("Compra finalizada com sucesso!");
    cartTotal = 0;
    cartItems = [];
    loadCart();
    updateBalanceDisplay();
}

function addCard() {
    const id = document.getElementById('cardId').value;
    const number = document.getElementById('cardNumber').value;
    const cvv = document.getElementById('cardCVV').value;
    const expiry = document.getElementById('cardExpiry').value;
    const type = document.getElementById('cardType').value;
    const price = parseFloat(document.getElementById('cardPrice').value);
    const stock = parseInt(document.getElementById('cardStock').value);

    let cards = JSON.parse(localStorage.getItem('cards'));
    if (cards.find(c => c.id === id)) {
        alert("ID já existe!");
        return;
    }
    cards.push({ id, number, cvv, expiry, brand: selectedBrand, type, price, stock });
    localStorage.setItem('cards', JSON.stringify(cards));
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

function editCard(id) {
    const cards = JSON.parse(localStorage.getItem('cards'));
    const card = cards.find(c => c.id === id);
    const newNumber = prompt("Novo número:", card.number);
    const newCVV = prompt("Novo CVV:", card.cvv);
    const newExpiry = prompt("Nova validade (MM/AA):", card.expiry);
    const newBrand = prompt("Nova bandeira:", card.brand);
    const newType = prompt("Novo tipo (Crédito/Débito):", card.type);
    const newPrice = parseFloat(prompt("Novo preço:", card.price));
    const newStock = parseInt(prompt("Novo estoque:", card.stock));
    card.number = newNumber;
    card.cvv = newCVV;
    card.expiry = newExpiry;
    card.brand = newBrand;
    card.type = newType;
    card.price = newPrice;
    card.stock = newStock;
    localStorage.setItem('cards', JSON.stringify(cards));
    loadAdminCards();
}

function deleteCard(id) {
    let cards = JSON.parse(localStorage.getItem('cards'));
    cards = cards.filter(c => c.id !== id);
    localStorage.setItem('cards', JSON.stringify(cards));
    loadAdminCards();
}

function selectBrand(brand) {
    selectedBrand = brand;
    document.getElementById('selectedBrand').textContent = selectedBrand;
}

function showAccountInfo() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('accountInfo').style.display = 'block';

    const headerContainer = document.getElementById('headerContainer');
    headerContainer.innerHTML = `
        <div class="header">
            <h1>VER CONTA</h1>
            <div class="total" id="cartTotal">Saldo R$ 0,00</div>
        </div>
    `;

    const navbarContainer = document.getElementById('navbarContainer');
    navbarContainer.innerHTML = `
        <div class="navbar">
            <a href="shop.html">
                <img src="https://img.icons8.com/ios-filled/50/aaaaaa/shop.png" alt="Store">
                Store
            </a>
            <a href="index.html" id="accountLink" class="active">
                <img src="https://img.icons8.com/ios-filled/50/00c4b4/user.png" alt="Conta">
                Ver Conta
            </a>
            <a href="#" onclick="logout()">
                <img src="https://img.icons8.com/ios-filled/50/aaaaaa/logout-rounded.png" alt="Sair">
                Sair
            </a>
        </div>
    `;

    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === localStorage.getItem('currentUser'));
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userId').textContent = user.id;
    document.getElementById('userBalanceAccount').textContent = user.balance.toFixed(2).replace('.', ',');
    const purchaseHistory = document.getElementById('purchaseHistory');
    purchaseHistory.innerHTML = '';
    user.purchases.forEach(purchase => {
        const purchaseDiv = document.createElement('div');
        purchaseDiv.className = 'card-item';
        let itemsList = purchase.items.map(item => `<p>${item.name.substring(0, 6)} **** **** **** - R$ ${item.price.toFixed(2).replace('.', ',')}</p>`).join('');
        purchaseDiv.innerHTML = `
            <h2>Compra em ${purchase.date}</h2>
            ${itemsList}
            <div class="price">Total: R$ ${purchase.total.toFixed(2).replace('.', ',')}</div>
        `;
        purchaseHistory.appendChild(purchaseDiv);
    });

    // Configura o acesso ao painel admin
    if (document.getElementById('accountLink')) {
        document.getElementById('accountLink').addEventListener('click', function(e) {
            clickCount++;
            if (clickCount === 6) {
                clickCount = 0;
                window.location.href = 'dashboard.html';
            }
        });
    }
}

function searchUsers() {
    const searchTerm = document.getElementById('searchUser').value.toLowerCase();
    const users = JSON.parse(localStorage.getItem('users'));
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    users.forEach(user => {
        if (user.username.toLowerCase().includes(searchTerm) || user.id.includes(searchTerm)) {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.innerHTML = `
                <h2>${user.username}</h2>
                <p>ID: ${user.id}</p>
                <p>Saldo: R$ ${user.balance.toFixed(2).replace('.', ',')}</p>
                <div class="buttons">
                    <button class="edit-balance" onclick="editUserBalance('${user.id}')">Editar Saldo</button>
                </div>
            `;
            userList.appendChild(userDiv);
        }
    });
}

function editUserBalance(userId) {
    const newBalance = parseFloat(prompt("Novo saldo (R$):"));
    if (isNaN(newBalance) || newBalance < 0) {
        alert("Insira um valor válido!");
        return;
    }
    let users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.id === userId);
    user.balance = newBalance;
    localStorage.setItem('users', JSON.stringify(users));
    alert(`Saldo de ${user.username} atualizado para R$ ${newBalance.toFixed(2).replace('.', ',')}!`);
    searchUsers();
}

// Carrega dados nas páginas correspondentes
if (window.location.pathname.includes('shop.html')) {
    loadCards();
}
if (window.location.pathname.includes('dashboard.html')) {
    loadAdminCards();
    searchUsers();
}
if (window.location.pathname.includes('index.html') && localStorage.getItem('loggedIn')) {
    const users = JSON.parse(localStorage.getItem('users'));
    currentUser = users.find(u => u.username === localStorage.getItem('currentUser'));
    showAccountInfo();
}
