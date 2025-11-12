<?php
// api/get_bp_detail.php - Get BusinessPost detail breakdown

header('Content-Type: application/json');
require_once '../includes/db_config.php';

$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

$conn = getDBConnection();
if (!$conn) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Get all BP codes with counts for the selected date
$query = "
    SELECT 
        BP AS bp_code,
        COUNT(*) AS aantal,
        COALESCE(SUM(Weight), 0) AS gewicht
    FROM dbo.Letters WITH (NOLOCK)
    WHERE CAST(DateLetter AS DATE) = ?
      AND BP IS NOT NULL
      AND BP LIKE 'BP%'
    GROUP BY BP
    ORDER BY BP
";

$params = array($date);
$stmt = executeQuery($conn, $query, $params);

$letterCounts = array();

if ($stmt) {
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $letterCounts[$row['bp_code']] = array(
            'aantal' => (int)$row['aantal'],
            'gewicht' => round((float)$row['gewicht'], 2)
        );
    }
    sqlsrv_free_stmt($stmt);
}

// Get unique Business records with location and prealert code
$query2 = "
    SELECT DISTINCT
        Job,
        Output,
        Location,
        PrealertCode
    FROM dbo.Business WITH (NOLOCK)
    WHERE PrealertCode IS NOT NULL
    ORDER BY PrealertCode, Job, Output
";

$stmt2 = executeQuery($conn, $query2, array());

$results = array();

if ($stmt2) {
    while ($row = sqlsrv_fetch_array($stmt2, SQLSRV_FETCH_ASSOC)) {
        // Format BP code as BP0504 (BP + 2 digit job + 2 digit output)
        $job = str_pad($row['Job'], 2, '0', STR_PAD_LEFT);
        $output = str_pad($row['Output'], 2, '0', STR_PAD_LEFT);
        $bpCode = 'BP' . $job . $output;
        
        // Only include if there are letters with this BP code
        if (isset($letterCounts[$bpCode])) {
            $results[] = array(
                'bp_code' => $bpCode,
                'location' => $row['Location'],
                'prealert_code' => $row['PrealertCode'],
                'aantal' => $letterCounts[$bpCode]['aantal'],
                'gewicht' => $letterCounts[$bpCode]['gewicht']
            );
        }
    }
    sqlsrv_free_stmt($stmt2);
}

closeDBConnection($conn);

echo json_encode(array('data' => $results));
?>