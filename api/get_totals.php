<?php
// api/get_totals.php - Get PostNL BIN totals (BIN 3 and 6)

header('Content-Type: application/json');
require_once '../includes/db_config.php';

$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

$conn = getDBConnection();
if (!$conn) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Optimized query with NOLOCK for BIN 3 and 6
$query = "
    SELECT 
        Output AS bin,
        COUNT(*) AS aantal,
        COALESCE(SUM(Weight), 0) AS gewicht,
        CASE 
            WHEN COUNT(*) > 0 THEN COALESCE(SUM(Weight), 0) / COUNT(*)
            ELSE 0
        END AS gemiddeld
    FROM dbo.Letters WITH (NOLOCK)
    WHERE CAST(DateLetter AS DATE) = ?
      AND Output IN (3, 6)
    GROUP BY Output
    ORDER BY Output
";

$params = array($date);
$stmt = executeQuery($conn, $query, $params);

$results = array();
$totals = array('aantal' => 0, 'gewicht' => 0);

if ($stmt) {
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $results[] = array(
            'naam' => 'PostNL',
            'bin' => (int)$row['bin'],
            'aantal' => (int)$row['aantal'],
            'gewicht' => round((float)$row['gewicht'], 2),
            'gem' => $row['aantal'] > 0 ? round((float)$row['gemiddeld'], 2) . ' g' : '-'
        );
        
        $totals['aantal'] += (int)$row['aantal'];
        $totals['gewicht'] += (float)$row['gewicht'];
    }
    sqlsrv_free_stmt($stmt);
}

// Ensure both BIN 3 and 6 are present
$bins = array(3, 6);
foreach ($bins as $bin) {
    $found = false;
    foreach ($results as $result) {
        if ($result['bin'] == $bin) {
            $found = true;
            break;
        }
    }
    if (!$found) {
        $results[] = array(
            'naam' => 'PostNL',
            'bin' => $bin,
            'aantal' => 0,
            'gewicht' => 0,
            'gem' => '-'
        );
    }
}

// Sort by bin
usort($results, function($a, $b) {
    return $a['bin'] - $b['bin'];
});

closeDBConnection($conn);

echo json_encode(array(
    'data' => $results,
    'totals' => array(
        'aantal' => (int)$totals['aantal'],
        'gewicht' => round($totals['gewicht'], 2)
    )
));
?>