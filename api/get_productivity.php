<?php
// api/get_productivity.php - Get productivity per station per 15 minutes

header('Content-Type: application/json');
require_once '../includes/db_config.php';

$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

$conn = getDBConnection();
if (!$conn) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Extract station from Datamatrix and group by 15-minute intervals
$query = "
    SELECT 
        CASE 
            WHEN LEFT(Datamatrix, 2) = '1S' THEN 1
            WHEN LEFT(Datamatrix, 2) = '2S' THEN 2
            WHEN LEFT(Datamatrix, 2) = '3S' THEN 3
            WHEN LEFT(Datamatrix, 2) = '4S' THEN 4
            WHEN LEFT(Datamatrix, 2) = '5S' THEN 5
            WHEN LEFT(Datamatrix, 1) = '2' AND LEFT(Datamatrix, 2) != '2S' THEN 0
            ELSE 0
        END AS station,
        DATEPART(HOUR, DateLetter) AS hour,
        FLOOR(DATEPART(MINUTE, DateLetter) / 15) AS quarter,
        COUNT(*) AS aantal
    FROM dbo.Letters WITH (NOLOCK)
    WHERE CAST(DateLetter AS DATE) = ?
      AND Datamatrix IS NOT NULL
    GROUP BY 
        CASE 
            WHEN LEFT(Datamatrix, 2) = '1S' THEN 1
            WHEN LEFT(Datamatrix, 2) = '2S' THEN 2
            WHEN LEFT(Datamatrix, 2) = '3S' THEN 3
            WHEN LEFT(Datamatrix, 2) = '4S' THEN 4
            WHEN LEFT(Datamatrix, 2) = '5S' THEN 5
            WHEN LEFT(Datamatrix, 1) = '2' AND LEFT(Datamatrix, 2) != '2S' THEN 0
            ELSE 0
        END,
        DATEPART(HOUR, DateLetter),
        FLOOR(DATEPART(MINUTE, DateLetter) / 15)
    ORDER BY hour, quarter, station
";

$params = array($date);
$stmt = executeQuery($conn, $query, $params);

$productivity = array();

if ($stmt) {
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $hour = str_pad($row['hour'], 2, '0', STR_PAD_LEFT);
        $minute = str_pad($row['quarter'] * 15, 2, '0', STR_PAD_LEFT);
        $timeSlot = $hour . ':' . $minute;
        $station = 'Station ' . $row['station'];
        
        if (!isset($productivity[$station])) {
            $productivity[$station] = array();
        }
        
        $productivity[$station][$timeSlot] = (int)$row['aantal'];
    }
    sqlsrv_free_stmt($stmt);
}

closeDBConnection($conn);

// Get all time slots for the day
$timeSlots = array();
for ($h = 0; $h < 24; $h++) {
    for ($q = 0; $q < 4; $q++) {
        $hour = str_pad($h, 2, '0', STR_PAD_LEFT);
        $minute = str_pad($q * 15, 2, '0', STR_PAD_LEFT);
        $timeSlots[] = $hour . ':' . $minute;
    }
}

echo json_encode(array(
    'data' => $productivity,
    'timeSlots' => $timeSlots
));
?>