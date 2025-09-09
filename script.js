// Enhanced Portfolio data structure with real-time price tracking
let portfolio = {
    stocks: [],
    roth: [],
    checking: [],
    savings: [],
    crypto: [],
    'real-estate': [],
    vehicles: [],
    other: []
};

// Enhanced price cache with timestamps and change tracking
let priceCache = {};
let previousPrices = {};
let priceUpdateCallbacks = [];

// Real-time price update indicators
let isUpdatingPrices = false;
let lastUpdateTime = null;

// Chart instance
let portfolioChart;
let currentChartType = 'line';

// DOM elements
const assetModal = document.getElementById('assetModal');
const categoryModal = document.getElementById('categoryModal');
const categoryModalTitle = document.getElementById('categoryModalTitle');
const categoryAssetsList = document.getElementById('categoryAssetsList');
const addToCategoryBtn = document.getElementById('addToCategoryBtn');

// Initialize the dashboard with enhanced real-time features
document.addEventListener('DOMContentLoaded', function() {
    // Register the datalabels plugin
    Chart.register(ChartDataLabels);
    
    loadPortfolio();
    initializeChart();
    setupModals();
    setupCategoryModal();
    updateDisplay();
    
    // Add price update indicator
    addPriceUpdateIndicator();
    
    // Enhanced auto-update system
    startRealTimePriceUpdates();
    
    // Add visibility change handler to pause/resume updates when tab is not active
    document.addEventListener('visibilitychange', handleVisibilityChange);
});

// Load portfolio from localStorage
function loadPortfolio() {
    const saved = localStorage.getItem('portfolio');
    if (saved) {
        portfolio = JSON.parse(saved);
    }
}

// Save portfolio to localStorage
function savePortfolio() {
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
}

// Initialize the chart
function initializeChart() {
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    
    if (currentChartType === 'line') {
        // Remove pie chart class if it exists
        document.querySelector('.graph-container').classList.remove('pie-chart-active');
        
        // Create sample data for Coinbase-style line chart
        const labels = [];
        const data = [];
        const now = new Date();
        
        // Generate 24 hours of data points
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
            labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
            
            // Generate realistic price movement
            const basePrice = 4000;
            const variation = Math.sin(i * 0.3) * 200 + Math.random() * 100;
            data.push(basePrice + variation);
        }
        
        portfolioChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Portfolio Value',
                    data: data,
                    borderColor: '#0052ff',
                    backgroundColor: 'rgba(0, 82, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#0052ff',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1a1a1a',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#2a2a2a',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `$${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        display: false
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverRadius: 4
                    }
                }
            }
        });
    } else if (currentChartType === 'pie') {
        // Create pie chart data from portfolio
        const chartData = getPieChartData();
        
        // Add class to make pie chart larger
        document.querySelector('.graph-container').classList.add('pie-chart-active');
        
        // Calculate total portfolio value
        const totalValue = chartData.data.reduce((sum, value) => sum + value, 0);
        
        portfolioChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.data,
                    backgroundColor: chartData.colors,
                    borderColor: '#000000',
                    borderWidth: 2,
                    hoverBorderColor: '#ffffff',
                    hoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1a1a1a',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#2a2a2a',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                const formattedValue = formatZillowPrice(value);
                                return `${label}: ${formattedValue} (${percentage}%)`;
                            }
                        }
                    },
                    // Custom plugin to display total value in center
                    customCenterText: {
                        id: 'customCenterText',
                        beforeDraw: function(chart) {
                            const { ctx, chartArea: { left, top, width, height } } = chart;
                            
                            ctx.save();
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            // Format total value using Zillow-style formatting
                            const displayValue = formatZillowPrice(totalValue);
                            
                            // Draw total value
                            ctx.font = 'bold 24px Inter, sans-serif';
                            ctx.fillStyle = '#ffffff';
                            ctx.fillText(displayValue, left + width / 2, top + height / 2 - 10);
                            
                            // Draw "Total Portfolio" label
                            ctx.font = '14px Inter, sans-serif';
                            ctx.fillStyle = '#999999';
                            ctx.fillText('Total Portfolio', left + width / 2, top + height / 2 + 20);
                            
                            ctx.restore();
                        }
                    },
                    datalabels: {
                        color: function(context) {
                            // Get the background color of the slice and make text blend with it
                            const backgroundColor = context.dataset.backgroundColor[context.dataIndex];
                            return backgroundColor;
                        },
                        font: {
                            weight: 'bold',
                            size: 16,
                            family: 'Inter, sans-serif'
                        },
                        formatter: function(value, context) {
                            return formatZillowPrice(value);
                        },
                        anchor: 'center',
                        align: 'center',
                        offset: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: 6,
                        padding: 6
                    }
                }
            }
        });
    }
}

// Format value like Zillow prices
function formatZillowPrice(value) {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}k`;
    } else {
        return `$${value.toLocaleString()}`;
    }
}

