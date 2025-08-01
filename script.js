$(document).ready(function() {
    let userProducts = []; // In-memory store for user products
    let userSettings = { paypalClientId: '' }; // Store user settings
    let isLoggedIn = false; // Track auth state
    let currentUserPlan = 'free'; // 'free' or 'pro'
    let platformStats = { totalCommission: 0 }; // Track platform-wide stats

    const PLATFORM_PAYPAL_EMAIL = 'eduardoroblesespinosa@hotmail.com';

    const COMMISSION_RATES = {
        free: 0.05, // 5%
        pro: 0.02   // 2%
    };

    const addProductModal = new bootstrap.Modal(document.getElementById('addProductModal'));
    const editProductModal = new bootstrap.Modal(document.getElementById('editProductModal'));
    const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    const productPageModal = new bootstrap.Modal(document.getElementById('productPageModal'));
    const appToast = new bootstrap.Toast(document.getElementById('appToast'));
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    const dashboardModal = new bootstrap.Modal(document.getElementById('dashboardModal'));

    // --- Toast Notifier ---
    function showToast(title, body, type = 'success') {
        const toastHeader = $('#appToast .toast-header');
        toastHeader.removeClass('bg-success bg-danger bg-warning text-white').addClass(type === 'success' ? 'bg-success text-white' : 'bg-danger text-white');
        $('#toastTitle').text(title);
        $('#toastBody').text(body);
        appToast.show();
    }

    // --- Carousel Initialization ---
    const heroCarousel = new bootstrap.Carousel('#heroCarousel', {
        interval: 5000,
        pause: 'hover'
    });

    // --- Settings Management ---
    $('#settings-form').on('submit', function(e) {
        e.preventDefault();
        userSettings.paypalClientId = $('#paypalClientId').val().trim();
        settingsModal.hide();
        showToast('¡Guardado!', 'Tu configuración se ha actualizado correctamente.');
    });

    $('#settingsModal').on('show.bs.modal', function() {
        $('#paypalClientId').val(userSettings.paypalClientId);
    });

    // --- Stats Calculation ---
    function updateDashboardStats() {
        const totalRevenue = userProducts.reduce((sum, p) => sum + (p.revenue || 0), 0);
        const totalSales = userProducts.reduce((sum, p) => sum + (p.sales || 0), 0);
        // Available balance is the net revenue collected by the creator.
        const availableBalance = totalRevenue; 

        $('#totalRevenue').text(`$${totalRevenue.toFixed(2)}`);
        $('#totalSales').text(totalSales);
        $('#availableBalance').text(`$${availableBalance.toFixed(2)}`);
        $('#commissionsPaid').text(`$${platformStats.totalCommission.toFixed(2)}`);
    }

    // --- Product Management ---
    function renderProducts() {
        const productList = $('#productList');
        const noProductsMessage = $('#no-products-message');
        
        productList.empty(); // Clear existing products

        if (userProducts.length === 0) {
            productList.append(noProductsMessage.show());
        } else {
            noProductsMessage.hide();
            userProducts.forEach(product => {
                const thumbnailUrl = product.image ? URL.createObjectURL(product.image) : `https://via.placeholder.com/300x200.png?text=${encodeURIComponent(product.name)}`;
                const productCard = `
                    <div class="col-md-6 col-lg-4">
                        <div class="card product-card h-100">
                            <img src="${thumbnailUrl}" class="card-img-top" alt="${product.name}">
                            <div class="card-body d-flex flex-column pb-0">
                                <h5 class="card-title">${product.name}</h5>
                                <p class="card-text text-muted flex-grow-1">${product.description || 'Sin descripción.'}</p>
                                <p class="card-text h4 text-primary mb-3">$${product.price}</p>
                            </div>
                            <div class="product-stats p-3 mt-auto">
                                <div class="d-flex justify-content-around text-center small mb-3">
                                    <div>
                                        <div class="fw-bold">${product.sales || 0}</div>
                                        <div class="text-muted">Ventas</div>
                                    </div>
                                    <div>
                                        <div class="fw-bold">$${(product.revenue || 0).toFixed(2)}</div>
                                        <div class="text-muted">Ingresos</div>
                                    </div>
                                </div>
                                <div class="d-grid gap-2">
                                   <div class="btn-group">
                                       <button class="btn btn-sm btn-outline-info btn-view-page" data-id="${product.id}"><i class="bi bi-eye-fill me-1"></i>Ver Página</button>
                                       <button class="btn btn-sm btn-outline-secondary btn-edit" data-id="${product.id}" data-bs-toggle="modal" data-bs-target="#editProductModal"><i class="bi bi-pencil-fill me-1"></i>Editar</button>
                                       <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${product.id}"><i class="bi bi-trash-fill me-1"></i>Eliminar</button>
                                   </div>
                                   <button class="btn btn-sm btn-primary btn-copy-link" data-id="${product.id}"><i class="bi bi-link-45deg me-2"></i>Copiar Enlace de Venta</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                productList.append(productCard);
            });
        }
        updateDashboardStats();
    }

    // Handle Add Product Form Submission
    $('#add-product-form').on('submit', function(e) {
        e.preventDefault();
        
        const newProduct = {
            id: Date.now(), // simple unique ID
            name: $('#productName').val(),
            description: $('#productDescription').val(),
            price: parseFloat($('#productPrice').val()).toFixed(2),
            image: $('#productImage')[0].files[0],
            file: $('#productFile')[0].files[0],
            sales: 0,
            revenue: 0
        };

        userProducts.push(newProduct);
        renderProducts();
        
        addProductModal.hide();
        $(this)[0].reset(); // Reset form fields
        
        showToast('¡Éxito!', 'Tu producto ha sido añadido correctamente.');
    });

    // --- Edit and Delete Product Logic ---
    $('#productList').on('click', '.btn-edit', function() {
        const productId = $(this).data('id');
        const productToEdit = userProducts.find(p => p.id === productId);

        if (productToEdit) {
            $('#editProductId').val(productToEdit.id);
            $('#editProductName').val(productToEdit.name);
            $('#editProductDescription').val(productToEdit.description);
            $('#editProductPrice').val(productToEdit.price);
            // Clear file inputs
            $('#editProductImage').val('');
            $('#editProductFile').val('');
        }
    });
    
    $('#edit-product-form').on('submit', function(e) {
        e.preventDefault();
        const productId = parseInt($('#editProductId').val());
        const productIndex = userProducts.findIndex(p => p.id === productId);

        if (productIndex > -1) {
            userProducts[productIndex].name = $('#editProductName').val();
            userProducts[productIndex].description = $('#editProductDescription').val();
            userProducts[productIndex].price = parseFloat($('#editProductPrice').val()).toFixed(2);
            
            const newImage = $('#editProductImage')[0].files[0];
            if (newImage) {
                userProducts[productIndex].image = newImage;
            }

            const newFile = $('#editProductFile')[0].files[0];
            if (newFile) {
                 userProducts[productIndex].file = newFile;
            }

            renderProducts();
            editProductModal.hide();
            showToast('¡Éxito!', 'Tu producto ha sido actualizado.');
        }
    });

    $('#productList').on('click', '.btn-delete', function() {
        const productId = $(this).data('id');
        if (confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer.')) {
            userProducts = userProducts.filter(p => p.id !== productId);
            renderProducts();
            showToast('Eliminado', 'El producto ha sido eliminado.', 'warning');
        }
    });

    $('#productList').on('click', '.btn-copy-link', function() {
        const productId = $(this).data('id');
        const linkToCopy = `https://automonetiza.pro/p/${productId}`;
        navigator.clipboard.writeText(linkToCopy).then(() => {
            showToast('¡Copiado!', 'El enlace de venta ha sido copiado a tu portapapeles.');
        }).catch(err => {
            showToast('Error', 'No se pudo copiar el enlace.', 'danger');
        });
    });

    // --- Product Page and Payment ---
    let currentPayingProduct = null;
    
    function loadPaypalSdk(clientId) {
        return new Promise((resolve, reject) => {
            if (window.paypal) {
                return resolve();
            }
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&disable-funding=credit,card`;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('PayPal SDK could not be loaded.'));
            document.head.appendChild(script);
        });
    }

    function renderPayPalButton(product) {
        $('#paypal-button-container').empty().append('<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>');
        
        loadPaypalSdk(userSettings.paypalClientId)
            .then(() => {
                $('#paypal-button-container').empty();
                paypal.Buttons({
                    createOrder: function(data, actions) {
                        return actions.order.create({
                            purchase_units: [{
                                amount: {
                                    value: product.price,
                                    currency_code: 'USD'
                                },
                                description: product.name
                            }]
                        });
                    },
                    onApprove: function(data, actions) {
                        return actions.order.capture().then(function(details) {
                            const productToUpdate = userProducts.find(p => p.id === product.id);
                            if(productToUpdate) {
                                const productPrice = parseFloat(product.price);
                                const commissionRate = COMMISSION_RATES[currentUserPlan];
                                const commissionAmount = productPrice * commissionRate;
                                const creatorEarnings = productPrice - commissionAmount;

                                productToUpdate.sales = (productToUpdate.sales || 0) + 1;
                                productToUpdate.revenue = (productToUpdate.revenue || 0) + creatorEarnings;
                                platformStats.totalCommission += commissionAmount;

                                showToast('¡Venta Exitosa!', `¡Has vendido "${product.name}"! Ganancias: $${creatorEarnings.toFixed(2)} (después de una comisión de $${commissionAmount.toFixed(2)}).`);

                                console.log(`SIMULATING DEPOSIT: $${commissionAmount.toFixed(2)} commission for "${product.name}" sent to ${PLATFORM_PAYPAL_EMAIL}.`);

                            } else {
                                showToast('¡Pago Exitoso!', `La compra de "${product.name}" se ha completado.`);
                            }
                            productPageModal.hide();
                            updateDashboardStats();
                            renderProducts();
                        });
                    },
                    onError: function(err) {
                        showToast('Error de Pago', 'Ocurrió un error al procesar tu pago.', 'danger');
                        console.error('PayPal Error:', err);
                    }
                }).render('#paypal-button-container');
            })
            .catch(error => {
                $('#paypal-button-container').html('<div class="alert alert-danger">No se pudo cargar la pasarela de pago. Verifica el Client ID.</div>');
            });
    }

    $('#productList').on('click', '.btn-view-page', function() {
        const productId = $(this).data('id');
        currentPayingProduct = userProducts.find(p => p.id === productId);

        if (currentPayingProduct) {
            const product = currentPayingProduct;
            const thumbnailUrl = product.image ? URL.createObjectURL(product.image) : `https://via.placeholder.com/600x400.png?text=${encodeURIComponent(product.name)}`;
            const content = `
                <div class="row">
                    <div class="col-md-6 mb-3 mb-md-0">
                        <img src="${thumbnailUrl}" class="img-fluid w-100" alt="${product.name}">
                    </div>
                    <div class="col-md-6 d-flex flex-column">
                        <h3>${product.name}</h3>
                        <p class="text-muted">${product.description || 'Sin descripción.'}</p>
                        <div class="mt-auto">
                            <p class="h2 fw-bold text-primary mb-4">$${product.price} <small class="text-muted h6">USD</small></p>
                            <div id="paypal-button-container"></div>
                            <div id="payment-not-configured" class="alert alert-warning" style="display: none;">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>El creador aún no ha configurado una forma de pago.
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('#product-page-content').html(content);
            productPageModal.show();
            
            if (userSettings.paypalClientId) {
                $('#payment-not-configured').hide();
                renderPayPalButton(product);
            } else {
                 $('#paypal-button-container').hide();
                $('#payment-not-configured').show();
            }
        }
    });

    // --- Plan Selection ---
    $('#pricing').on('click', '#select-pro-plan', function(e) {
        // This button has data-bs-toggle, so it might open the auth modal if not logged in.
        // That's the desired behavior. If logged in, we handle the plan change.
        if (isLoggedIn) {
            e.stopPropagation(); // Prevent modal from opening if already logged in.
            currentUserPlan = 'pro';
            showToast('¡Plan Actualizado!', 'Has cambiado al Plan Pro. Tus nuevas comisiones son del 2%.');
            // Optionally, open dashboard to see the effect
            dashboardModal.show();
        }
    });

    // Render products when dashboard is opened
    $('#dashboardModal').on('show.bs.modal', function() {
        renderProducts();
    });

    // Smooth scrolling for nav links
    $(".nav-link").on('click', function(event) {
        if (this.hash !== "") {
            // Prevent default only for on-page links
            if ( $(this).attr('href').startsWith('#') ) {
                event.preventDefault();
                var hash = this.hash;
                $('html, body').animate({
                    scrollTop: $(hash).offset().top - 56 // Adjust for fixed navbar
                }, 800, function(){
                    // window.location.hash = hash; // Optional: adds hash to URL
                });
            }
        }
    });

    // Change navbar background on scroll
    $(window).scroll(function() {
        if ($(this).scrollTop() > 50) {
            $('.navbar').addClass('bg-dark').removeClass('bg-transparent');
        } else {
             // Keep it dark, looks better
            // $('.navbar').removeClass('bg-dark').addClass('bg-transparent');
        }
    });
    
    // Animate features on scroll (simple fade-in)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                $(entry.target).css({
                    'opacity': 1,
                    'transform': 'translateY(0)'
                });
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    $('.feature-card, .step-icon, #pricing .card').each(function() {
        $(this).css({
            'opacity': 0,
            'transform': 'translateY(20px)',
            'transition': 'opacity 0.5s ease-out, transform 0.5s ease-out'
        });
        observer.observe(this);
    });

    // --- Auth Modal Logic ---
    const modalEl = document.getElementById('authModal');
    const registerView = $('#register-view');
    const loginView = $('#login-view');
    const successView = $('#success-view');
    const modalTitle = $('#authModalLabel');

    function showLoginView() {
        modalTitle.text('Inicia Sesión');
        registerView.hide();
        successView.hide();
        loginView.show();
    }

    function showRegisterView() {
        modalTitle.text('Crea tu cuenta');
        loginView.hide();
        successView.hide();
        registerView.show();
    }
    
    $('#show-login').on('click', function(e) {
        e.preventDefault();
        showLoginView();
    });

    $('#show-register').on('click', function(e) {
        e.preventDefault();
        showRegisterView();
    });

    // Reset view on modal close
    modalEl.addEventListener('hidden.bs.modal', function (event) {
        showRegisterView();
    });

    // Manage Auth state
    function setLoggedInState() {
        isLoggedIn = true;
        $('#login-nav-link').hide();
        $('#register-nav-item').hide();
        $('#account-nav-item').show();

        // Update CTAs to open dashboard instead of auth modal
        $('.cta-auth-trigger').each(function() {
            $(this).attr('data-bs-toggle', 'modal').attr('data-bs-target', '#dashboardModal');
        });
    }

    function setLoggedOutState() {
        isLoggedIn = false;
        $('#account-nav-item').hide();
        $('#login-nav-link').show();
        $('#register-nav-item').show();
        
        // Restore CTAs to open auth modal
        $('.cta-auth-trigger').each(function() {
            $(this).attr('data-bs-toggle', 'modal').attr('data-bs-target', '#authModal');
        });
    }

    function showSuccess(title, message) {
        loginView.hide();
        registerView.hide();
        $('#success-title').text(title);
        $('#success-message').text(message);
        successView.show();
        
        setTimeout(() => {
            setLoggedInState();
            authModal.hide();
        }, 2000);
    }

    // Form Submissions
    $('#register-form').on('submit', function(e) {
        e.preventDefault();
        showSuccess('¡Registro completado!', '¡Bienvenido a AutoMonetiza Pro!');
    });

    $('#login-form').on('submit', function(e) {
        e.preventDefault();
        showSuccess('¡Inicio de sesión exitoso!', 'Te hemos redirigido a tu panel.');
    });
    
    // Social Logins
    $('.social-btn').on('click', function(e){
        e.preventDefault();
        showSuccess('¡Conectado!', 'Has iniciado sesión correctamente.');
    });

    // Logout
    $('#logout-link').on('click', function(e) {
        e.preventDefault();
        setLoggedOutState();
        showToast('Sesión cerrada', 'Has cerrado sesión correctamente.', 'warning');
    });

    // Initial state check
    setLoggedOutState(); // Explicitly set initial state on page load
});