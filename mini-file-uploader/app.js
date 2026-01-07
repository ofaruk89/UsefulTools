$(document).ready(function() {
    const dropArea = $('#drop-area');
    const fileElem = $('#fileElem');
    const progressContainer = $('#progress-container');
    const fileListBody = $('#file-list-body');
    const passInput = $('#auth-password');
    const rememberMe = $('#remember-me');

    // Sayfa Yüklendiğinde Başlangıç Kontrolü
    initSystem();

    function initSystem() {
        // 1. Dosyaları ve Sistem Bilgilerini Çek
        loadFiles();

        // 2. Auth Durumunu Kontrol Et (Cookie var mı?)
        $.post('api.php', { action: 'check_auth' }, function(res) {
            if (res.status === 'success' && res.logged_in) {
                // Eğer cookie varsa:
                rememberMe.prop('checked', true); // Tick at
                passInput.val('********');        // Sembolik şifre koy
                passInput.prop('disabled', true); // İstersen kilitli gibi göster (opsiyonel)
            } else {
                rememberMe.prop('checked', false);
                passInput.val('');
                passInput.prop('disabled', false);
            }
        });
    }

    // --- CHECKBOX MANTIĞI (En Önemli Kısım) ---
    rememberMe.on('change', function() {
        const isChecked = $(this).is(':checked');
        const password = passInput.val();

        if (isChecked) {
            // -- Kullanıcı "Beni Hatırla" dedi --
            if (password.trim() === '' || password === '********') {
                // Şifre boşsa veya zaten dummy ise (ama sistemden düştüyse)
                // Şifre girmesini iste
                Swal.fire({
                    toast: true, position: 'top-end', icon: 'warning', 
                    title: 'Lütfen önce şifreyi girin', showConfirmButton: false, timer: 3000 
                });
                $(this).prop('checked', false); // Ticki geri al
                passInput.prop('disabled', false);
                passInput.focus();
            } else {
                // Şifre girilmiş, Backend'e sor ve Cookie oluştur
                $.post('api.php', { action: 'toggle_remember', mode: 'on', password: password }, function(res) {
                    if (res.status === 'success') {
                        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                        Toast.fire({ icon: 'success', title: 'Tarayıcı Hatırlandı' });
                        passInput.val('********'); // Sembolik hale getir
                        passInput.prop('disabled', true); // Kilitle (Opsiyonel)
                    } else {
                        // Şifre yanlışsa
                        Swal.fire('Hata', 'Girdiğiniz şifre yanlış!', 'error');
                        rememberMe.prop('checked', false); // Ticki geri al
                    }
                });
            }
        } else {
            // -- Kullanıcı Ticki Kaldırdı (Unut) --
            $.post('api.php', { action: 'toggle_remember', mode: 'off' }, function(res) {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                Toast.fire({ icon: 'info', title: 'Beni Hatırla Kapatıldı' });
                passInput.val(''); // Kutuyu temizle
                passInput.prop('disabled', false); // Kilidi aç
                passInput.focus();
            });
        }
    });

    // --- Dosya Listeleme ---
    function loadFiles() {
        $.get('api.php?action=list', function(res) {
            fileListBody.empty();
            // Sistem Bilgilerini UI'a Yaz
            if(res.info) {
                $('#info-post-limit').text(res.info.post_max);
                $('#info-upload-limit').text(res.info.upload_max);
                if(res.info.exts && res.info.exts.length > 0) {
                    $('#info-allowed-ext').text(res.info.exts.join(', ').toUpperCase());
                    let acceptStr = res.info.exts.map(e => '.'+e).join(',');
                    $('#fileElem').attr('accept', acceptStr);
                } else {
                    $('#info-allowed-ext').text("HEPSİ");
                }
            }
            // Dosyaları Yaz
            if (res.files && res.files.length > 0) {
                res.files.forEach(file => {
                    let row = `
                        <tr class="file-row">
                            <td><a href="${file.url}" target="_blank" class="text-decoration-none text-dark fw-bold"><i class="fa-regular fa-file me-2"></i>${file.name}</a></td>
                            <td class="text-center text-muted small">${file.size}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-primary me-1 copy-btn" data-url="${file.url}"><i class="fa-regular fa-copy"></i></button>
                                <button class="btn btn-sm btn-outline-danger delete-btn" data-name="${file.name}"><i class="fa-solid fa-trash"></i></button>
                            </td>
                        </tr>`;
                    fileListBody.append(row);
                });
            } else {
                fileListBody.html('<tr><td colspan="3" class="text-center text-muted py-3">Dosya yok.</td></tr>');
            }
        });
    }

    // --- Upload ve Diğer İşlemler ---
    dropArea.on('click', () => fileElem.click());
    dropArea.on('dragenter dragover', (e) => { e.preventDefault(); dropArea.addClass('highlight'); });
    dropArea.on('dragleave drop', (e) => { e.preventDefault(); dropArea.removeClass('highlight'); });
    dropArea.on('drop', (e) => handleFiles(e.originalEvent.dataTransfer.files));
    fileElem.on('change', function() { handleFiles(this.files); });

    function handleFiles(files) {
        // Eğer remember me YOKSA ve şifre kutusu BOŞSA uyarı ver
        if (!rememberMe.is(':checked') && passInput.val().trim() === "") {
            Swal.fire('Hata', 'Lütfen şifre giriniz!', 'warning');
            return;
        }
        ([...files]).forEach(uploadFile);
    }

    function uploadFile(file) {
        let formData = new FormData();
        formData.append('file', file);
        formData.append('action', 'upload');
        // Backend zaten cookie kontrolü yapıyor.
        // Eğer cookie yoksa inputtaki şifreyi gönder. 
        // Eğer cookie varsa inputta ***** olsa bile backend onu görmezden gelir cookie'ye bakar.
        formData.append('password', passInput.val());

        let id = 'prog-' + Math.random().toString(36).substr(2, 9);
        let progressHTML = `
            <div class="progress-wrapper" id="${id}">
                <div class="d-flex justify-content-between mb-1">
                    <span class="small fw-bold text-truncate" style="max-width: 80%;">${file.name}</span>
                    <span class="small percent">0%</span>
                </div>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
            </div>`;
        progressContainer.append(progressHTML);
        let bar = $(`#${id} .progress-bar`);
        let txt = $(`#${id} .percent`);

        $.ajax({
            url: 'api.php', type: 'POST', data: formData,
            contentType: false, processData: false,
            xhr: function() {
                var xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener("progress", (evt) => {
                    if (evt.lengthComputable) {
                        var pc = (evt.loaded / evt.total) * 100;
                        bar.width(pc + '%'); txt.text(pc.toFixed(0) + '%');
                    }
                }, false);
                return xhr;
            },
            success: function(res) {
                if (res.status === 'success') {
                    bar.addClass('bg-success');
                    setTimeout(() => { $(`#${id}`).fadeOut(500, function(){ $(this).remove(); }); }, 2000);
                    loadFiles();
                } else {
                    bar.addClass('bg-danger'); txt.text(res.message);
                }
            }
        });
    }

    $(document).on('click', '.delete-btn', function() {
        let fileName = $(this).data('name');
        if (!rememberMe.is(':checked') && passInput.val().trim() === "") {
            Swal.fire('Hata', 'Şifre gerekli!', 'warning'); return;
        }
        Swal.fire({
            title: 'Silinsin mi?', text: fileName, icon: 'warning', showCancelButton: true, confirmButtonText: 'Evet, Sil'
        }).then((result) => {
            if (result.isConfirmed) {
                $.post('api.php', { action: 'delete', filename: fileName, password: passInput.val() }, function(res) {
                    if (res.status === 'success') { loadFiles(); } 
                    else { Swal.fire('Hata', res.message, 'error'); }
                });
            }
        });
    });

    // --- Kopyalama İşlemi (HTTP ve HTTPS Uyumlu) ---
    $(document).on('click', '.copy-btn', function() {
        let url = $(this).data('url');
        
        // 1. Yöntem: Modern API (HTTPS ise çalışır)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).then(() => {
                showCopyToast();
            }).catch(err => {
                console.error('Modern copy hatası:', err);
                fallbackCopyTextToClipboard(url); // Hata verirse eskiye düş
            });
        } else {
            // 2. Yöntem: Fallback (HTTP için textarea yöntemi)
            fallbackCopyTextToClipboard(url);
        }
    });

    // HTTP için eski usul kopyalama fonksiyonu
    function fallbackCopyTextToClipboard(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Görünmez yap ama DOM'da olsun
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            var successful = document.execCommand('copy');
            if(successful) {
                showCopyToast();
            } else {
                Swal.fire('Hata', 'Kopyalama başarısız', 'error');
            }
        } catch (err) {
            console.error('Fallback copy hatası:', err);
            Swal.fire('Hata', 'Kopyalanamadı', 'error');
        }

        document.body.removeChild(textArea);
    }

    function showCopyToast() {
        const Toast = Swal.mixin({ 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 2000 
        });
        Toast.fire({ icon: 'success', title: 'Kopyalandı' });
    }
});