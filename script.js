// Portfolio Dashboard - Complete Implementation
// Authentication and Portfolio Management System

/*
VERIFICATION STEPS:
1. Open app → Sign Up with an email/password (demo)
2. Click Add Stock → enter ticker and shares → Add Asset
3. See total update and category count increase
4. Reload page: data persists
5. Open DevTools → run window.__dbgAddTestAsset() → confirm log shows increased asset count for the same email
6. Sign out, sign in with a different email → should see an empty portfolio (isolation confirmed)
*/

// Global state
let currentUser = null;
let portfolio = {
    stocks: [],
    crypto: [],
    checking: [],
    savings: [],
    roth: [],
    'real-estate': [],
    vehicles: [],
    other: []
};

let portfolioChart = null;
let currentAddingCategory = null; // Category context for asset submission

// Expose submit handler on window for fallback - DEFINED EARLY TO PREVENT TIMING ISSUES
window._handleAssetSubmit = function(event) {
    console.log('[PF] Fallback submit handler called');
    event.preventDefault(); // Prevent default form submission
    handleAssetSubmit(event);
    return false; // Prevent default form submission
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Portfolio Dashboard initializing...');
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded!');
        return;
    }
    
    // Initialize authentication
    checkAuthStatus();
    
    // Load portfolio (handles both signed-in and anonymous users)
    loadPortfolio();
    
    // Setup event listeners
    setupEventListeners();
    
    // CRITICAL: Add direct form submission handler to ensure it works
    setTimeout(() => {
        const assetForm = document.getElementById('assetForm');
        if (assetForm) {
            // Remove any existing event listeners
            assetForm.removeEventListener('submit', handleAssetSubmit);
            
            // Add direct submit event listener
            assetForm.addEventListener('submit', function(event) {
                console.log('[PF] Direct form submit event listener triggered');
                event.preventDefault();
                event.stopPropagation();
                handleAssetSubmit(event);
                return false;
            });
            
            console.log('[PF] Direct form submit event listener added');
        }
        
        // Also add click handler to submit button as backup
        const submitButton = document.getElementById('addAssetBtn');
        if (submitButton) {
            submitButton.addEventListener('click', function(event) {
                console.log('[PF] Submit button click handler triggered');
                event.preventDefault();
                event.stopPropagation();
                handleAssetSubmit(event);
                return false;
            });
            console.log('[PF] Submit button click handler added');
        }
        
        // Add ticker input event listener to auto-fetch price
        const tickerInput = document.getElementById('stockTicker');
        if (tickerInput) {
            tickerInput.addEventListener('blur', function() {
                const ticker = this.value.trim().toUpperCase();
                if (ticker && ticker.length >= 1) {
                    console.log('[PF] Ticker entered, fetching price for:', ticker);
                    fetchStockPrice(ticker);
                }
            });
            console.log('[PF] Ticker input event listener added');
        }
    }, 1000);
    
    // Initialize UI
    updateDisplay();
    
    console.log('Portfolio Dashboard initialized successfully');
    console.log('[PF] Initial portfolio state:', portfolio);
});

// Authentication Functions
function checkAuthStatus() {
    const savedEmail = localStorage.getItem('pf_current_email');
    if (savedEmail) {
        const users = JSON.parse(localStorage.getItem('pf_users') || '{}');
        if (users[savedEmail]) {
            currentUser = { email: savedEmail };
            loadUserPortfolio();
            renderProfileView();
            console.log('User signed in:', savedEmail);
        }
    }
}

function handleAuth(event) {
    event.preventDefault();
    
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const confirmPassword = document.getElementById('authConfirmPassword').value;
    
    const isSignUp = document.getElementById('signupTab').classList.contains('active');
    
    if (isSignUp) {
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
        return;
        }
        if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }
        signUp(email, password);
    } else {
        signIn(email, password);
    }
}

function signUp(email, password) {
    const users = JSON.parse(localStorage.getItem('pf_users') || '{}');
    
    if (users[email]) {
        showNotification('User already exists', 'error');
                return;
            }
    
    // Simple password hash (demo purposes)
    const passwordHash = btoa(password);
    users[email] = {
        passwordHash: passwordHash,
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('pf_users', JSON.stringify(users));
    
    // Create blank portfolio for new user
    const portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
    portfolios[email] = {
        assets: {
            stocks: [],
            crypto: [],
            checking: [],
            savings: [],
            roth: [],
            'real-estate': [],
            vehicles: [],
            other: []
        },
        lastSync: new Date().toISOString()
    };
    localStorage.setItem('pf_portfolios', JSON.stringify(portfolios));
    
    // Auto sign in
    signIn(email, password);
}

function signIn(email, password) {
    const users = JSON.parse(localStorage.getItem('pf_users') || '{}');
    const user = users[email];
    
    if (!user || btoa(password) !== user.passwordHash) {
        showNotification('Invalid email or password', 'error');
        return;
    }
    
    currentUser = { email: email };
    localStorage.setItem('pf_current_email', email);
    
    loadUserPortfolio();
    renderProfileView();
    closeProfileModal();
    
    showNotification('Successfully signed in!', 'success');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('pf_current_email');
    
    // Reset to empty portfolio
    portfolio = {
        stocks: [],
        crypto: [],
        checking: [],
        savings: [],
        roth: [],
        'real-estate': [],
        vehicles: [],
        other: []
    };
    
    updateDisplay();
    renderProfileView();
    closeProfileModal();
    
    showNotification('Successfully signed out', 'success');
}

function switchAuthMode(mode) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authTitle = document.getElementById('authTitle');
    
    if (mode === 'signup') {
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
        confirmPasswordGroup.style.display = 'block';
        authSubmitBtn.textContent = 'Sign Up';
        authTitle.textContent = 'Create Your Portfolio Account';
    } else {
        signupTab.classList.remove('active');
        loginTab.classList.add('active');
        confirmPasswordGroup.style.display = 'none';
        authSubmitBtn.textContent = 'Sign In';
        authTitle.textContent = 'Sign In to Your Portfolio';
    }
}

