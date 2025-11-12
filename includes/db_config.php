<?php
// db_config.php - Database Configuration and Connection

// Database credentials
define('DB_SERVER', '192.168.20.16\SQLEXPRESS');
define('DB_USERNAME', 'USERNAME');
define('DB_PASSWORD', 'PASSWORD');
define('DB_NAME', 'Skynet'); // Replace with your actual database name

// Function to get database connection
function getDBConnection() {
    try {
        $connectionInfo = array(
            "Database" => DB_NAME,
            "UID" => DB_USERNAME,
            "PWD" => DB_PASSWORD,
            "CharacterSet" => "UTF-8"
        );
        
        $conn = sqlsrv_connect(DB_SERVER, $connectionInfo);
        
        if ($conn === false) {
            throw new Exception(print_r(sqlsrv_errors(), true));
        }
        
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        return false;
    }
}

// Function to close connection
function closeDBConnection($conn) {
    if ($conn) {
        sqlsrv_close($conn);
    }
}

// Function to execute query safely
function executeQuery($conn, $query, $params = array()) {
    $stmt = sqlsrv_query($conn, $query, $params);
    
    if ($stmt === false) {
        error_log("Query error: " . print_r(sqlsrv_errors(), true));
        return false;
    }
    
    return $stmt;
}

// Set timezone
date_default_timezone_set('Europe/Amsterdam');
?>