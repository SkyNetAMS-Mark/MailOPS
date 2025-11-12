<?php
// api/get_carriers.php - Get other carriers data (BIN 1, 2, 4)

header('Content-Type: application/json');
require_once '../includes/db_config.php';

$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

$conn = getDBConnection();
if (!$conn) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Optimized query for BIN 1, 2, 4
$query = "
    SELECT 
        Output AS bin,
        COUNT(*) AS aantal,
        COALESCE(SUM(Weight), 0) AS gewicht
    FROM dbo.Letters WITH (NOLOCK)
    WHERE CAST(DateLetter AS DATE) = ?
      AND Output IN (1, 2, 4)
    GROUP BY Output
    ORDER BY Output
";

$params = array($date);
$stmt = executeQuery($conn, $query, $params);

// Map BINs to carrier names
$binToCarrier = array(
    1 => 'Falkpost',
    2 => 'BP',
    4 => 'Intrapost'
);

$results = array();

if ($stmt) {
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $bin = (int)$row['bin'];
        $results[] = array(
            'naam' => $binToCarrier[$bin],
            'bin' => $bin,
            'aantal' => (int)$row['aantal'],
            'gewicht' => round((float)$row['gewicht'], 2)
        );
    }
    sqlsrv_free_stmt($stmt);
}

// Ensure all carriers are present
foreach ($binToCarrier as $bin => $naam) {
    $found = false;
    foreach ($results as $result) {
        if ($result['bin'] == $bin) {
            $found = true;
            break;
        }
    }
    if (!$found) {
        $results[] = array(
            'naam' => $naam,
            'bin' => $bin,
            'aantal' => 0,
            'gewicht' => 0
        );
    }
}

// Sort by bin
usort($results, function($a, $b) {
    return $a['bin'] - $b['bin'];
});

closeDBConnection($conn);

echo json_encode(array('data' => $results));
?>