function renderProfileView() {
    const authForm = document.getElementById('authForm');
    const profileDashboard = document.getElementById('profileDashboard');
    
    if (currentUser) {
        authForm.style.display = 'none';
        profileDashboard.style.display = 'block';
        
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('totalAssets').textContent = getTotalAssetCount();
        
        const portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
        const userPortfolio = portfolios[currentUser.email];
        if (userPortfolio) {
            document.getElementById('lastSyncTime').textContent = 'Just now';
            document.getElementById('accountCreated').textContent = new Date(userPortfolio.lastSync).toLocaleDateString();
        }
    } else {
        authForm.style.display = 'block';
        profileDashboard.style.display = 'none';
    }
}

// Portfolio Management Functions
function loadUserPortfolio() {
    if (!currentUser) return;
    
    console.log('[PF] Loading portfolio for user:', currentUser.email);
    
    const portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
    const userPortfolio = portfolios[currentUser.email];
    
    if (userPortfolio && userPortfolio.assets) {
        console.log('[PF] User portfolio found, loading assets');
        
        // Deep copy the assets to avoid reference issues
        portfolio = {
            stocks: [...(userPortfolio.assets.stocks || [])],
            crypto: [...(userPortfolio.assets.crypto || [])],
            checking: [...(userPortfolio.assets.checking || [])],
            savings: [...(userPortfolio.assets.savings || [])],
            roth: [...(userPortfolio.assets.roth || [])],
            'real-estate': [...(userPortfolio.assets['real-estate'] || [])],
            vehicles: [...(userPortfolio.assets.vehicles || [])],
            other: [...(userPortfolio.assets.other || [])]
        };
        
        console.log('[PF] Portfolio loaded successfully');
        console.log('[PF] Asset counts:', {
            stocks: portfolio.stocks.length,
            crypto: portfolio.crypto.length,
            checking: portfolio.checking.length,
            savings: portfolio.savings.length,
            roth: portfolio.roth.length,
            'real-estate': portfolio['real-estate'].length,
            vehicles: portfolio.vehicles.length,
            other: portfolio.other.length
        });
    } else {
        console.log('[PF] No user portfolio found, initializing empty portfolio');
        // Initialize empty portfolio
        portfolio = {
            stocks: [],
            crypto: [],
            checking: [],
            savings: [],
            roth: [],
            'real-estate': [],
            vehicles: [],
            other: []
        };
    }
}

function saveUserPortfolio() {
    if (!currentUser) return;
    
    console.log('[PF] Saving portfolio for user:', currentUser.email);
    
    const portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
    portfolios[currentUser.email] = {
        assets: {
            stocks: [...portfolio.stocks],
            crypto: [...portfolio.crypto],
            checking: [...portfolio.checking],
            savings: [...portfolio.savings],
            roth: [...portfolio.roth],
            'real-estate': [...portfolio['real-estate']],
            vehicles: [...portfolio.vehicles],
            other: [...portfolio.other]
        },
        lastSync: new Date().toISOString()
    };
    
    localStorage.setItem('pf_portfolios', JSON.stringify(portfolios));
    
    console.log('[PF] Portfolio saved successfully');
    console.log('[PF] Saved asset counts:', {
        stocks: portfolios[currentUser.email].assets.stocks.length,
        crypto: portfolios[currentUser.email].assets.crypto.length,
        checking: portfolios[currentUser.email].assets.checking.length,
        savings: portfolios[currentUser.email].assets.savings.length,
        roth: portfolios[currentUser.email].assets.roth.length,
        'real-estate': portfolios[currentUser.email].assets['real-estate'].length,
        vehicles: portfolios[currentUser.email].assets.vehicles.length,
        other: portfolios[currentUser.email].assets.other.length
    });
}

// Global portfolio loading function (can be called from anywhere)
function loadPortfolio() {
    console.log('[PF] loadPortfolio called');
    
    if (currentUser) {
        console.log('[PF] User signed in, loading user portfolio');
        loadUserPortfolio();
    } else {
        console.log('[PF] No user signed in, initializing empty portfolio');
        portfolio = {
            stocks: [],
            crypto: [],
            checking: [],
            savings: [],
            roth: [],
            'real-estate': [],
            vehicles: [],
            other: []
        };
    }
    
    console.log('[PF] Portfolio loaded:', portfolio);
}