// Get pie chart data from portfolio
function getPieChartData() {
    const categoryConfig = {
        'stocks': { name: 'Stocks', color: '#0052ff' },
        'roth': { name: 'Roth IRA', color: '#00d4aa' },
        'checking': { name: 'Checking', color: '#00d4aa' },
        'savings': { name: 'Savings', color: '#00d4aa' },
        'crypto': { name: 'Crypto', color: '#f7931a' },
        'real-estate': { name: 'Real Estate', color: '#ff6b35' },
        'vehicles': { name: 'Vehicles', color: '#ff6b35' },
        'other': { name: 'Other Assets', color: '#8e44ad' }
    };
    
    const labels = [];
    const data = [];
    const colors = [];
    
    // Calculate totals for each category
    for (const [category, config] of Object.entries(categoryConfig)) {
        const total = portfolio[category].reduce((sum, asset) => sum + (asset.value || 0), 0);
        if (total > 0) {
            labels.push(config.name);
            data.push(total);
            colors.push(config.color);
        }
    }
    
    // Special handling for cash (combine checking and savings)
    const checkingIndex = labels.findIndex(label => label.includes('Checking'));
    const savingsIndex = labels.findIndex(label => label.includes('Savings'));
    
    let cashTotal = 0;
    if (checkingIndex !== -1) {
        cashTotal += data[checkingIndex];
        labels.splice(checkingIndex, 1);
        data.splice(checkingIndex, 1);
        colors.splice(checkingIndex, 1);
    }
    if (savingsIndex !== -1) {
        const newSavingsIndex = labels.findIndex(label => label.includes('Savings'));
        if (newSavingsIndex !== -1) {
            cashTotal += data[newSavingsIndex];
            labels.splice(newSavingsIndex, 1);
            data.splice(newSavingsIndex, 1);
            colors.splice(newSavingsIndex, 1);
        }
    }
    
    // Add combined cash entry
    if (cashTotal > 0) {
        labels.unshift('Cash');
        data.unshift(cashTotal);
        colors.unshift('#00d4aa');
    }
    
    // If no data, show placeholder
    if (data.length === 0) {
        labels.push('No Assets');
        data.push(1);
        colors.push('#666666');
    }
    
    return { labels, data, colors };
}

// Update the chart with real portfolio data
function updateChart() {
    if (!portfolioChart) return;
    
    if (currentChartType === 'line') {
        const totalValue = calculateTotalValue();
        const labels = [];
        const data = [];
        const now = new Date();
        
        // Generate 24 hours of data points based on current total
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
            labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
            
            // Generate realistic price movement around current total
            const variation = Math.sin(i * 0.3) * (totalValue * 0.05) + (Math.random() - 0.5) * (totalValue * 0.02);
            data.push(Math.max(0, totalValue + variation));
        }
        
        portfolioChart.data.labels = labels;
        portfolioChart.data.datasets[0].data = data;
        portfolioChart.update('none');
    } else if (currentChartType === 'pie') {
        const chartData = getPieChartData();
        portfolioChart.data.labels = chartData.labels;
        portfolioChart.data.datasets[0].data = chartData.data;
        portfolioChart.data.datasets[0].backgroundColor = chartData.colors;
        portfolioChart.update('active');
    }
}

// Switch between chart types
function switchChartType(type) {
    if (currentChartType === type) return;
    
    currentChartType = type;
    
    // Update button states
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Destroy existing chart
    if (portfolioChart) {
        portfolioChart.destroy();
    }
    
    // Reinitialize chart with new type
    initializeChart();
}



// Calculate total portfolio value
function calculateTotalValue() {
    let total = 0;
    for (const category in portfolio) {
        portfolio[category].forEach(asset => {
            total += asset.value || 0;
        });
    }
    return total;
}

// Calculate daily change (simulated for demo)
function calculateDailyChange() {
    const total = calculateTotalValue();
    const change = total * 0.0191; // 1.91% change as shown in image
    return {
        amount: change,
        percent: 1.91
    };
}

// Update all displays
function updateDisplay() {
    const total = calculateTotalValue();
    const dailyChange = calculateDailyChange();
    
    // Update total balance
    document.getElementById('totalAmount').textContent = total.toLocaleString();
    
    // Update daily change
    document.getElementById('dailyChange').textContent = dailyChange.amount.toFixed(2);
    document.getElementById('dailyChangePercent').textContent = dailyChange.percent.toFixed(2);
    
    // Update category amounts
    updateCategoryAmounts();
    
    // Update chart
    updateChart();
    
    // Update crypto listings with real data
    updateCryptoListings();
}

