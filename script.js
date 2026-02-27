document.getElementById('year').textContent = new Date().getFullYear();

const artGrid = document.getElementById('artGrid');
const gameIdInput = document.getElementById('gameId');
const processBtn = document.getElementById('process-btn');
const downloadZipBtn = document.getElementById('download-zip-btn');
const autoCropToggle = document.getElementById('auto-crop-toggle');

let selectedFiles = {}; 
let finalZipBlob = null; 

// تم تقليل النصوص هنا لتصميم أنظف
const ART_CONFIG = {
    _COV:  { title: "غلاف اللعبة",       width: 140, height: 200, format: 'png', oplImg: "https://via.placeholder.com/140x200/1a1a1a/4fc3f7?text=COV" },
    _COV2: { title: "غلاف خلفي",         width: 256, height: 290, format: 'png', oplImg: "https://via.placeholder.com/256x290/1a1a1a/4fc3f7?text=COV2" },
    _BG:   { title: "خلفية الشاشة",      width: 640, height: 480, format: 'jpeg', oplImg: "https://via.placeholder.com/640x480/1a1a1a/4fc3f7?text=BG" },
    _LGO:  { title: "شعار اللعبة",       width: 300, height: 110, format: 'png', oplImg: "https://via.placeholder.com/300x110/1a1a1a/4fc3f7?text=LGO" },
    _ICO:  { title: "أيقونة مصغرة",      width: 64,  height: 64,  format: 'png', oplImg: "https://via.placeholder.com/64x64/1a1a1a/4fc3f7?text=ICO" },
    _LAB:  { title: "صورة القرص",        width: 32,  height: 290, format: 'png', oplImg: "https://via.placeholder.com/32x290/1a1a1a/4fc3f7?text=LAB" },
    _SCR:  { title: "لقطة شاشة 1",      width: 256, height: 224, format: 'jpeg', oplImg: "https://via.placeholder.com/256x224/1a1a1a/4fc3f7?text=SCR" },
    _SCR2: { title: "لقطة شاشة 2",      width: 256, height: 224, format: 'jpeg', oplImg: "https://via.placeholder.com/256x224/1a1a1a/4fc3f7?text=SCR2" },
    _SCR3: { title: "لقطة شاشة 3",      width: 256, height: 224, format: 'jpeg', oplImg: "https://via.placeholder.com/256x224/1a1a1a/4fc3f7?text=SCR3" }
};

function buildUI() {
    for (const suffix in ART_CONFIG) {
        const config = ART_CONFIG[suffix];
        
        const artBox = document.createElement('div');
        artBox.className = 'art-box';
        artBox.id = `box-${suffix}`;
        artBox.innerHTML = `
            <img src="${config.oplImg}" alt="موقع OPL" class="opl-placement-img">
            <h3>${config.title}</h3>
            <div class="target-dim">الأبعاد المطلوبة: <b>${config.width}x${config.height}</b></div>
            
            <div id="upload-ui-${suffix}">
                <label class="file-upload-label" for="file-${suffix}">رفع صورة</label>
                <input class="file-upload-input" type="file" id="file-${suffix}" accept="image/*">
            </div>

            <div class="preview-area" id="preview-area-${suffix}">
                <button class="clear-btn" onclick="clearSelection('${suffix}')" title="حذف"><i class="fas fa-times"></i></button>
                <img class="preview-img" id="preview-img-${suffix}" src="">
                <div id="info-${suffix}"></div>
            </div>
        `;

        setupDragAndDrop(artBox, suffix);
        artGrid.appendChild(artBox);
        document.getElementById(`file-${suffix}`).addEventListener('change', (e) => handleFile(e.target.files[0], suffix));
    }
}

function setupDragAndDrop(element, suffix) {
    element.addEventListener('dragover', (e) => { e.preventDefault(); element.classList.add('dragover'); });
    element.addEventListener('dragleave', () => { element.classList.remove('dragover'); });
    element.addEventListener('drop', (e) => {
        e.preventDefault(); element.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], suffix);
    });
}

function handleFile(file, suffix) {
    if (!file || !file.type.startsWith('image/')) return;
    selectedFiles[suffix] = file;
    
    document.getElementById(`upload-ui-${suffix}`).style.display = 'none';
    const previewArea = document.getElementById(`preview-area-${suffix}`);
    const previewImg = document.getElementById(`preview-img-${suffix}`);
    
    previewImg.src = URL.createObjectURL(file);
    previewArea.style.display = 'flex';

    analyzeImage(file, ART_CONFIG[suffix], suffix);
    resetProcessState();
}

