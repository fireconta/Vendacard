let cartTotal = 0;
const SHEET_URL = "https://script.google.com/macros/s/XXX/exec"; // Substitua pela URL da sua aplicação web

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (username === "LVz" && password === "LVz") { // Login padrão
        localStorage.setItem('loggedIn', 'true');
        window.location.href = 'shop.html';
    } else {
        alert("Usuário ou senha inválidos!");
    }
}

function logout() {
    localStorage.removeItem('loggedIn');
    window.location.href = 'index.html';
}

function loadProducts() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    fetch(SHEET_URL)
        .then(response => response.json())
        .then(data => {
            const productList = document.getElementById('productList');
            productList.innerHTML = '';
            data.slice(1).forEach(row => {
                if (row.length < 5) return; // Ignora linhas incompletas
                const [id, name, category, price, stock] = row;
                if (stock > 0) {
                    const productDiv = document.createElement('div');
                    productDiv.className = 'product-item';
                    productDiv.innerHTML = `
                        <h2>${name}</h2>
                        <p>${category}</p>
                        <div class="price">R$ ${parseFloat(price).toFixed(2).replace('.', ',')}</div>
                        <div class="buttons">
                            <button class="add-to-cart" onclick="addToCart('${name}', ${price})">Adicionar</button>
                            <button class="details" onclick="showDetails('${name}')">Detalhes</button>
                        </div>
                    `;
                    productList.appendChild(productDiv);
                }
            });
        })
        .catch(error => console.error('Erro ao carregar produtos:', error));
}

function addToCart(productName, price) {
    cartTotal += price;
    updateTotal();
    alert(`${productName} adicionado ao carrinho!`);
}

function showDetails(productName) {
    alert(`Detalhes do produto: ${productName}`);
}

function updateTotal() {
    const totalElement = document.querySelector('.total');
    if (totalElement) {
        totalElement.textContent = `Total R$ ${cartTotal.toFixed(2).replace('.', ',')}`;
    }
}

function addProduct() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const price = document.getElementById('productPrice').value;
    const stock = document.getElementById('productStock').value;

    const data = { id, name, category, price, stock };
    fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(result => {
        alert(result);
        loadProducts(); // Recarrega a lista de produtos
        document.getElementById('productId').value = '';
        document.getElementById('productName').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productStock').value = '';
    })
    .catch(error => console.error('Erro ao adicionar produto:', error));
}

// Carrega produtos ao iniciar as páginas shop.html e dashboard.html
if (document.getElementById('productList')) {
    loadProducts();
}