// Update category amounts
function updateCategoryAmounts() {
    const categories = {
        'stocks': 'stocksAmount',
        'roth': 'rothAmount', 
        'checking': 'checkingAmount',
        'savings': 'savingsAmount',
        'crypto': 'cryptoAmount',
        'real-estate': 'realEstateAmount',
        'vehicles': 'vehiclesAmount',
        'other': 'otherAmount'
    };
    
    for (const [category, elementId] of Object.entries(categories)) {
        const total = portfolio[category].reduce((sum, asset) => sum + (asset.value || 0), 0);
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `$${total.toLocaleString()}`;
        }
    }
    
    // Update the asset breakdown display
    updateAssetBreakdown();
}

function updateAssetBreakdown() {
    const assetBreakdown = document.getElementById('assetBreakdown');
    if (!assetBreakdown) return;
    
    const categoryConfig = {
        'stocks': { name: 'Stocks', icon: '📈', color: '#0052ff' },
        'roth': { name: 'Roth IRA', icon: '🏦', color: '#00d4aa' },
        'checking': { name: 'Checking', icon: '💰', color: '#00d4aa' },
        'savings': { name: 'Savings', icon: '🏛️', color: '#00d4aa' },
        'crypto': { name: 'Crypto', icon: '₿', color: '#f7931a' },
        'real-estate': { name: 'Real Estate', icon: '🏠', color: '#ff6b35' },
        'vehicles': { name: 'Vehicles', icon: '🚗', color: '#ff6b35' },
        'other': { name: 'Other Assets', icon: '📦', color: '#8e44ad' }
    };
    
    let html = '';
    
    // Calculate totals for each category
    const categoryTotals = {};
    for (const [category, config] of Object.entries(categoryConfig)) {
        const total = portfolio[category].reduce((sum, asset) => sum + (asset.value || 0), 0);
        if (total > 0) {
            categoryTotals[category] = total;
        }
    }
    
    // Special handling for cash (checking + savings)
    const cashTotal = (categoryTotals.checking || 0) + (categoryTotals.savings || 0);
    if (cashTotal > 0) {
        html += `
            <div class="asset-item" onclick="viewCategory('cash')">
                <div class="asset-icon">💰</div>
                <div class="asset-info">
                    <div class="asset-name">Cash</div>
                    <div class="asset-amount">$${cashTotal.toLocaleString()}</div>
                </div>
                <div class="asset-arrow">→</div>
            </div>
        `;
    }
    
    // Add other categories that have assets
    for (const [category, config] of Object.entries(categoryConfig)) {
        if (category !== 'checking' && category !== 'savings' && categoryTotals[category]) {
            html += `
                <div class="asset-item" onclick="viewCategory('${category}')">
                    <div class="asset-icon">${config.icon}</div>
                    <div class="asset-info">
                        <div class="asset-name">${config.name}</div>
                        <div class="asset-amount">$${categoryTotals[category].toLocaleString()}</div>
                    </div>
                    <div class="asset-arrow">→</div>
                </div>
            `;
        }
    }
    
    // If no assets, show a placeholder
    if (!html) {
        html = `
            <div class="asset-item empty-state">
                <div class="asset-icon">📊</div>
                <div class="asset-info">
                    <div class="asset-name">No Assets Yet</div>
                    <div class="asset-amount">Add your first asset to get started</div>
                </div>
            </div>
        `;
    }
    
    assetBreakdown.innerHTML = html;
}