function addAsset(category) {
    currentAddingCategory = category;
    console.log('[PF] Setting currentAddingCategory to:', category);
    
    const modal = document.getElementById('assetModal');
    const modalTitle = document.getElementById('modalTitle');
    
    // Update modal title
    const categoryNames = {
        'stocks': 'Add Stock',
        'crypto': 'Add Cryptocurrency',
        'checking': 'Add Cash',
        'savings': 'Add Savings',
        'roth': 'Add Roth IRA',
        'real-estate': 'Add Real Estate',
        'vehicles': 'Add Vehicle',
        'other': 'Add Other Asset'
    };
    modalTitle.textContent = categoryNames[category] || 'Add Asset';
    
    // Show appropriate input mode - deterministic
    const tickerCategories = ['stocks', 'crypto'];
    if (tickerCategories.includes(category)) {
        // Default to Ticker mode for stocks/crypto
        document.getElementById('tickerRadio').checked = true;
        showTickerInputs();
        console.log('[PF] Set to ticker mode for category:', category);
    } else {
        // Hide ticker inputs, show static input for non-ticker categories
        document.getElementById('staticRadio').checked = true;
        showStaticInput();
        console.log('[PF] Set to static mode for category:', category);
    }
    
    // Show input type selector (CRITICAL: This was hidden by default)
    document.getElementById('inputTypeSelector').style.display = 'block';
    
    // Reset form
    document.getElementById('assetForm').reset();
    
    // Ensure form is ready for submission
    console.log('[PF] Form reset and input type selector shown');
    
    // Add event listeners for radio buttons (ensure they work when modal opens)
    const tickerRadio = document.getElementById('tickerRadio');
    const staticRadio = document.getElementById('staticRadio');
    
    if (tickerRadio && !tickerRadio.hasAttribute('data-listener-added')) {
        tickerRadio.addEventListener('change', function() {
            if (this.checked) {
                showTickerInputs();
                console.log('[PF] Switched to ticker mode');
            }
        });
        tickerRadio.setAttribute('data-listener-added', 'true');
    }
    
    if (staticRadio && !staticRadio.hasAttribute('data-listener-added')) {
        staticRadio.addEventListener('change', function() {
            if (this.checked) {
                showStaticInput();
                console.log('[PF] Switched to static mode');
            }
        });
        staticRadio.setAttribute('data-listener-added', 'true');
    }
    
    // Add backup submit button handler
    const submitButton = document.getElementById('addAssetBtn');
    if (submitButton && !submitButton.hasAttribute('data-backup-handler')) {
        submitButton.addEventListener('click', function(event) {
            console.log('[PF] Backup submit button clicked');
            event.preventDefault();
            handleAssetSubmit(event);
        });
        submitButton.setAttribute('data-backup-handler', 'true');
    }
    
    // Open modal
    modal.style.display = 'block';
}

function resetAssetForm() {
    document.getElementById('assetForm').reset();
    document.getElementById('calculatedResult').textContent = '$0.00';
    document.getElementById('currentPrice').textContent = '$0.00';
}

function showTickerInputs() {
    document.getElementById('tickerInputs').style.display = 'block';
    document.getElementById('staticInput').style.display = 'none';
}

function showStaticInput() {
    document.getElementById('tickerInputs').style.display = 'none';
    document.getElementById('staticInput').style.display = 'block';
}

function toggleInputMode() {
    const toggleBtn = document.getElementById('inputToggleBtn');
    const dynamicInputLabel = document.getElementById('dynamicInputLabel');
    const dynamicInput = document.getElementById('dynamicInput');
    
    if (toggleBtn.textContent === 'Switch to Value Input') {
        toggleBtn.textContent = 'Switch to Shares Input';
        dynamicInputLabel.textContent = 'Value ($):';
        dynamicInput.placeholder = 'e.g., 1000.00';
        dynamicInput.step = '0.01';
    } else {
        toggleBtn.textContent = 'Switch to Value Input';
        dynamicInputLabel.textContent = 'Number of Shares:';
        dynamicInput.placeholder = 'e.g., 10.5';
        dynamicInput.step = '0.000001';
    }
    
    calculateDynamicValue();
}

function calculateDynamicValue() {
    const dynamicInput = document.getElementById('dynamicInput');
    const currentPrice = document.getElementById('currentPrice');
    const calculatedResult = document.getElementById('calculatedResult');
    const toggleBtn = document.getElementById('inputToggleBtn');
    
    const inputValue = parseFloat(dynamicInput.value) || 0;
    const priceText = currentPrice.textContent;
    // Parse price, handling demo format like "$175.50 (demo)"
    const price = parseFloat(priceText.replace('$', '').replace(',', '').replace(/\(.*\)/, '').trim()) || 0;
    
    let result = 0;
    
    if (toggleBtn && toggleBtn.textContent === 'Switch to Shares Input') {
        // Value input mode
        result = inputValue;
    } else {
        // Shares input mode
        result = inputValue * price;
    }
    
    calculatedResult.textContent = `$${result.toLocaleString()}`;
}

