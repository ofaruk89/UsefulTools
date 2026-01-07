# Mini Upload Portal

Kendi dosyalarınızı upload download edebileceğiniz kullanışlı bir araç.

sifre_olustur.php yi düzenleyip içerisindeki SifreyiBurayaYaz kısmını değiştirip tarayıcıdan dosyanızı çağırarak hashlenmiş şifrenizi alabilirsiniz. Ardından dosyayı siliniz. Bu şifreyi api.php deki confige girmeniz yeterlidir.

- şifreyi bilen dosya ekleme/silme yapabilir
- diğer kullanıcılar read onlydir
- curl ile dosya yükleyebilirsiniz. response jsonda url yi dönen bir alan vardır.
Örnek Curl
curl -s -F "action=upload" -F "password=sifreniz" -F "file=@stncl.3mf" https://localhost/sciptDizini/api.php

- api.php nin içinde izin verilen uzantılar configi yapabilirsiniz.

<img width="945" height="626" alt="image" src="https://github.com/user-attachments/assets/de3692a4-ecfa-49b8-8a56-63d3d1455e27" />
