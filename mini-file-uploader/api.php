<?php
// api.php
header('Content-Type: application/json; charset=utf-8');

// --- AYARLAR ---
$uploadDir = 'uploads/';

$validPassHash = '$2y$12$bqmyLu7mwR2xWiE9ChXOAO9C3GkzvtLcV6Qq0ArqpD4jpfiTs46iq'; // Buraya kendi hash'ini koy

// İzin verilen uzantılar (Boş = Hepsi)
$allowed_extensions = []; 

// --- AUTH MANTIĞI ---
function checkAuth($pass) {
    global $validPassHash;
    
    // 1. Cookie Kontrolü (Öncelikli)
    if (isset($_COOKIE['auth_token']) && $_COOKIE['auth_token'] === $validPassHash) {
        return true;
    }

    // 2. Manuel Şifre Kontrolü (Cookie yoksa veya geçersizse)
    // Not: Frontend'den gelen dummy '********' şifresini yoksaymalıyız.
    if (!empty($pass) && $pass !== '********') {
        return password_verify($pass, $validPassHash);
    }

    return false;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$password = $_POST['password'] ?? '';

// Klasör yoksa oluştur
if (!file_exists($uploadDir)) { mkdir($uploadDir, 0777, true); }

// URL Oluşturma
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$baseUrl = $protocol . $_SERVER['HTTP_HOST'] . str_replace('\\', '/', dirname($_SERVER['PHP_SELF'])) . '/' . $uploadDir;

$response = ['status' => 'error', 'message' => 'Geçersiz işlem'];

try {
    switch ($action) {
        case 'check_auth':
            // Sayfa yüklendiğinde durumu sorgulamak için
            if (isset($_COOKIE['auth_token']) && $_COOKIE['auth_token'] === $validPassHash) {
                $response = ['status' => 'success', 'logged_in' => true];
            } else {
                $response = ['status' => 'success', 'logged_in' => false];
            }
            break;

        case 'toggle_remember':
            // Checkbox tıklandığında çalışır
            $mode = $_POST['mode'] ?? 'off'; // 'on' veya 'off'
            
            if ($mode === 'on') {
                // Cookie oluşturmak istiyor, şifreyi doğrula
                if (password_verify($password, $validPassHash)) {
                    setcookie('auth_token', $validPassHash, time() + (86400 * 30), "/", "", false, true);
                    $response = ['status' => 'success', 'message' => 'Hatırlandı'];
                } else {
                    $response = ['status' => 'error', 'message' => 'Şifre Yanlış!'];
                }
            } else {
                // Cookie silmek istiyor
                setcookie('authre_token', '', time() - 3600, "/"); // Tarayıcı bazen inatçı olabilir
                setcookie('auth_token', '', time() - 3600, "/");
                unset($_COOKIE['auth_token']);
                $response = ['status' => 'success', 'message' => 'Unutuldu'];
            }
            break;

        case 'list':
            $files = array_diff(scandir($uploadDir), ['.', '..']);
            $fileList = [];
            foreach ($files as $file) {
                $fileList[] = [
                    'name' => $file,
                    'url'  => $baseUrl . $file,
                    'size' => round(filesize($uploadDir . $file) / 1024, 2) . ' KB'
                ];
            }
            // Sistem bilgilerini dön
            $info = [
                'post_max' => ini_get('post_max_size'),
                'upload_max' => ini_get('upload_max_filesize'),
                'exts' => $allowed_extensions
            ];
            $response = ['status' => 'success', 'files' => $fileList, 'info' => $info];
            break;

        case 'upload':
            if (!checkAuth($password)) { throw new Exception("Yetkisiz Erişim! Şifre giriniz."); }
            if (!isset($_FILES['file'])) { throw new Exception("Dosya yok."); }
            
            $file = $_FILES['file'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

            if (!empty($allowed_extensions) && !in_array($ext, array_map('strtolower', $allowed_extensions))) {
                throw new Exception("Yasaklı uzantı: $ext");
            }

            $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '', pathinfo($file['name'], PATHINFO_FILENAME));
            if(empty($safeName)) $safeName = 'file_' . time();
            $fileName = $safeName . '.' . $ext;
            
            $counter = 1;
            while (file_exists($uploadDir . $fileName)) {
                $fileName = $safeName . '_' . $counter . '.' . $ext;
                $counter++;
            }

            if (move_uploaded_file($file['tmp_name'], $uploadDir . $fileName)) {
                $response = ['status' => 'success', 'message' => 'Yüklendi', 'url' => $baseUrl . $fileName];
            } else {
                throw new Exception("Yazma hatası.");
            }
            break;

        case 'delete':
            if (!checkAuth($password)) { throw new Exception("Yetkisiz Erişim!"); }
            $fileToDelete = basename($_POST['filename'] ?? ''); 
            if (file_exists($uploadDir . $fileToDelete)) {
                unlink($uploadDir . $fileToDelete);
                $response = ['status' => 'success', 'message' => 'Silindi'];
            } else {
                throw new Exception("Dosya bulunamadı.");
            }
            break;
    }
} catch (Exception $e) {
    $response = ['status' => 'error', 'message' => $e->getMessage()];
}

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>