// Form submission handler with robust session verification and localStorage handling
function handleAssetSubmit(event) {
    event.preventDefault();
    console.log('[PF] Asset form submit handler began');
    console.log('[PF] Current origin:', location.origin);
    console.log('[PF] Current adding category:', currentAddingCategory);
    console.log('[PF] Event type:', event.type);
    console.log('[PF] Event target:', event.target);
    
    // Verify session before saving
    const currentEmail = localStorage.getItem('pf_current_email');
    console.log('[PF] Current email from session:', currentEmail);
    
    if (!currentEmail) {
        console.log('[PF] Early return: missing session');
        showNotification('Please sign in to save assets to your profile.', 'error');
        openProfileModal();
        return false; // CRITICAL: Return false to prevent form submission
    }
    
    // Verify category context
    if (!currentAddingCategory) {
        console.log('[PF] Early return: missing category context');
        showNotification('Category context missing. Please try again.', 'error');
        return false; // CRITICAL: Return false to prevent form submission
    }
    
    console.log('[PF] Processing asset for category:', currentAddingCategory);
    
    const assetNameElement = document.getElementById('assetName');
    const inputType = document.querySelector('input[name="inputType"]:checked');
    
    console.log('[PF] Asset name element:', assetNameElement);
    console.log('[PF] Input type element:', inputType);
    
    if (!assetNameElement) {
        console.log('[PF] Early return: asset name element not found');
        showNotification('Asset name input not found', 'error');
        return false; // CRITICAL: Return false to prevent form submission
    }
    
    const assetName = assetNameElement.value.trim();
    console.log('[PF] Asset name value:', assetName);
    
    if (!assetName) {
        console.log('[PF] Early return: missing asset name');
        showNotification('Please enter an asset name', 'error');
        return false; // CRITICAL: Return false to prevent form submission
    }
    
    if (!inputType) {
        console.log('[PF] Early return: no input type selected');
        showNotification('Please select an input type', 'error');
        return false; // CRITICAL: Return false to prevent form submission
    }
    
    // Generate asset ID (crypto polyfill)
    let assetId;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        assetId = crypto.randomUUID();
    } else {
        assetId = 'asset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    let assetValue = 0;
    let asset = {
        id: assetId,
        name: assetName,
        value: assetValue,
        type: inputType.value,
        category: currentAddingCategory,
        dateAdded: new Date().toISOString()
    };
    
    if (inputType.value === 'static') {
        assetValue = parseFloat(document.getElementById('assetValue').value) || 0;
        // Prevent NaN/empty values from breaking saves
        assetValue = isFinite(assetValue) ? Math.max(0, assetValue) : 0;
        
        if (assetValue <= 0) {
            console.log('[PF] Early return: invalid asset value');
            showNotification('Please enter a valid asset value', 'error');
            return false; // CRITICAL: Return false to prevent form submission
        }
        
        asset.value = assetValue;
        asset.mode = 'static';
        console.log('[PF] Static mode - value:', assetValue);
    } else {
        // Ticker mode
        const ticker = document.getElementById('stockTicker').value.trim().toUpperCase();
        const shares = parseFloat(document.getElementById('dynamicInput').value) || 0;
        const priceText = document.getElementById('currentPrice').textContent;
        // Parse price, handling demo format like "$175.50 (demo)"
        const price = parseFloat(priceText.replace('$', '').replace(',', '').replace(/\(.*\)/, '').trim()) || 0;
        
        if (!ticker) {
            console.log('[PF] Early return: missing ticker');
            showNotification('Please enter a ticker symbol', 'error');
            return false; // CRITICAL: Return false to prevent form submission
        }
        
        if (shares <= 0) {
            console.log('[PF] Early return: invalid shares');
            showNotification('Please enter valid shares', 'error');
            return false; // CRITICAL: Return false to prevent form submission
        }
        
        if (price <= 0) {
            console.log('[PF] Early return: invalid price');
            showNotification('Please fetch a valid price first or use manual price setting', 'error');
            return false; // CRITICAL: Return false to prevent form submission
        }
        
        assetValue = shares * price;
        // Prevent NaN/empty values from breaking saves
        assetValue = isFinite(assetValue) ? Math.max(0, assetValue) : 0;
        asset.value = assetValue;
        asset.ticker = ticker;
        asset.shares = shares;
        asset.currentPrice = price;
        asset.mode = 'shares';
        console.log('[PF] Ticker mode - shares:', shares, 'price:', price, 'total:', assetValue);
    }
    
    // Harden localStorage reads/writes
    let portfolios;
    try {
        const portfoliosData = localStorage.getItem('pf_portfolios');
        portfolios = portfoliosData ? JSON.parse(portfoliosData) : {};
        if (typeof portfolios !== 'object' || portfolios === null) {
            portfolios = {};
        }
    } catch (error) {
        console.log('[PF] Error parsing portfolios, resetting to empty object');
        portfolios = {};
    }
    
    // Create/ensure portfolio object for user
    if (!portfolios[currentEmail]) {
        portfolios[currentEmail] = {
            assets: {
                stocks: [],
                crypto: [],
                checking: [],
                savings: [],
                roth: [],
                'real-estate': [],
                vehicles: [],
                other: []
            },
            lastSync: new Date().toISOString()
        };
    }
    
    // Add asset to user's portfolio
    portfolios[currentEmail].assets[currentAddingCategory].push(asset);
    portfolios[currentEmail].lastSync = new Date().toISOString();
    
    console.log('[PF] About to write to localStorage:', portfolios[currentEmail]);
    
    // Write back to localStorage
    try {
        localStorage.setItem('pf_portfolios', JSON.stringify(portfolios));
        console.log('[PF] Successfully wrote to localStorage');
    } catch (error) {
        console.error('[PF] Error writing to localStorage:', error);
        showNotification('Error saving asset. Please try again.', 'error');
        return;
    }
    
    // Immediately read back and verify
    try {
        const verifyData = JSON.parse(localStorage.getItem('pf_portfolios'));
        const userAssets = verifyData[currentEmail].assets[currentAddingCategory];
        const assetCount = userAssets.length;
        console.log('[PF] Read back verification - asset count:', assetCount);
        console.log('[PF] Read back data:', verifyData[currentEmail]);
        
        if (assetCount === 0) {
            console.error('[PF] ERROR: Asset count is 0 after save!');
        }
    } catch (error) {
        console.error('[PF] Error verifying save:', error);
    }
    
    // Update local portfolio state (avoid duplication)
    // Only add to global portfolio if not already added
    const existingAsset = portfolio[currentAddingCategory].find(a => a.id === asset.id);
    if (!existingAsset) {
        portfolio[currentAddingCategory].push(asset);
        console.log('[PF] Added asset to global portfolio');
    } else {
        console.log('[PF] Asset already exists in global portfolio, skipping');
    }
    
    // Update UI after successful save
    closeModals();
    updateDisplay();
    updateProfileStats();
    showNotification('Asset saved to your profile.', 'success');
    
    console.log('[PF] Asset submission complete');
}