// Enhanced crypto listings with real-time price changes
function updateCryptoListings() {
    const cryptoListings = document.getElementById('cryptoListings');
    if (!cryptoListings) return;
    
    let html = '';
    
    if (portfolio.crypto.length === 0) {
        // Show sample data with live prices
        html = `
            <div class="crypto-item sample-item">
                <div class="crypto-left">
                    <div class="crypto-icon">₿</div>
                    <div class="crypto-info">
                        <div class="crypto-name">Bitcoin</div>
                        <div class="crypto-symbol">BTC</div>
                    </div>
                </div>
                <div class="crypto-center">
                    <div class="mini-chart">📈</div>
                </div>
                <div class="crypto-right">
                    <div class="crypto-price" id="btc-sample-price">$0.00</div>
                    <div class="crypto-change" id="btc-sample-change">-</div>
                </div>
            </div>
            <div class="crypto-item sample-item">
                <div class="crypto-left">
                    <div class="crypto-icon">Ξ</div>
                    <div class="crypto-info">
                        <div class="crypto-name">Ethereum</div>
                        <div class="crypto-symbol">ETH</div>
                    </div>
                </div>
                <div class="crypto-center">
                    <div class="mini-chart">📈</div>
                </div>
                <div class="crypto-right">
                    <div class="crypto-price" id="eth-sample-price">$0.00</div>
                    <div class="crypto-change" id="eth-sample-change">-</div>
                </div>
            </div>
        `;
        
        // Fetch sample prices
        fetchSampleCryptoPrices();
    } else {
        // Show real crypto assets from portfolio with live updates
        portfolio.crypto.forEach((asset, index) => {
            const changeClass = asset.lastPriceChange > 0 ? 'positive' : asset.lastPriceChange < 0 ? 'negative' : '';
            const changeSymbol = asset.lastPriceChange > 0 ? '↗' : asset.lastPriceChange < 0 ? '↘' : '';
            const changePercent = Math.abs(asset.lastPercentChange || 0).toFixed(2);
            
            html += `
                <div class="crypto-item" onclick="viewCategory('crypto')">
                    <div class="crypto-left">
                        <div class="crypto-icon">${asset.name.charAt(0).toUpperCase()}</div>
                        <div class="crypto-info">
                            <div class="crypto-name">${asset.name}</div>
                            <div class="crypto-symbol">${asset.ticker || asset.name.toUpperCase()}</div>
                        </div>
                    </div>
                    <div class="crypto-center">
                        <div class="mini-chart">📈</div>
                    </div>
                    <div class="crypto-right">
                        <div class="crypto-price" id="crypto-price-${index}">$${(asset.price || 0).toFixed(2)}</div>
                        <div class="crypto-change ${changeClass}" id="crypto-change-${index}">
                            ${changeSymbol} ${changePercent}%
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    cryptoListings.innerHTML = html;
}

// Fetch sample crypto prices for display
async function fetchSampleCryptoPrices() {
    try {
        const btcPrice = await fetchCryptoPrice('bitcoin');
        const ethPrice = await fetchCryptoPrice('ethereum');
        
        const btcPriceEl = document.getElementById('btc-sample-price');
        const ethPriceEl = document.getElementById('eth-sample-price');
        
        if (btcPriceEl && btcPrice > 0) {
            btcPriceEl.textContent = `$${btcPrice.toLocaleString()}`;
        }
        if (ethPriceEl && ethPrice > 0) {
            ethPriceEl.textContent = `$${ethPrice.toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error fetching sample crypto prices:', error);
    }
}

// Setup modal functionality
function setupModals() {
    const modal = document.getElementById('assetModal');
    const closeBtn = modal.querySelector('.close');
    const form = document.getElementById('assetForm');
    
    // Close modal
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
    
    // Form submission
    form.onsubmit = function(e) {
        e.preventDefault();
        addAssetToPortfolio();
    }
    
    // Setup input type selector
    const inputTypeSelector = document.getElementById('inputTypeSelector');
    const tickerInputs = document.getElementById('tickerInputs');
    const staticInput = document.getElementById('staticInput');
    const tickerRadio = document.getElementById('tickerRadio');
    const staticRadio = document.getElementById('staticRadio');
    
    tickerRadio.onchange = function() {
        tickerInputs.style.display = 'block';
        staticInput.style.display = 'none';
        updateRequiredFields();
    }
    
    staticRadio.onchange = function() {
        tickerInputs.style.display = 'none';
        staticInput.style.display = 'block';
        updateRequiredFields();
    }
    
    // Setup ticker input
    const stockTicker = document.getElementById('stockTicker');
    const sharesOwned = document.getElementById('sharesOwned');
    const fetchPriceBtn = document.getElementById('fetchPriceBtn');
    
    stockTicker.oninput = function() {
        this.value = this.value.toUpperCase();
    }
    
    sharesOwned.oninput = function() {
        updateCalculatedValue();
    }
    
    fetchPriceBtn.onclick = function() {
        fetchPrice();
    }
}

// Update required fields based on input type
function updateRequiredFields() {
    const tickerRadio = document.getElementById('tickerRadio');
    const stockTicker = document.getElementById('stockTicker');
    const sharesOwned = document.getElementById('sharesOwned');
    const assetValue = document.getElementById('assetValue');
    
    if (tickerRadio.checked) {
        stockTicker.required = true;
        sharesOwned.required = true;
        assetValue.required = false;
    } else {
        stockTicker.required = false;
        sharesOwned.required = false;
        assetValue.required = true;
    }
}

// Update calculated value
function updateCalculatedValue() {
    const currentPrice = parseFloat(document.getElementById('currentPrice').textContent.replace('$', ''));
    const shares = parseFloat(document.getElementById('sharesOwned').value) || 0;
    const calculatedValue = currentPrice * shares;
    document.getElementById('calculatedValue').textContent = `$${calculatedValue.toFixed(2)}`;
}

// Add asset to portfolio
function addAssetToPortfolio() {
    const name = document.getElementById('assetName').value;
    const tickerRadio = document.getElementById('tickerRadio');
    const category = currentCategory;
    
    let asset = {
        name: name,
        value: 0,
        dateAdded: new Date().toISOString()
    };
    
    if (tickerRadio.checked) {
        const ticker = document.getElementById('stockTicker').value;
        const shares = parseFloat(document.getElementById('sharesOwned').value);
        const price = parseFloat(document.getElementById('currentPrice').textContent.replace('$', ''));
        
        asset.ticker = ticker;
        asset.shares = shares;
        asset.price = price;
        asset.value = price * shares;
        asset.type = 'ticker';
    } else {
        asset.value = parseFloat(document.getElementById('assetValue').value);
        asset.type = 'static';
    }
    
    portfolio[category].push(asset);
    savePortfolio();
    updateDisplay();
    
    // Close modal and reset form
    document.getElementById('assetModal').style.display = 'none';
    document.getElementById('assetForm').reset();
    document.getElementById('currentPrice').textContent = '$0.00';
    document.getElementById('calculatedValue').textContent = '$0.00';
    
    showNotification('Asset added successfully!');
}

// Current category for adding assets
let currentCategory = '';

// Add asset modal
function addAsset(category) {
    currentCategory = category;
    const modal = document.getElementById('assetModal');
    const modalTitle = document.getElementById('modalTitle');
    const inputTypeSelector = document.getElementById('inputTypeSelector');
    const tickerLabel = document.getElementById('tickerLabel');
    const tickerInputLabel = document.getElementById('tickerInputLabel');
    const quantityLabel = document.getElementById('quantityLabel');
    
    // Show/hide input type selector based on category
    if (category === 'stocks' || category === 'crypto') {
        inputTypeSelector.style.display = 'block';
        
        if (category === 'stocks') {
            modalTitle.textContent = 'Add Stock';
            tickerLabel.textContent = 'Stock Ticker & Shares (Auto-update price)';
            tickerInputLabel.textContent = 'Stock Ticker:';
            quantityLabel.textContent = 'Number of Shares:';
            document.getElementById('stockTicker').placeholder = 'e.g., AAPL';
            document.getElementById('sharesOwned').step = '0.01';
        } else {
            modalTitle.textContent = 'Add Cryptocurrency';
            tickerLabel.textContent = 'Crypto Ticker & Amount (Auto-update price)';
            tickerInputLabel.textContent = 'Crypto Ticker:';
            quantityLabel.textContent = 'Amount:';
            document.getElementById('stockTicker').placeholder = 'e.g., BTC';
            document.getElementById('sharesOwned').step = '0.000001';
        }
    } else {
        inputTypeSelector.style.display = 'none';
        document.getElementById('tickerInputs').style.display = 'none';
        document.getElementById('staticInput').style.display = 'block';
        
        const titles = {
            'roth': 'Add Roth IRA',
            'checking': 'Add Checking Account',
            'savings': 'Add Savings Account',
            'real-estate': 'Add Real Estate',
            'vehicles': 'Add Vehicle',
            'other': 'Add Asset'
        };
        modalTitle.textContent = titles[category] || 'Add Asset';
    }
    
    modal.style.display = 'block';
}

// Fetch price for ticker
async function fetchPrice() {
    const ticker = document.getElementById('stockTicker').value.toUpperCase();
    const category = currentCategory;
    const fetchBtn = document.getElementById('fetchPriceBtn');
    const currentPriceSpan = document.getElementById('currentPrice');
    
    if (!ticker) {
        showNotification('Please enter a ticker symbol', 'error');
        return;
    }
    
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<span class="loading"></span>Fetching...';
    
    try {
        let price = 0;
        
        if (category === 'crypto') {
            price = await fetchCryptoPrice(ticker);
        } else {
            price = await fetchStockPrice(ticker);
        }
        
        if (price > 0) {
            currentPriceSpan.textContent = `$${price.toFixed(2)}`;
            updateCalculatedValue();
            showNotification(`Price fetched: $${price.toFixed(2)}`);
        } else {
            showNotification('Failed to fetch price. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error fetching price:', error);
        showNotification('Error fetching price. Please try again.', 'error');
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Fetch Current Price';
    }
}

// Fetch stock price from Yahoo Finance
async function fetchStockPrice(ticker) {
    const cacheKey = `stock_${ticker}`;
    if (priceCache[cacheKey] && Date.now() - priceCache[cacheKey].timestamp < 60000) {
        return priceCache[cacheKey].price;
    }
    
    try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`);
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const price = data.chart.result[0].meta.regularMarketPrice;
            priceCache[cacheKey] = { price, timestamp: Date.now() };
            return price;
        }
    } catch (error) {
        console.error('Error fetching stock price:', error);
    }
    
    return 0;
}

// Enhanced crypto price fetching with multiple fallback APIs
async function fetchCryptoPrice(ticker) {
    const cacheKey = `crypto_${ticker}`;
    if (priceCache[cacheKey] && Date.now() - priceCache[cacheKey].timestamp < 30000) { // 30 second cache
        return priceCache[cacheKey].price;
    }
    
    const apis = [
        // CoinGecko API
        async () => {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ticker.toLowerCase()}&vs_currencies=usd`);
            const data = await response.json();
            return data[ticker.toLowerCase()]?.usd;
        },
        
        // Coinbase API
        async () => {
            const response = await fetch(`https://api.coinbase.com/v2/prices/${ticker}-USD/spot`);
            const data = await response.json();
            return parseFloat(data.data?.amount);
        },
        
        // CoinCap API as additional fallback
        async () => {
            const response = await fetch(`https://api.coincap.io/v2/assets/${ticker.toLowerCase()}`);
            const data = await response.json();
            return parseFloat(data.data?.priceUsd);
        }
    ];
    
    for (const api of apis) {
        try {
            const price = await api();
            if (price && price > 0) {
                priceCache[cacheKey] = { price, timestamp: Date.now() };
                return price;
            }
        } catch (error) {
            console.warn(`API call failed for ${ticker}:`, error);
            continue;
        }
    }
    
    return 0;
}

// Add visual indicator for price updates
function addPriceUpdateIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'priceUpdateIndicator';
    indicator.innerHTML = `
        <div class="update-indicator">
            <span class="update-dot"></span>
            <span class="update-text">Live</span>
            <span class="last-update" id="lastUpdateTime">Just now</span>
        </div>
    `;
    indicator.style.cssText = `
        position: fixed;
        top: 60px;
        right: 16px;
        background: rgba(0, 212, 170, 0.1);
        border: 1px solid #00d4aa;
        border-radius: 20px;
        padding: 6px 12px;
        font-size: 12px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    
    document.body.appendChild(indicator);
    
    // Add CSS for the pulsing dot
    const style = document.createElement('style');
    style.textContent += `
        .update-dot {
            width: 6px;
            height: 6px;
            background: #00d4aa;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        .update-indicator.updating .update-dot {
            animation: pulse 0.5s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        .update-text {
            color: #00d4aa;
            font-weight: 500;
        }
        
        .last-update {
            color: #888;
            font-size: 10px;
        }
    `;
    document.head.appendChild(style);
}

// Enhanced real-time price update system
function startRealTimePriceUpdates() {
    // Initial update after 1 second
    setTimeout(() => {
        updatePrices();
    }, 1000);
    
    // Smart update intervals based on market conditions
    setInterval(() => {
        const now = new Date();
        const hour = now.getHours();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        
        // More frequent updates during market hours (9 AM - 4 PM EST on weekdays)
        if (!isWeekend && hour >= 9 && hour <= 16) {
            updatePrices(); // Every 30 seconds during market hours
        } else {
            // Less frequent updates outside market hours
            if (Math.random() < 0.2) { // 20% chance = ~2.5 minutes average
                updatePrices();
            }
        }
    }, 30000); // Check every 30 seconds
    
    // Crypto updates more frequently (24/7 markets)
    setInterval(() => {
        updateCryptoPrices();
    }, 15000); // Every 15 seconds for crypto
    
    // Portfolio value recalculation every 10 seconds
    setInterval(() => {
        updatePortfolioValue();
    }, 10000);
}

// Update only crypto prices (for frequent crypto updates)
async function updateCryptoPrices() {
    if (isUpdatingPrices) return;
    
    const cryptoAssets = portfolio.crypto.filter(asset => asset.type === 'ticker' && asset.ticker);
    if (cryptoAssets.length === 0) return;
    
    for (const asset of cryptoAssets) {
        await updateAssetPrice('crypto', asset);
    }
    
    savePortfolio();
    updatePortfolioValue();
    updateCryptoListings();
}

// Enhanced price update function with better error handling and visual feedback
async function updatePrices() {
    if (isUpdatingPrices) return;
    
    isUpdatingPrices = true;
    const indicator = document.getElementById('priceUpdateIndicator');
    if (indicator) {
        indicator.classList.add('updating');
    }
    
    try {
        const promises = [];
        
        // Update all ticker-based assets
        for (const category in portfolio) {
            if (category === 'stocks' || category === 'crypto') {
                for (const asset of portfolio[category]) {
                    if (asset.type === 'ticker' && asset.ticker) {
                        promises.push(updateAssetPrice(category, asset));
                    }
                }
            }
        }
        
        // Wait for all price updates to complete
        await Promise.allSettled(promises);
        
        savePortfolio();
        updateDisplay();
        
        // Update last update time
        lastUpdateTime = new Date();
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Error updating prices:', error);
        showNotification('Error updating some prices', 'error');
    } finally {
        isUpdatingPrices = false;
        if (indicator) {
            indicator.classList.remove('updating');
        }
    }
}

// Update portfolio value without full display refresh
function updatePortfolioValue() {
    const total = calculateTotalValue();
    const dailyChange = calculateDailyChange();
    
    // Update total balance with smooth animation
    const totalElement = document.getElementById('totalAmount');
    if (totalElement) {
        animateValueChange(totalElement, total.toLocaleString());
    }
    
    // Update daily change
    const changeElement = document.getElementById('dailyChange');
    const percentElement = document.getElementById('dailyChangePercent');
    
    if (changeElement && percentElement) {
        changeElement.textContent = dailyChange.amount.toFixed(2);
        percentElement.textContent = dailyChange.percent.toFixed(2);
    }
}

// Animate value changes
function animateValueChange(element, newValue) {
    element.style.transition = 'all 0.3s ease';
    element.style.transform = 'scale(1.05)';
    element.textContent = newValue;
    
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 300);
}

// Handle visibility change to pause/resume updates when tab is not active
function handleVisibilityChange() {
    if (document.hidden) {
        // Tab is not active, reduce update frequency
        console.log('Tab hidden, reducing update frequency');
    } else {
        // Tab is active, resume normal updates
        console.log('Tab visible, resuming normal updates');
        setTimeout(updatePrices, 1000); // Update immediately when tab becomes active
    }
}

// Update last update time display
function updateLastUpdateTime() {
    const element = document.getElementById('lastUpdateTime');
    if (element && lastUpdateTime) {
        const now = new Date();
        const diff = Math.floor((now - lastUpdateTime) / 1000);
        
        if (diff < 60) {
            element.textContent = 'Just now';
        } else if (diff < 3600) {
            element.textContent = `${Math.floor(diff / 60)}m ago`;
        } else {
            element.textContent = `${Math.floor(diff / 3600)}h ago`;
        }
    }
}

// Update the last update time every 30 seconds
setInterval(updateLastUpdateTime, 30000);

// Manual refresh function
async function manualRefresh() {
    const refreshBtn = document.getElementById('manualRefreshBtn');
    if (!refreshBtn || isUpdatingPrices) return;
    
    // Add refreshing state
    refreshBtn.classList.add('refreshing');
    refreshBtn.disabled = true;
    
    try {
        showNotification('Refreshing prices...', 'info');
        await updatePrices();
        showNotification('Prices updated successfully!', 'success');
    } catch (error) {
        console.error('Manual refresh error:', error);
        showNotification('Failed to refresh prices', 'error');
    } finally {
        // Remove refreshing state
        setTimeout(() => {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.disabled = false;
        }, 1000);
    }
}

// Enhanced asset price update with change tracking
async function updateAssetPrice(category, asset) {
    if (!asset.ticker) return;
    
    const oldPrice = asset.price || 0;
    let newPrice = 0;
    
    if (category === 'crypto') {
        newPrice = await fetchCryptoPrice(asset.ticker);
    } else {
        newPrice = await fetchStockPrice(asset.ticker);
    }
    
    if (newPrice > 0 && newPrice !== oldPrice) {
        // Track price change
        const priceChange = newPrice - oldPrice;
        const percentChange = oldPrice > 0 ? ((priceChange / oldPrice) * 100) : 0;
        
        // Update asset
        asset.price = newPrice;
        asset.value = newPrice * (asset.shares || 1);
        asset.lastPriceChange = priceChange;
        asset.lastPercentChange = percentChange;
        asset.lastUpdated = new Date().toISOString();
        
        // Store previous price for comparison
        previousPrices[`${category}_${asset.ticker}`] = oldPrice;
    }
}

// View category assets
function viewCategory(category) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    
    const categoryNames = {
        'stocks': 'Stocks',
        'roth': 'Roth IRA',
        'checking': 'Checking Accounts',
        'savings': 'Savings Accounts',
        'crypto': 'Cryptocurrency',
        'real-estate': 'Real Estate',
        'vehicles': 'Vehicles',
        'other': 'Other Assets',
        'cash': 'Cash (Checking & Savings)'
    };
    
    title.textContent = categoryNames[category] || 'Assets';
    renderCategoryAssets(category);
    modal.style.display = 'block';
}

// Render category assets
function renderCategoryAssets(category) {
    const categoryAssetsList = document.getElementById('categoryAssetsList');
    
    // Special handling for cash category (combines checking and savings)
    if (category === 'cash') {
        const checkingAssets = portfolio.checking || [];
        const savingsAssets = portfolio.savings || [];
        const allCashAssets = [
            ...checkingAssets.map(asset => ({ ...asset, source: 'checking' })),
            ...savingsAssets.map(asset => ({ ...asset, source: 'savings' }))
        ];
        
        if (allCashAssets.length === 0) {
            categoryAssetsList.innerHTML = `
                <div class="empty-category">
                    <h3>No cash assets yet</h3>
                    <p>Add checking or savings accounts to get started!</p>
                </div>
            `;
            return;
        }
        
        // Sort assets by value (highest to lowest)
        const sortedAssets = [...allCashAssets].sort((a, b) => b.value - a.value);
        
        let html = '';
        sortedAssets.forEach(asset => {
            const details = [];
            details.push(`<strong>Type:</strong> ${asset.source === 'checking' ? 'Checking Account' : 'Savings Account'}`);
            if (asset.ticker) details.push(`<strong>Ticker:</strong> ${asset.ticker}`);
            if (asset.shares) details.push(`<strong>Shares:</strong> ${asset.shares}`);
            if (asset.price) details.push(`<strong>Price:</strong> $${asset.price.toFixed(2)}`);
            if (asset.type === 'static') details.push(`<strong>Type:</strong> Static Value`);
            
            html += `
                <div class="category-asset-item">
                    <div class="asset-item-header">
                        <div class="asset-item-name">${asset.name}</div>
                        <div class="asset-item-value">$${asset.value.toLocaleString()}</div>
                    </div>
                    <div class="asset-item-details">
                        ${details.map(detail => `<div class="asset-item-detail">${detail}</div>`).join('')}
                    </div>
                    <button class="delete-asset-btn" onclick="deleteAsset('${asset.source}', '${asset.name}')">Delete Asset</button>
                </div>
            `;
        });
        
        categoryAssetsList.innerHTML = html;
        return;
    }
    
    // Regular category handling
    const assets = portfolio[category];
    
    if (assets.length === 0) {
        categoryAssetsList.innerHTML = `
            <div class="empty-category">
                <h3>No assets yet</h3>
                <p>Add your first asset to get started!</p>
            </div>
        `;
        return;
    }
    
    // Sort assets by value (highest to lowest)
    const sortedAssets = [...assets].sort((a, b) => b.value - a.value);
    
    let html = '';
    sortedAssets.forEach(asset => {
        const details = [];
        if (asset.ticker) details.push(`<strong>Ticker:</strong> ${asset.ticker}`);
        if (asset.shares) details.push(`<strong>Shares:</strong> ${asset.shares}`);
        if (asset.price) details.push(`<strong>Price:</strong> $${asset.price.toFixed(2)}`);
        if (asset.type === 'static') details.push(`<strong>Type:</strong> Static Value`);
        
        html += `
            <div class="category-asset-item">
                <div class="asset-item-header">
                    <div class="asset-item-name">${asset.name}</div>
                    <div class="asset-item-value">$${asset.value.toLocaleString()}</div>
                </div>
                <div class="asset-item-details">
                    ${details.map(detail => `<div class="asset-item-detail">${detail}</div>`).join('')}
                </div>
                <button class="delete-asset-btn" onclick="deleteAsset('${category}', '${asset.name}')">Delete Asset</button>
            </div>
        `;
    });
    
    categoryAssetsList.innerHTML = html;
}

// Delete asset
function deleteAsset(category, assetName) {
    if (confirm(`Are you sure you want to delete "${assetName}"?`)) {
        portfolio[category] = portfolio[category].filter(asset => asset.name !== assetName);
        savePortfolio();
        updateDisplay();
        renderCategoryAssets(category);
        showNotification('Asset deleted successfully!');
    }
}

// Setup category modal
function setupCategoryModal() {
    const modal = document.getElementById('categoryModal');
    const closeBtn = modal.querySelector('.close');
    const addBtn = document.getElementById('addToCategoryBtn');
    
    closeBtn.onclick = function() {
        closeCategoryModal();
    }
    
    window.onclick = function(event) {
        if (event.target === modal) {
            closeCategoryModal();
        }
    }
    
    addBtn.onclick = function() {
        closeCategoryModal();
        // Get the current category from the modal title
        const title = document.getElementById('categoryModalTitle').textContent;
        const categoryMap = {
            'Stocks': 'stocks',
            'Roth IRA': 'roth',
            'Checking Accounts': 'checking',
            'Savings Accounts': 'savings',
            'Cryptocurrency': 'crypto',
            'Real Estate': 'real-estate',
            'Vehicles': 'vehicles',
            'Other Assets': 'other'
        };
        
        const category = categoryMap[title] || 'other';
        addAsset(category);
    }
}

// Close category modal
function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

// Enhanced notification system
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Set background color based on type
    let backgroundColor;
    switch (type) {
        case 'error':
            backgroundColor = '#ff4444';
            break;
        case 'info':
            backgroundColor = '#0052ff';
            break;
        case 'warning':
            backgroundColor = '#ff9500';
            break;
        default:
            backgroundColor = '#00d4aa';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds (or 2 seconds for info messages)
    const duration = type === 'info' ? 2000 : 3000;
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 
setInterval(updatePrices, 5 * 60 * 1000); 