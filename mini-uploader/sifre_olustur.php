<?php
// sifre_olustur.php
// Bu dosyayı sunucuna at ve tarayıcıdan çalıştır.
// Çıkan sonucu kopyala ve api.php içindeki $validPassHash alanına yapıştır.

$sifre = "SifreyiBurayaYaz"; // Kullanmak istediğin şifre
$hash = password_hash($sifre, PASSWORD_DEFAULT);

echo "<h3>Aşağıdaki kodu kopyala:</h3>";
echo "<textarea cols='100' rows='2' style='font-size:16px; padding:10px;'>$hash</textarea>";
echo "<br><br>Kopyaladıktan sonra bu dosyayı (sifre_olustur.php) sunucudan silmeyi unutma!";
?>