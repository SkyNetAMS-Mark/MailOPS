<?php
// api/export_bp_prealert.php - Export BusinessPost Pre-alert to Excel

require_once '../includes/db_config.php';

$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

$conn = getDBConnection();
if (!$conn) {
    die('Database connection failed');
}

// Get BP data grouped by PrealertCode (DISTINCT to avoid duplicates)
$query = "
    SELECT 
        b.PrealertCode AS 'Verzender ID',
        b.Location AS 'Ontvanger',
        (
            SELECT COUNT(*) 
            FROM dbo.Letters WITH (NOLOCK)
            WHERE BP = 'BP' + 
                  RIGHT('0' + CAST(b.Job AS VARCHAR), 2) + 
                  RIGHT('0' + CAST(b.Output AS VARCHAR), 2)
              AND CAST(DateLetter AS DATE) = ?
        ) AS 'Aantal poststukken',
        '' AS 'Aantal postbussen',
        '' AS 'Opmerkingen'
    FROM (
        SELECT DISTINCT PrealertCode, Location, Job, Output
        FROM dbo.Business WITH (NOLOCK)
        WHERE PrealertCode IS NOT NULL
    ) b
    WHERE (
        SELECT COUNT(*) 
        FROM dbo.Letters WITH (NOLOCK)
        WHERE BP = 'BP' + 
              RIGHT('0' + CAST(b.Job AS VARCHAR), 2) + 
              RIGHT('0' + CAST(b.Output AS VARCHAR), 2)
          AND CAST(DateLetter AS DATE) = ?
    ) > 0
    ORDER BY b.PrealertCode
";

$params = array($date, $date);
$stmt = executeQuery($conn, $query, $params);

$data = array();

if ($stmt) {
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $data[] = $row;
    }
    sqlsrv_free_stmt($stmt);
}

closeDBConnection($conn);

// Create CSV file (Excel format)
$filename = 'voormelding_businesspost_' . $date . '.csv';

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Pragma: no-cache');
header('Expires: 0');

$output = fopen('php://output', 'w');

// Add BOM for UTF-8 Excel compatibility
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

// Add headers
fputcsv($output, array('Verzender ID', 'Ontvanger', 'Aantal poststukken', 'Aantal postbussen', 'Opmerkingen'), ';');

// Add data rows
foreach ($data as $row) {
    fputcsv($output, array(
        $row['Verzender ID'],
        $row['Ontvanger'],
        $row['Aantal poststukken'],
        $row['Aantal postbussen'],
        $row['Opmerkingen']
    ), ';');
}

fclose($output);
exit;
?>