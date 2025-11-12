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
        
        if (!result.timeSlots || result.timeSlots.length === 0) {
            container.innerHTML = '<div class="no-data">Geen productiviteit data voor deze datum</div>';
            return;
        }
        
        // Filter time slots to only include those with activity
        const activeTimeSlots = [];
        const slotTotals = {};
        
        result.timeSlots.forEach(slot => {
            let slotTotal = 0;
            for (let i = 0; i <= 5; i++) {
                const stationKey = 'Station ' + i;
                if (result.data[stationKey] && result.data[stationKey][slot]) {
                    slotTotal += result.data[stationKey][slot];
                }
            }
            if (slotTotal > 0) {
                activeTimeSlots.push(slot);
                slotTotals[slot] = slotTotal;
            }
        });
        
        if (activeTimeSlots.length === 0) {
            container.innerHTML = '<div class="no-data">Geen productiviteit data voor deze datum</div>';
            return;
        }
        
        // Calculate separate averages for machine (Station 0) and manual stations (1-5)
        let machineTotal = 0;
        let machineNonZeroCount = 0;
        let manualTotal = 0;
        let manualNonZeroCount = 0;
        
        // Station 0 - Machine
        const station0Key = 'Station 0';
        if (result.data[station0Key]) {
            activeTimeSlots.forEach(slot => {
                const value = result.data[station0Key][slot] || 0;
                if (value > 0) {
                    machineTotal += value;
                    machineNonZeroCount++;
                }
            });
        }
        
        // Stations 1-5 - Manual
        for (let i = 1; i <= 5; i++) {
            const stationKey = 'Station ' + i;
            if (result.data[stationKey]) {
                activeTimeSlots.forEach(slot => {
                    const value = result.data[stationKey][slot] || 0;
                    if (value > 0) {
                        manualTotal += value;
                        manualNonZeroCount++;
                    }
                });
            }
        }
        
        const machineAverage = machineNonZeroCount > 0 ? machineTotal / machineNonZeroCount : 0;
        const manualAverage = manualNonZeroCount > 0 ? manualTotal / manualNonZeroCount : 0;
        
        const machineThreshold50 = machineAverage * 0.5;
        const manualThreshold50 = manualAverage * 0.5;
        
        // Build productivity table with active time slots only
        let html = '<table class="productivity-table"><thead><tr><th>Station</th>';
        
        // Add active time slots to header
        activeTimeSlots.forEach(slot => {
            html += `<th>${slot}</th>`;
        });
        
        html += '<th>Totaal</th></tr></thead><tbody>';
        
        // Add rows for each station with gradient color coding
        for (let i = 0; i <= 5; i++) {
            const stationKey = 'Station ' + i;
            let stationTotal = 0;
            
            // Determine which average to use
            const isMachine = (i === 0);
            const avgToUse = isMachine ? machineAverage : manualAverage;
            const threshold50ToUse = isMachine ? machineThreshold50 : manualThreshold50;
            
            // Add station label with type indicator
            const stationType = isMachine ? ' (Machine)' : '';
            html += `<tr><td class="station-name">Station ${i}${stationType}</td>`;
            
            activeTimeSlots.forEach(slot => {
                const count = result.data[stationKey] && result.data[stationKey][slot] ? result.data[stationKey][slot] : 0;
                stationTotal += count;
                
                // Apply gradient color coding based on appropriate average
                let cellClass = '';
                let cellContent = count;
                
                if (count === 0) {
                    cellClass = 'no-value';  // No color for zero values
                } else if (count >= avgToUse) {
                    cellClass = 'above-average';  // Green
                } else if (count >= threshold50ToUse) {
                    cellClass = 'below-average';  // Orange
                } else {
                    cellClass = 'way-below-average';  // Red
                }
                
                html += `<td class="${cellClass}">${cellContent}</td>`;
            });
            
            // Add total column
            let totalClass = '';
            if (stationTotal === 0) {
                totalClass = 'station-total';
            } else {
                // Use appropriate average for total column coloring
                const expectedTotal = avgToUse * activeTimeSlots.length;
                if (stationTotal >= expectedTotal * 0.8) {
                    totalClass = 'station-total above-average';
                } else if (stationTotal >= expectedTotal * 0.5) {
                    totalClass = 'station-total below-average';
                } else {
                    totalClass = 'station-total way-below-average';
                }
            }
            html += `<td class="${totalClass}">${stationTotal}</td>`;
            html += '</tr>';
        }
        
        // Add separator row between machine and manual totals
        html += '<tr class="separator-row"><td colspan="' + (activeTimeSlots.length + 2) + '"></td></tr>';
        
        // Add manual stations total row
        html += '<tr class="subtotals-row"><td class="station-name"><strong>Totaal Handmatig (1-5)</strong></td>';
        
        let manualGrandTotal = 0;
        activeTimeSlots.forEach(slot => {
            let manualSlotTotal = 0;
            for (let i = 1; i <= 5; i++) {
                const stationKey = 'Station ' + i;
                manualSlotTotal += result.data[stationKey] && result.data[stationKey][slot] ? result.data[stationKey][slot] : 0;
            }
            manualGrandTotal += manualSlotTotal;
            
            // Color code based on manual average
            let cellClass = '';
            const slotAverage = manualSlotTotal / 5;  // Average per manual station for this slot
            
            if (manualSlotTotal === 0) {
                cellClass = 'no-value';
            } else if (slotAverage >= manualAverage) {
                cellClass = 'above-average';
            } else if (slotAverage >= manualThreshold50) {
                cellClass = 'below-average';
            } else {
                cellClass = 'way-below-average';
            }
            
            html += `<td class="${cellClass}"><strong>${manualSlotTotal}</strong></td>`;
        });
        
        html += `<td class="station-total"><strong>${manualGrandTotal}</strong></td>`;
        html += '</tr>';
        
        // Add overall totals row
        html += '<tr class="totals-row"><td class="station-name"><strong>Totaal Alles</strong></td>';
        
        let grandTotal = 0;
        activeTimeSlots.forEach(slot => {
            const slotTotal = slotTotals[slot];
            grandTotal += slotTotal;
            html += `<td class="total-cell"><strong>${slotTotal}</strong></td>`;
        });
        
        html += `<td class="station-total"><strong>${grandTotal}</strong></td>`;
        html += '</tr>';
        
        html += '</tbody></table>';
        
        // Add legend with separate averages
        html += `
            <div class="productivity-legend">
                <span class="legend-title">Legenda:</span>
                <div class="legend-group">
                    <span class="legend-subtitle">Machine (Station 0):</span>
                    <span class="legend-item"><span class="color-box above-average"></span>≥${Math.round(machineAverage)}</span>
                    <span class="legend-item"><span class="color-box below-average"></span>${Math.round(machineThreshold50)}-${Math.round(machineAverage)}</span>
                    <span class="legend-item"><span class="color-box way-below-average"></span><${Math.round(machineThreshold50)}</span>
                </div>
                <div class="legend-group">
                    <span class="legend-subtitle">Handmatig (Station 1-5):</span>
                    <span class="legend-item"><span class="color-box above-average"></span>≥${Math.round(manualAverage)}</span>
                    <span class="legend-item"><span class="color-box below-average"></span>${Math.round(manualThreshold50)}-${Math.round(manualAverage)}</span>
                    <span class="legend-item"><span class="color-box way-below-average"></span><${Math.round(manualThreshold50)}</span>
                </div>
                <span class="legend-item"><span class="color-box no-value"></span>Geen activiteit (0)</span>
            </div>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading productivity data:', error);
        const container = document.getElementById('productivityData');
        container.innerHTML = `<div class="error">Fout: ${error.message}</div>`;
        throw error;
    }
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