<?php
// index.php - Main Dashboard Page
?>
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mail Processing Dashboard</title>
    <link rel="stylesheet" href="./css/style.css">
</head>
<body>
    <div class="container">
        <!-- Header Section -->
        <div class="header">
            <h1>Mail Processing Dashboard</h1>
            <div class="controls">
                <input type="date" id="dateSelector" value="<?php echo date('Y-m-d'); ?>">
                <button id="refreshBtn" class="btn-refresh">
                    <span class="refresh-icon">⟳</span> REFRESH DATA
                </button>
            </div>
        </div>

        <!-- PostNL Section (Top - Red Header) -->
        <div class="section postnl-section">
            <div class="section-header red-header">
                <h2>Totalen per BIN</h2>
            </div>
            <div class="date-display">
                <strong id="displayDate"><?php echo date('d/m/Y'); ?></strong>
            </div>
            <table class="data-table compact-table">
                <thead>
                    <tr>
                        <th>Naam</th>
                        <th>Bin</th>
                        <th>Aantal</th>
                        <th>Gewicht</th>
                        <th>Gem.</th>
                    </tr>
                </thead>
                <tbody id="postnlData">
                    <tr>
                        <td colspan="5" class="loading">Loading...</td>
                    </tr>
                </tbody>
                <tfoot id="postnlTotal">
                    <tr class="total-row">
                        <td><strong>Totaal</strong></td>
                        <td></td>
                        <td><strong>0</strong></td>
                        <td><strong>0</strong></td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Other Carriers Section -->
        <div class="section carriers-section">
            <table class="data-table compact-table">
                <thead>
                    <tr>
                        <th>Naam</th>
                        <th>Bin</th>
                        <th>Aantal</th>
                        <th>Gewicht</th>
                    </tr>
                </thead>
                <tbody id="carriersData">
                    <tr>
                        <td colspan="4" class="loading">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- BusinessPost Detail Section -->
        <div class="section bp-section">
            <div class="section-header">
                <h2>BusinessPost Detail</h2>
                <button id="exportBPBtn" class="btn-export">
                    <span>⬇</span> Export Voormelding
                </button>
            </div>
            <div class="bp-table-container">
                <table class="data-table compact-table">
                    <thead>
                        <tr>
                            <th>BP Code</th>
                            <th>Locatie</th>
                            <th>Prealert Code</th>
                            <th>Aantal</th>
                            <th>Gewicht</th>
                        </tr>
                    </thead>
                    <tbody id="bpDetailData">
                        <tr>
                            <td colspan="5" class="loading">Loading...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Productivity Section -->
        <div class="section productivity-section">
            <div class="section-header">
                <h2>Productiviteit per Station (15 min intervallen)</h2>
            </div>
            <div id="productivityData" class="loading">Loading...</div>
        </div>

        <!-- Last Update Footer -->
        <div class="footer">
            <span class="update-label">Laatste update:</span>
            <span id="lastUpdate">0/01/00 0:00</span>
        </div>
    </div>

    <script src="./js/dashboard.js"></script>
</body>
</html>