// Note: window._handleAssetSubmit is defined at the top of the file to prevent timing issues

// Update profile stats after asset addition
function updateProfileStats() {
    if (currentUser) {
        document.getElementById('totalAssets').textContent = getTotalAssetCount();
        document.getElementById('lastSyncTime').textContent = 'Just now';
    }
}

// UI Update Functions
function updateDisplay() {
    updateTotalValue();
    updateDailyChange();
    updateAssetBreakdown();
    updateChart();
}

function updateTotalValue() {
    const totalValue = calculateTotalValue();
    const totalElement = document.getElementById('totalAmount');
    if (totalElement) {
        totalElement.textContent = `$${totalValue.toLocaleString()}`;
    }
}

function updateDailyChange() {
    // Simulate daily change (demo purposes)
    const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
    const changeElement = document.getElementById('dailyChange');
    if (changeElement) {
        const sign = changePercent >= 0 ? '+' : '';
        changeElement.textContent = `${sign}${changePercent.toFixed(2)}%`;
        changeElement.style.color = changePercent >= 0 ? '#10b981' : '#ef4444';
    }
}

function updateAssetBreakdown() {
    const breakdownElement = document.getElementById('assetBreakdown');
    if (!breakdownElement) return;
    
    const totalValue = calculateTotalValue();
    let html = '';
    
    Object.keys(portfolio).forEach(category => {
        const assets = portfolio[category];
        if (assets.length > 0) {
            const categoryTotal = assets.reduce((sum, asset) => sum + asset.value, 0);
            const percentage = totalValue > 0 ? (categoryTotal / totalValue * 100).toFixed(1) : 0;
            
            html += `
                <div class="asset-item" onclick="viewCategory('${category}')">
                    <div class="asset-info">
                        <div class="asset-name">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
                        <div class="asset-count">${assets.length} ${assets.length === 1 ? 'asset' : 'assets'}</div>
                    </div>
                    <div class="asset-value">
                        <div class="asset-amount">$${categoryTotal.toLocaleString()}</div>
                        <div class="asset-percentage">${percentage}%</div>
                    </div>
                </div>
            `;
        }
    });
    
    if (html === '') {
        html = '<div class="empty-portfolio">No assets added yet. Click "Add Asset" to get started!</div>';
    }
    
    breakdownElement.innerHTML = html;
}

function calculateTotalValue() {
    let total = 0;
    Object.values(portfolio).forEach(category => {
        if (Array.isArray(category)) {
            category.forEach(asset => {
                total += asset.value || 0;
            });
        }
    });
    return total;
}

function getTotalAssetCount() {
    let count = 0;
    Object.values(portfolio).forEach(category => {
        if (Array.isArray(category)) {
            count += category.length;
        }
    });
    return count;
}

