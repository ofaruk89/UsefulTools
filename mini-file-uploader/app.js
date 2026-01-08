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
                rememberMe.prop('checked', true);
                passInput.val('********');        
                passInput.prop('disabled', true); 
            } else {
                rememberMe.prop('checked', false);
                passInput.val('');
                passInput.prop('disabled', false);
            }
        });
    }

    // --- CHECKBOX MANTIĞI ---
    rememberMe.on('change', function() {
        const isChecked = $(this).is(':checked');
        const password = passInput.val();

        if (isChecked) {
            if (password.trim() === '' || password === '********') {
                Swal.fire({
                    toast: true, position: 'top-end', icon: 'warning', 
                    title: 'Lütfen önce şifreyi girin', showConfirmButton: false, timer: 3000 
                });
                $(this).prop('checked', false);
                passInput.prop('disabled', false);
                passInput.focus();
            } else {
                $.post('api.php', { action: 'toggle_remember', mode: 'on', password: password }, function(res) {
                    if (res.status === 'success') {
                        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                        Toast.fire({ icon: 'success', title: 'Tarayıcı Hatırlandı' });
                        passInput.val('********');
                        passInput.prop('disabled', true);
                    } else {
                        Swal.fire('Hata', 'Girdiğiniz şifre yanlış!', 'error');
                        rememberMe.prop('checked', false);
                    }
                });
            }
        } else {
            $.post('api.php', { action: 'toggle_remember', mode: 'off' }, function(res) {
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                Toast.fire({ icon: 'info', title: 'Beni Hatırla Kapatıldı' });
                passInput.val('');
                passInput.prop('disabled', false);
                passInput.focus();
            });
        }
    });

    // --- Dosya Listeleme ---
    function loadFiles() {
        $.get('api.php?action=list', function(res) {
            fileListBody.empty();
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

    // --- UPLOAD TETİKLEME DÜZELTMESİ (SONSUZ DÖNGÜ FİX) ---
    dropArea.on('click', function() {
        fileElem.click();
    });

    // Inputa tıklandığında olayın yukarı (dropArea'ya) sıçramasını engelle
    fileElem.on('click', function(e) {
        e.stopPropagation(); 
    });

    // Drag & Drop Görsel Efektleri
    dropArea.on('dragenter dragover', (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        dropArea.addClass('highlight'); 
    });
    
    dropArea.on('dragleave drop', (e) => { 
        e.preventDefault(); 
        e.stopPropagation(); 
        dropArea.removeClass('highlight'); 
    });
    
    dropArea.on('drop', (e) => handleFiles(e.originalEvent.dataTransfer.files));
    fileElem.on('change', function() { handleFiles(this.files); });

    function handleFiles(files) {
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

    // --- KOPYALAMA DÜZELTMESİ (HTTP & HTTPS) ---
    $(document).on('click', '.copy-btn', function() {
        let url = $(this).data('url');
        
        // 1. Yöntem: Modern API (HTTPS ise)
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url).then(() => {
                showCopyToast();
            }).catch(err => {
                fallbackCopyTextToClipboard(url);
            });
        } else {
            // 2. Yöntem: HTTP Fallback
            fallbackCopyTextToClipboard(url);
        }
    });

    function fallbackCopyTextToClipboard(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            var successful = document.execCommand('copy');
            if(successful) showCopyToast();
            else Swal.fire('Hata', 'Kopyalanamadı', 'error');
        } catch (err) {
            Swal.fire('Hata', 'Tarayıcı izin vermedi', 'error');
        }
        document.body.removeChild(textArea);
    }

    function showCopyToast() {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Kopyalandı' });
    }
});