let cartTotal = 0;
let cartItems = [];
let selectedBrand = 'Nenhuma';
let clickCount = 0;
let currentUser = null;

// Inicializa dados no localStorage
(function initializeData() {
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([{ username: "LVz", password: "LVz", id: "USER1", balance: 0, purchases: [] }]));
    }
    if (!localStorage.getItem('cards')) {
        localStorage.setItem('cards', JSON.stringify([
            { id: "1", number: "1234567890123456", cvv: "123", expiry: "12/25", brand: "Visa", price: 10.00, stock: 10 },
            { id: "2", number: "9876543210987654", cvv: "456", expiry: "06/26", brand: "Mastercard", price: 15.00, stock: 5 }
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
        window.location.href = 'shop.html';
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
    const newId = "USER" + (users.length + 1);
    users.push({ username, password, id: newId, balance: 0, purchases: [] });
    localStorage.setItem('users', JSON.stringify(users));
    alert("Usuário registrado com sucesso!");
    showLoginForm();
}

function showRegisterForm() {
    document.querySelector('.login-container').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLoginForm() {
    document.querySelector('.login-container').style.display = 'block';
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
    const productList = document.getElementById('productList');
    productList.innerHTML = '';
    cards.forEach(card => {
        if (card.stock > 0) {
            const productDiv = document.createElement('div');
            productDiv.className = 'product-item';
            productDiv.innerHTML = `
                <h2>${card.number}</h2>
                <div class="card-info">
                    <span>CVV: ${card.cvv}</span>
                    <span>Validade: ${card.expiry}</span>
                    <span>Bandeira: ${card.brand}</span>
                </div>
                <div class="price">R$ ${card.price.toFixed(2).replace('.', ',')}</div>
                <div class="buttons">
                    <button class="add-to-cart" onclick="addToCart('${card.number}', ${card.price})">Adicionar</button>
                    <button class="details" onclick="showDetails('${card.number}')">Detalhes</button>
                </div>
            `;
            productList.appendChild(productDiv);
        }
    });
}

function loadAdminCards() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    const cards = JSON.parse(localStorage.getItem('cards'));
    const productList = document.getElementById('productList');
    productList.innerHTML = '';
    cards.forEach(card => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item';
        productDiv.innerHTML = `
            <h2>${card.number}</h2>
            <div class="card-info">
                <span>CVV: ${card.cvv}</span>
                <span>Validade: ${card.expiry}</span>
                <span>Bandeira: ${card.brand}</span>
            </div>
            <div class="price">R$ ${card.price.toFixed(2).replace('.', ',')}</div>
            <p>Estoque: ${card.stock}</p>
            <div class="buttons">
                <button class="edit" onclick="editCard('${card.id}')">Editar</button>
                <button class="delete" onclick="deleteCard('${card.id}')">Deletar</button>
            </div>
        `;
        productList.appendChild(productDiv);
    });
}

function addToCart(cardNumber, price) {
    cartTotal += price;
    cartItems.push({ name: cardNumber, price });
    updateTotal();
    alert(`${cardNumber} adicionado ao carrinho!`);
}

function showDetails(cardNumber) {
    const cards = JSON.parse(localStorage.getItem('cards'));
    const card = cards.find(c => c.number === cardNumber);
    alert(`Detalhes do cartão:\nNúmero: ${card.number}\nCVV: ${card.cvv}\nValidade: ${card.expiry}\nBandeira: ${card.brand}`);
}

function updateTotal() {
    const totalElement = document.getElementById('cartTotal');
    if (totalElement) {
        totalElement.textContent = `Total R$ ${cartTotal.toFixed(2).replace('.', ',')}`;
    }
}

function loadCart() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    const cartList = document.getElementById('cartList');
    cartList.innerHTML = '';
    cartItems.forEach(item => {
        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'product-item';
        cartItemDiv.innerHTML = `
            <h2>${item.name}</h2>
            <div class="price">R$ ${item.price.toFixed(2).replace('.', ',')}</div>
        `;
        cartList.appendChild(cartItemDiv);
    });
    updateTotal();
    loadPixDetails();
    updateBalanceDisplay();
}

function loadPixDetails() {
    const pixDetails = JSON.parse(localStorage.getItem('pixDetails'));
    document.getElementById('pixKey').textContent = pixDetails.key;
    document.getElementById('pixQRCode').src = pixDetails.qrCode;
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
    const balanceElements = document.querySelectorAll('#userBalance, #userBalanceAccount');
    balanceElements.forEach(element => {
        element.textContent = user.balance.toFixed(2).replace('.', ',');
    });
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
    const price = parseFloat(document.getElementById('cardPrice').value);
    const stock = parseInt(document.getElementById('cardStock').value);

    let cards = JSON.parse(localStorage.getItem('cards'));
    if (cards.find(c => c.id === id)) {
        alert("ID já existe!");
        return;
    }
    cards.push({ id, number, cvv, expiry, brand: selectedBrand, price, stock });
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
    const newPrice = parseFloat(prompt("Novo preço:", card.price));
    const newStock = parseInt(prompt("Novo estoque:", card.stock));
    card.number = newNumber;
    card.cvv = newCVV;
    card.expiry = newExpiry;
    card.brand = newBrand;
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

function loadAccountInfo() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.username === localStorage.getItem('currentUser'));
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userId').textContent = user.id;
    document.getElementById('userBalanceAccount').textContent = user.balance.toFixed(2).replace('.', ',');
    const purchaseHistory = document.getElementById('purchaseHistory');
    purchaseHistory.innerHTML = '';
    user.purchases.forEach(purchase => {
        const purchaseDiv = document.createElement('div');
        purchaseDiv.className = 'product-item';
        let itemsList = purchase.items.map(item => `<p>${item.name} - R$ ${item.price.toFixed(2).replace('.', ',')}</p>`).join('');
        purchaseDiv.innerHTML = `
            <h2>Compra em ${purchase.date}</h2>
            ${itemsList}
            <div class="price">Total: R$ ${purchase.total.toFixed(2).replace('.', ',')}</div>
        `;
        purchaseHistory.appendChild(purchaseDiv);
    });
}

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

// Carrega dados nas páginas correspondentes
if (document.getElementById('productList') && window.location.pathname.includes('shop.html')) {
    loadCards();
}
if (document.getElementById('productList') && window.location.pathname.includes('dashboard.html')) {
    loadAdminCards();
}
if (document.getElementById('cartList')) {
    loadCart();
}
if (window.location.pathname.includes('account.html')) {
    loadAccountInfo();
}