// Chart Functions
function updateChart() {
    const canvas = document.getElementById('portfolioChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (portfolioChart) {
        portfolioChart.destroy();
    }
    
    // Prepare data
    const labels = [];
    const data = [];
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
    
    Object.keys(portfolio).forEach((category, index) => {
        const assets = portfolio[category];
        if (assets.length > 0) {
            const categoryTotal = assets.reduce((sum, asset) => sum + asset.value, 0);
            labels.push(category.charAt(0).toUpperCase() + category.slice(1));
            data.push(categoryTotal);
        }
    });
    
    if (data.length === 0) {
        // Show empty state
        labels.push('No Assets');
        data.push(1);
    }
    
    // Create chart
    portfolioChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function switchChartType(type) {
    if (!portfolioChart) return;
    
    portfolioChart.config.type = type;
    portfolioChart.update();
}

function switchTimeframe(timeframe) {
    // Update active timeframe button
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // In a real app, this would fetch historical data
    console.log('Switched to timeframe:', timeframe);
}

// Modal Functions
function openProfileModal() {
    document.getElementById('profileModal').style.display = 'block';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function viewCategory(category) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const list = document.getElementById('categoryAssetsList');
    
    title.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} Assets`;
    
    // Get assets from current user's saved portfolio
    const currentEmail = localStorage.getItem('pf_current_email');
    let assets = [];
    
    if (currentEmail) {
        try {
            const portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
            const userPortfolio = portfolios[currentEmail];
            if (userPortfolio && userPortfolio.assets && userPortfolio.assets[category]) {
                assets = userPortfolio.assets[category];
            }
        } catch (error) {
            console.error('[PF] Error loading category assets:', error);
        }
    }
    
    let html = '';
    
    if (assets.length === 0) {
        html = '<div class="empty-category">No assets in this category yet.</div>';
    } else {
        assets.forEach((asset, index) => {
            html += `
                <div class="category-asset-item">
                    <div class="asset-details">
                        <div class="asset-name">${asset.name}</div>
                        <div class="asset-type">${asset.type}</div>
                        ${asset.ticker ? `<div class="asset-ticker">${asset.ticker}</div>` : ''}
                    </div>
                    <div class="asset-value">$${asset.value.toLocaleString()}</div>
                    <button class="remove-btn" onclick="removeAsset('${category}', ${index})">×</button>
                </div>
            `;
        });
    }
    
    list.innerHTML = html;
    modal.style.display = 'block';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

function removeAsset(category, index) {
    if (confirm('Are you sure you want to remove this asset?')) {
        portfolio[category].splice(index, 1);
        
        if (currentUser) {
            saveUserPortfolio();
        }
        
    updateDisplay();
        viewCategory(category); // Refresh the view
        showNotification('Asset removed', 'success');
    }
}

// Profile Functions
function syncPortfolio() {
    if (currentUser) {
        saveUserPortfolio();
        document.getElementById('lastSyncTime').textContent = 'Just now';
        showNotification('Portfolio synced successfully!', 'success');
    }
}

function downloadBackup() {
    if (!currentUser) {
        showNotification('Please sign in to download backup', 'error');
        return;
    }
    
    const portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
    const userPortfolio = portfolios[currentUser.email];
    
    if (userPortfolio) {
        const backupData = {
            user: currentUser.email,
            portfolio: userPortfolio.assets,
            backupDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-backup-${currentUser.email}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Backup downloaded successfully!', 'success');
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function setupEventListeners() {
    // Note: Asset form submission is handled by onsubmit attribute in HTML
    // No need for duplicate event listener here
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModals();
            }
        });
    });
    
    // Close buttons
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', closeModals);
    });
    
    // Input type radio buttons
        const tickerRadio = document.getElementById('tickerRadio');
        const staticRadio = document.getElementById('staticRadio');
    
    if (tickerRadio) {
        tickerRadio.addEventListener('change', function() {
            if (this.checked) {
                showTickerInputs();
            }
        });
    }
    
    if (staticRadio) {
        staticRadio.addEventListener('change', function() {
            if (this.checked) {
                showStaticInput();
            }
        });
    }
    
    // Add to category button
    const addToCategoryBtn = document.getElementById('addToCategoryBtn');
    if (addToCategoryBtn) {
        addToCategoryBtn.addEventListener('click', function() {
            closeCategoryModal();
            // This would need to know which category was being viewed
            // For now, default to stocks
            addAsset('stocks');
        });
    }
}

// Stub functions for testing (to avoid runtime errors)
function testAddAsset() {
    console.log('Test add asset function called');
}

function debugPortfolioData() {
    console.log('Current portfolio:', portfolio);
    console.log('Current user:', currentUser);
    console.log('Total value:', calculateTotalValue());
}

function testDirectAssetAdd() {
    console.log('Test direct asset add function called');
}

function testFormSubmission() {
    console.log('Test form submission function called');
}

function ultimateTest() {
    console.log('Ultimate test function called');
}

function checkFormStatus() {
    console.log('Check form status function called');
}

function simulateSubmitClick() {
    console.log('Simulate submit click function called');
}

function forceSavePortfolio() {
    console.log('Force save portfolio function called');
}

function verifyPortfolioReference() {
    console.log('Verify portfolio reference function called');
}

function completeTest() {
    console.log('Complete test function called');
}

function testPortfolioReference() {
    console.log('Test portfolio reference function called');
}

function testFormSubmissionDirectly() {
    console.log('Test form submission directly function called');
}

function runFullDiagnostic() {
    console.log('Run full diagnostic function called');
}

function testModalVisibility() {
    console.log('Test modal visibility function called');
}

function ultimateBypassTest() {
    console.log('Ultimate bypass test function called');
}

function testAllAssetTypes() {
    console.log('Test all asset types function called');
}

function testCompleteWorkflowAllTypes() {
    console.log('Test complete workflow all types function called');
}

// One-click diagnostics (temporary)
window.__dbgAddTestAsset = function() {
    console.log('[PF] Debug: Adding test asset');
    const currentEmail = localStorage.getItem('pf_current_email');
    if (!currentEmail) { 
        console.warn('[PF] NOT SIGNED IN');
        return;
    }
    console.log('[PF] Debug: Current email:', currentEmail);
    console.log('[PF] Debug: Current origin:', location.origin);
    
    let portfolios = {};
    try { 
        portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}'); 
    } catch(e) { 
        console.log('[PF] Debug: Error parsing portfolios, resetting');
        portfolios = {}; 
    }
    
    if (!portfolios[currentEmail]) {
        portfolios[currentEmail] = {
            assets: {
                stocks: [],
                crypto: [],
                checking: [],
                savings: [],
                roth: [],
                'real-estate': [],
                vehicles: [],
                other: []
            },
            lastSync: new Date().toISOString()
        };
    }
    
    const testAsset = {
        id: Date.now() + '',
        category: 'other',
        name: 'Console Test',
        value: 42,
        type: 'static',
        mode: 'static',
        createdAt: new Date().toISOString()
    };
    
    portfolios[currentEmail].assets.other.push(testAsset);
    portfolios[currentEmail].lastSync = new Date().toISOString();
    
    console.log('[PF] Debug: About to write:', portfolios[currentEmail]);
    localStorage.setItem('pf_portfolios', JSON.stringify(portfolios));
    
    const after = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
    console.log('[PF] __dbgAddTestAsset result:', after[currentEmail]);
    
    const assetCount = after[currentEmail] ? after[currentEmail].assets.other.length : 0;
    console.log('[PF] Debug: Asset count after write:', assetCount);
};

// Close all modals
function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    console.log('[PF] All modals closed');
}

// Open profile modal
function openProfileModal() {
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.style.display = 'block';
        console.log('[PF] Profile modal opened');
    }
}

// Close profile modal
function closeProfileModal() {
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.style.display = 'none';
        console.log('[PF] Profile modal closed');
    }
}

// Close category modal
function closeCategoryModal() {
    const categoryModal = document.getElementById('categoryModal');
    if (categoryModal) {
        categoryModal.style.display = 'none';
        console.log('[PF] Category modal closed');
    }
}

// Price fetching function with multiple fallback options
async function fetchStockPrice(ticker) {
    console.log('[PF] Fetching price for ticker:', ticker);
    
    try {
        // Show loading indicator
        const priceLoader = document.getElementById('priceLoader');
        if (priceLoader) {
            priceLoader.style.display = 'inline-block';
        }
        
        // Try multiple price sources
        let price = null;
        
        // Method 1: Try Yahoo Finance (might have CORS issues)
        try {
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, {
                mode: 'no-cors'
            });
            
            // Note: no-cors mode doesn't allow reading response, so we'll use demo prices
            // This is a limitation of browser CORS policy
            throw new Error('CORS limitation - using demo prices');
            
        } catch (corsError) {
            console.log('[PF] CORS limitation detected, using demo prices');
        }
        
        // Method 2: Use demo prices based on ticker
        const demoPrices = {
            'AAPL': 175.50,
            'GOOGL': 2800.25,
            'MSFT': 350.75,
            'AMZN': 3200.00,
            'TSLA': 250.30,
            'META': 320.45,
            'NVDA': 450.80,
            'BTC': 45000.00,
            'ETH': 2800.50,
            'ADA': 0.45,
            'DOT': 6.25,
            'LINK': 14.30,
            'UNI': 6.80,
            'AAVE': 95.20,
            'SOL': 95.75
        };
        
        // Use demo price or generate a realistic random price
        if (demoPrices[ticker.toUpperCase()]) {
            price = demoPrices[ticker.toUpperCase()];
        } else {
            // Generate a realistic price based on ticker length (demo purposes)
            const basePrice = ticker.length * 25 + Math.random() * 100;
            price = Math.round(basePrice * 100) / 100;
        }
        
        console.log('[PF] Using demo price:', price);
        
        // Update price display
        const priceElement = document.getElementById('currentPrice');
        if (priceElement) {
            priceElement.textContent = `$${price.toFixed(2)} (demo)`;
        }
        
        showNotification(`Demo price loaded for ${ticker.toUpperCase()}: $${price.toFixed(2)}`, 'info');
        return price;
        
    } catch (error) {
        console.error('[PF] Error fetching price:', error);
        
        // Final fallback price
        const defaultPrice = 100.00;
        const priceElement = document.getElementById('currentPrice');
        if (priceElement) {
            priceElement.textContent = `$${defaultPrice.toFixed(2)} (default)`;
        }
        
        showNotification(`Using default price for ${ticker}: $${defaultPrice.toFixed(2)}`, 'warning');
        return defaultPrice;
        
    } finally {
        // Hide loading indicator
        const priceLoader = document.getElementById('priceLoader');
        if (priceLoader) {
            priceLoader.style.display = 'none';
        }
    }
}

// Manual price setting function
function setManualPrice() {
    const ticker = document.getElementById('stockTicker').value.trim().toUpperCase();
    if (!ticker) {
        showNotification('Please enter a ticker symbol first', 'error');
        return;
    }
    
    const manualPrice = prompt(`Enter current price for ${ticker}:`);
    if (manualPrice && !isNaN(parseFloat(manualPrice))) {
        const price = parseFloat(manualPrice);
        const priceElement = document.getElementById('currentPrice');
        if (priceElement) {
            priceElement.textContent = `$${price.toFixed(2)}`;
        }
        showNotification(`Price set to $${price.toFixed(2)}`, 'success');
    }
}

// DEBUG: Authentication and user data test
window.debugAuth = function() {
    console.log('🔐 DEBUG: Testing Authentication');
    console.log('='.repeat(50));
    
    // Check current email
    const currentEmail = localStorage.getItem('pf_current_email');
    console.log('Current email in localStorage:', currentEmail);
    
    // Check current user object
    console.log('Current user object:', currentUser);
    
    // Check users data
    try {
        const users = JSON.parse(localStorage.getItem('pf_users') || '{}');
        console.log('Users in localStorage:', Object.keys(users));
        
        if (currentEmail && users[currentEmail]) {
            console.log('✅ User found in users data');
            console.log('User data:', users[currentEmail]);
        } else {
            console.log('❌ User NOT found in users data');
            if (currentEmail) {
                console.log('Available users:', Object.keys(users));
            }
        }
    } catch (error) {
        console.log('❌ Error reading users data:', error.message);
    }
    
    // Check portfolios data
    try {
        const portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
        console.log('Portfolios in localStorage:', Object.keys(portfolios));
        
        if (currentEmail && portfolios[currentEmail]) {
            console.log('✅ User portfolio found');
            const userPortfolio = portfolios[currentEmail];
            console.log('Portfolio data:', userPortfolio);
        } else {
            console.log('❌ User portfolio NOT found');
            if (currentEmail) {
                console.log('Available portfolios:', Object.keys(portfolios));
            }
        }
    } catch (error) {
        console.log('❌ Error reading portfolios data:', error.message);
    }
    
    console.log('🔐 DEBUG: Authentication Test Complete');
};

// DEBUG: Fix authentication issues
window.fixAuth = function(email, password) {
    console.log('🔧 FIXING AUTHENTICATION');
    console.log('='.repeat(50));
    
    if (!email || !password) {
        console.log('❌ Please provide email and password');
        console.log('Usage: window.fixAuth("your-email@example.com", "your-password")');
        return;
    }
    
    // Create user if doesn't exist
    const users = JSON.parse(localStorage.getItem('pf_users') || '{}');
    if (!users[email]) {
        console.log('Creating new user account...');
        const passwordHash = btoa(password);
        users[email] = {
            passwordHash: passwordHash,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('pf_users', JSON.stringify(users));
        console.log('✅ User account created');
    } else {
        console.log('✅ User account already exists');
    }
    
    // Create portfolio if doesn't exist
    const portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
    if (!portfolios[email]) {
        console.log('Creating new portfolio...');
        portfolios[email] = {
            assets: {
                stocks: [],
                crypto: [],
                checking: [],
                savings: [],
                roth: [],
                'real-estate': [],
                vehicles: [],
                other: []
            },
            lastSync: new Date().toISOString()
        };
        localStorage.setItem('pf_portfolios', JSON.stringify(portfolios));
        console.log('✅ Portfolio created');
    } else {
        console.log('✅ Portfolio already exists');
    }
    
    // Sign in the user
    currentUser = { email: email };
    localStorage.setItem('pf_current_email', email);
    console.log('✅ User signed in');
    
    // Load portfolio and update UI
    loadUserPortfolio();
    renderProfileView();
    updateDisplay();
    
    console.log('🔧 AUTHENTICATION FIXED');
    console.log('You should now be signed in as:', email);
};

// DEBUG: Comprehensive asset saving test
window.debugAssetSaving = function() {
    console.log('🔴 DEBUG: Testing Asset Saving');
    console.log('Current email:', localStorage.getItem('pf_current_email'));
    console.log('Current user:', currentUser);
    console.log('Current adding category:', currentAddingCategory);
    console.log('Portfolio state:', portfolio);
    
    // Test form elements
    const assetForm = document.getElementById('assetForm');
    const assetName = document.getElementById('assetName');
    const stockTicker = document.getElementById('stockTicker');
    const dynamicInput = document.getElementById('dynamicInput');
    const addAssetBtn = document.getElementById('addAssetBtn');
    
    console.log('Form elements:');
    console.log('- assetForm:', assetForm ? 'EXISTS' : 'MISSING');
    console.log('- assetName:', assetName ? 'EXISTS' : 'MISSING');
    console.log('- stockTicker:', stockTicker ? 'EXISTS' : 'MISSING');
    console.log('- dynamicInput:', dynamicInput ? 'EXISTS' : 'MISSING');
    console.log('- addAssetBtn:', addAssetBtn ? 'EXISTS' : 'MISSING');
    
    if (assetForm) {
        console.log('Form onsubmit attribute:', assetForm.getAttribute('onsubmit'));
    }
    
    // Test localStorage
    try {
        const portfolios = JSON.parse(localStorage.getItem('pf_portfolios') || '{}');
        const currentEmail = localStorage.getItem('pf_current_email');
        if (currentEmail && portfolios[currentEmail]) {
            console.log('User portfolio exists in localStorage');
            let totalAssets = 0;
            Object.keys(portfolios[currentEmail].assets).forEach(category => {
                const count = portfolios[currentEmail].assets[category].length;
                totalAssets += count;
                if (count > 0) {
                    console.log(`${category}: ${count} assets`);
                }
            });
            console.log(`Total assets: ${totalAssets}`);
        } else {
            console.log('No user portfolio found in localStorage');
        }
    } catch (error) {
        console.log('Error reading localStorage:', error.message);
    }
    
    console.log('🔴 DEBUG: Asset Saving Test Complete');
};