window.clearSelection = function(suffix) {
    delete selectedFiles[suffix];
    document.getElementById(`upload-ui-${suffix}`).style.display = 'block';
    document.getElementById(`preview-area-${suffix}`).style.display = 'none';
    document.getElementById(`file-${suffix}`).value = ""; 
    resetProcessState();
}

function analyzeImage(file, config, suffix) {
    const infoDiv = document.getElementById(`info-${suffix}`);
    const img = new Image();
    
    img.onload = () => {
        const targetRatio = config.width / config.height;
        const originalRatio = img.width / img.height;
        
        let maxCropWidth, maxCropHeight;
        
        // حساب أكبر مساحة يمكن قصها من الصورة المرفوعة
        if (originalRatio > targetRatio) {
            maxCropHeight = img.height;
            maxCropWidth = Math.round(img.height * targetRatio);
        } else {
            maxCropWidth = img.width;
            maxCropHeight = Math.round(img.width / targetRatio);
        }

        if (Math.abs(originalRatio - targetRatio) < 0.05) {
            infoDiv.className = 'info-box ideal';
            infoDiv.innerHTML = `<i class="fas fa-check-circle"></i> الأبعاد مطابقة ومثالية.`;
        } else {
            infoDiv.className = 'info-box warn';
            infoDiv.innerHTML = `
                <i class="fas fa-info-circle"></i> الصورة غير متطابقة.<br>
                أقصى أبعاد سيتم قصها من صورتك هي:<br>
                العرض: <b>${maxCropWidth}px</b> | الطول: <b>${maxCropHeight}px</b>
            `;
        }
    };
    img.src = URL.createObjectURL(file);
}

async function startProcessing() {
    const gameId = gameIdInput.value.trim();
    if (Object.keys(selectedFiles).length === 0) { alert("اختر صورة واحدة على الأقل!"); return; }
    if (!gameId) { alert("أدخل ايدي اللعبة أولاً!"); return; }

    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ المعالجة...';

    const zip = new JSZip();
    const autoCrop = autoCropToggle.checked; 

    for (const suffix in selectedFiles) {
        const file = selectedFiles[suffix];
        const config = ART_CONFIG[suffix];
        const infoDiv = document.getElementById(`info-${suffix}`);
        
        try {
            const resizedBlob = await processImageOnCanvas(file, config, autoCrop);
            zip.file(`${gameId}${suffix}.${config.format}`, resizedBlob);
            infoDiv.innerHTML = `<i class="fas fa-check"></i> تمت المعالجة بنجاح.`;
            infoDiv.className = 'info-box ideal';
        } catch (error) {
            infoDiv.innerHTML = `<i class="fas fa-times"></i> فشل المعالجة.`;
        }
    }

    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> تجميع الملف...';
    try {
        finalZipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
        downloadZipBtn.style.display = 'inline-block';
        processBtn.style.display = 'none';
    } catch (error) {
        alert('حدث خطأ أثناء الإنشاء.');
        resetProcessState();
    }
}

function processImageOnCanvas(file, config, autoCrop) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = config.width;
            canvas.height = config.height;
            const ctx = canvas.getContext('2d');

            if (autoCrop) {
                const targetRatio = config.width / config.height;
                const originalRatio = img.width / img.height;
                let sWidth, sHeight;

                // تطبيق المنطق الرياضي لقص أكبر مساحة من المنتصف
                if (originalRatio > targetRatio) {
                    sHeight = img.height;
                    sWidth = img.height * targetRatio;
                } else {
                    sWidth = img.width;
                    sHeight = img.width / targetRatio;
                }
                
                const sx = (img.width - sWidth) / 2;
                const sy = (img.height - sHeight) / 2;
                
                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, config.width, config.height);
            } else {
                ctx.drawImage(img, 0, 0, config.width, config.height);
            }

            canvas.toBlob(blob => {
                if (blob) resolve(blob); else reject();
            }, `image/${config.format}`, config.format === 'jpeg' ? 0.9 : 1.0);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function triggerDownload() {
    if (!finalZipBlob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(finalZipBlob);
    link.download = `${gameIdInput.value.trim() || 'ART'}_ART.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function resetProcessState() {
    processBtn.disabled = Object.keys(selectedFiles).length === 0;
    processBtn.innerHTML = '<i class="fas fa-cogs"></i> بدء المعالجة وإنشاء ملف ZIP';
    processBtn.style.display = 'inline-block';
    downloadZipBtn.style.display = 'none';
    finalZipBlob = null;
}

document.addEventListener('DOMContentLoaded', buildUI);
processBtn.addEventListener('click', startProcessing);
downloadZipBtn.addEventListener('click', triggerDownload);
