// dashboard.js - Frontend JavaScript for Mail Processing Dashboard

let autoRefreshInterval;
const REFRESH_INTERVAL = 60000; // 60 seconds

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    loadAllData();
    setupEventListeners();
    startAutoRefresh();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', function() {
        loadAllData();
    });
    
    document.getElementById('dateSelector').addEventListener('change', function() {
        updateDisplayDate();
        loadAllData();
    });
    
    document.getElementById('exportBPBtn').addEventListener('click', function() {
        exportBPPrealert();
    });
}

// Update display date
function updateDisplayDate() {
    const dateInput = document.getElementById('dateSelector').value;
    const date = new Date(dateInput);
    const formatted = date.toLocaleDateString('nl-NL');
    document.getElementById('displayDate').textContent = formatted;
}

// Load all data from APIs
async function loadAllData() {
    const date = document.getElementById('dateSelector').value;
    
    showLoading();
    
    try {
        await Promise.all([
            loadPostNLData(date),
            loadCarriersData(date),
            loadBPDetailData(date),
            loadProductivityData(date)
        ]);
        
        updateLastUpdateTime();
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Er is een fout opgetreden bij het laden van de data: ' + error.message);
    } finally {
        // Always hide loading state, even if there's an error
        hideLoading();
    }
}

// Load PostNL BIN data
async function loadPostNLData(date) {
    try {
        const response = await fetch(`./api/get_totals.php?date=${date}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        const tbody = document.getElementById('postnlData');
        tbody.innerHTML = '';
        
        result.data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.naam}</td>
                <td>${row.bin}</td>
                <td>${row.aantal}</td>
                <td>${row.gewicht}</td>
                <td>${row.gem}</td>
            `;
            tbody.appendChild(tr);
        });
        
        // Update totals
        const totalRow = document.getElementById('postnlTotal');
        totalRow.innerHTML = `
            <tr class="total-row">
                <td><strong>Totaal</strong></td>
                <td></td>
                <td><strong>${result.totals.aantal}</strong></td>
                <td><strong>${result.totals.gewicht}</strong></td>
                <td></td>
            </tr>
        `;
    } catch (error) {
        console.error('Error loading PostNL data:', error);
        const tbody = document.getElementById('postnlData');
        tbody.innerHTML = `<tr><td colspan="5" class="error">Fout: ${error.message}</td></tr>`;
        throw error;
    }
}

// Load other carriers data
async function loadCarriersData(date) {
    try {
        const response = await fetch(`./api/get_carriers.php?date=${date}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        const tbody = document.getElementById('carriersData');
        tbody.innerHTML = '';
        
        result.data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.naam}</td>
                <td>${row.bin}</td>
                <td>${row.aantal}</td>
                <td>${row.gewicht}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading carriers data:', error);
        const tbody = document.getElementById('carriersData');
        tbody.innerHTML = `<tr><td colspan="4" class="error">Fout: ${error.message}</td></tr>`;
        throw error;
    }
}

// Load BP detail data
async function loadBPDetailData(date) {
    try {
        const response = await fetch(`./api/get_bp_detail.php?date=${date}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        const tbody = document.getElementById('bpDetailData');
        tbody.innerHTML = '';
        
        if (result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">Geen BusinessPost data voor deze datum</td></tr>';
            return;
        }
        
        result.data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.bp_code}</td>
                <td>${row.location}</td>
                <td>${row.prealert_code}</td>
                <td>${row.aantal}</td>
                <td>${row.gewicht}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading BP detail data:', error);
        const tbody = document.getElementById('bpDetailData');
        tbody.innerHTML = `<tr><td colspan="5" class="error">Fout: ${error.message}</td></tr>`;
        throw error;
    }
}

// Load productivity data
async function loadProductivityData(date) {
    try {
        const response = await fetch(`./api/get_productivity.php?date=${date}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        const container = document.getElementById('productivityData');
        
        if (Object.keys(result.data).length === 0) {
            container.innerHTML = '<div class="no-data">Geen productiviteit data voor deze datum</div>';
            return;
        }
        
        // Build productivity table
        let html = '<table class="productivity-table"><thead><tr><th>Station</th>';
        
        // Filter time slots to only show hours with data
        const activeSlots = getActiveSlotsFromData(result.data);
        
        activeSlots.forEach(slot => {
            html += `<th>${slot}</th>`;
        });
        
        html += '</tr></thead><tbody>';
        
        // Add rows for each station
        for (let i = 0; i <= 5; i++) {
            const stationKey = 'Station ' + i;
            html += `<tr><td><strong>${stationKey}</strong></td>`;
            
            activeSlots.forEach(slot => {
                const count = result.data[stationKey] && result.data[stationKey][slot] ? result.data[stationKey][slot] : 0;
                const cellClass = count > 0 ? 'has-data' : '';
                html += `<td class="${cellClass}">${count > 0 ? count : '-'}</td>`;
            });
            
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading productivity data:', error);
        const container = document.getElementById('productivityData');
        container.innerHTML = `<div class="error">Fout: ${error.message}</div>`;
        throw error;
    }
}

// Get active time slots from productivity data
function getActiveSlotsFromData(data) {
    const slots = new Set();
    
    for (const station in data) {
        for (const slot in data[station]) {
            slots.add(slot);
        }
    }
    
    return Array.from(slots).sort();
}

// Export BP prealert
function exportBPPrealert() {
    const date = document.getElementById('dateSelector').value;
    window.location.href = `./api/export_bp_prealert.php?date=${date}`;
}

// Update last update timestamp
function updateLastUpdateTime() {
    const now = new Date();
    const formatted = now.toLocaleString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = formatted;
}

// Show loading state
function showLoading() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<span class="refresh-icon rotating">⟳</span> Loading...';
}

// Hide loading state
function hideLoading() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<span class="refresh-icon">⟳</span> REFRESH DATA';
}

// Show error message
function showError(message) {
    console.error('Dashboard error:', message);
    alert('Er is een fout opgetreden bij het laden van de data: ' + message);
}

// Auto refresh
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadAllData();
    }, REFRESH_INTERVAL);
}

// Stop auto refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}