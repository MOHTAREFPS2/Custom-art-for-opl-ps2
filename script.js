document.getElementById('year').textContent = new Date().getFullYear();

// --- المتغيرات العامة ---
const artGrid = document.getElementById('artGrid');
const gameIdInput = document.getElementById('gameId');
const processBtn = document.getElementById('process-btn');
const downloadZipBtn = document.getElementById('download-zip-btn');
const autoCropToggle = document.getElementById('auto-crop-toggle');

let selectedFiles = {}; 
let finalZipBlob = null; 

// --- الإعدادات (مع إضافة روابط لصور توضيحية لـ OPL) ---
const ART_CONFIG = {
    _COV:  { title: "غلاف اللعبة",       desc: "صورة الغلاف الأساسي.",        width: 140, height: 200, format: 'png', oplImg: "https://via.placeholder.com/140x200/1a1a1a/4fc3f7?text=COV+Area" },
    _COV2: { title: "غلاف خلفي/ثاني",     desc: "صورة لغلاف إضافي خلفي.",     width: 256, height: 290, format: 'png', oplImg: "https://via.placeholder.com/256x290/1a1a1a/4fc3f7?text=COV2+Area" },
    _BG:   { title: "خلفية الشاشة",      desc: "تظهر وراء قائمة الألعاب.", width: 640, height: 480, format: 'jpeg', oplImg: "https://via.placeholder.com/640x480/1a1a1a/4fc3f7?text=Background" },
    _LGO:  { title: "شعار اللعبة",       desc: "شعار اللعبة (Logo) المفرغ.",   width: 300, height: 110, format: 'png', oplImg: "https://via.placeholder.com/300x110/1a1a1a/4fc3f7?text=Logo+Area" },
    _ICO:  { title: "أيقونة مصغرة",      desc: "تظهر بجانب اسم اللعبة.",    width: 64,  height: 64,  format: 'png', oplImg: "https://via.placeholder.com/64x64/1a1a1a/4fc3f7?text=Icon" },
    _LAB:  { title: "صورة القرص/الملصق", desc: "تظهر كقرص أو ملصق جانبي.",  width: 32,  height: 290, format: 'png', oplImg: "https://via.placeholder.com/32x290/1a1a1a/4fc3f7?text=LAB" },
    _SCR:  { title: "لقطة شاشة 1",      desc: "صورة من داخل اللعبة.",        width: 256, height: 224, format: 'jpeg', oplImg: "https://via.placeholder.com/256x224/1a1a1a/4fc3f7?text=Screen+1" },
    _SCR2: { title: "لقطة شاشة 2",      desc: "صورة من داخل اللعبة.",       width: 256, height: 224, format: 'jpeg', oplImg: "https://via.placeholder.com/256x224/1a1a1a/4fc3f7?text=Screen+2" },
    _SCR3: { title: "لقطة شاشة 3",      desc: "صورة من داخل اللعبة.",       width: 256, height: 224, format: 'jpeg', oplImg: "https://via.placeholder.com/256x224/1a1a1a/4fc3f7?text=Screen+3" }
};

// --- بناء واجهة المستخدم ---
function buildUI() {
    for (const suffix in ART_CONFIG) {
        const config = ART_CONFIG[suffix];
        const requiredRatio = (config.width / config.height).toFixed(2);
        
        const artBox = document.createElement('div');
        artBox.className = 'art-box';
        artBox.id = `box-${suffix}`;
        artBox.innerHTML = `
            <img src="${config.oplImg}" alt="موقع ${config.title} في OPL" class="opl-placement-img">
            <h3>${config.title} (${suffix.replace('_','')})</h3>
            <p>${config.desc}</p>
            <div class="ratio-info">
                الأبعاد المطلوبة: <b>${config.width}x${config.height}</b><br>
                نسبة الطول للعرض: <b>${requiredRatio}</b>
            </div>
            
            <div id="upload-ui-${suffix}">
                <label class="file-upload-label" for="file-${suffix}">اختر أو اسحب الصورة</label>
                <input class="file-upload-input" type="file" id="file-${suffix}" accept="image/*" data-suffix="${suffix}">
            </div>

            <div class="preview-area" id="preview-area-${suffix}">
                <button class="clear-btn" onclick="clearSelection('${suffix}')" title="إزالة الصورة"><i class="fas fa-times" style="margin:0;"></i></button>
                <img class="preview-img" id="preview-img-${suffix}" src="" alt="معاينة">
            </div>

            <div class="status-area" id="status-${suffix}"></div>
            <div class="advice-box" id="advice-${suffix}"></div>
        `;

        // إعداد السحب والإفلات
        setupDragAndDrop(artBox, suffix);
        artGrid.appendChild(artBox);

        // مراقبة اختيار الملف بالطريقة التقليدية
        document.getElementById(`file-${suffix}`).addEventListener('change', (e) => handleFile(e.target.files[0], suffix));
    }
}

// --- إعدادات السحب والإفلات ---
function setupDragAndDrop(element, suffix) {
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('dragover');
    });
    element.addEventListener('dragleave', () => {
        element.classList.remove('dragover');
    });
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0], suffix);
        }
    });
}

// --- معالجة الملف بعد اختياره ---
function handleFile(file, suffix) {
    if (!file || !file.type.startsWith('image/')) return;

    selectedFiles[suffix] = file;
    const config = ART_CONFIG[suffix];
    const previewUrl = URL.createObjectURL(file);
    
    document.getElementById(`upload-ui-${suffix}`).style.display = 'none';
    const previewArea = document.getElementById(`preview-area-${suffix}`);
    const previewImg = document.getElementById(`preview-img-${suffix}`);
    previewImg.src = previewUrl;
    previewArea.style.display = 'flex';

    analyzeImage(file, config, suffix);
    resetProcessState();
}

// --- مسح الصورة المحددة ---
window.clearSelection = function(suffix) {
    delete selectedFiles[suffix];
    document.getElementById(`upload-ui-${suffix}`).style.display = 'block';
    document.getElementById(`preview-area-${suffix}`).style.display = 'none';
    document.getElementById(`status-${suffix}`).innerHTML = '';
    document.getElementById(`advice-${suffix}`).style.display = 'none';
    document.getElementById(`file-${suffix}`).value = ""; // تفريغ الـ input
    resetProcessState();
}

// --- تحليل أبعاد الصورة وتقديم النصائح ---
function analyzeImage(file, config, suffix) {
    const statusDiv = document.getElementById(`status-${suffix}`);
    const adviceDiv = document.getElementById(`advice-${suffix}`);
    
    const img = new Image();
    img.onload = () => {
        const userRatio = img.width / img.height;
        const reqRatio = config.width / config.height;
        
        statusDiv.innerHTML = `<div>أبعاد صورتك: <b>${img.width}x${img.height}</b> (نسبة: ${userRatio.toFixed(2)})</div>`;

        // التحقق مما إذا كانت النسبة قريبة جداً (تسامح 5%)
        if (Math.abs(userRatio - reqRatio) < 0.05) {
            statusDiv.innerHTML += `<div class="success"><i class="fas fa-check-circle"></i> الصورة مثالية! لن تتشوه.</div>`;
            adviceDiv.style.display = 'none';
        } else {
            statusDiv.innerHTML += `<div class="warning"><i class="fas fa-exclamation-triangle"></i> الأبعاد غير متطابقة، الصورة ستظهر مجعوصة (إلا إذا تم تفعيل القص التلقائي).</div>`;
            
            // حساب النصيحة الرياضية لتصحيح الصورة
            let suggestedWidth, suggestedHeight;
            if (userRatio > reqRatio) {
                // الصورة أعرض من اللازم، يجب قص العرض أو زيادة الطول
                suggestedHeight = img.height;
                suggestedWidth = Math.round(img.height * reqRatio);
            } else {
                // الصورة أطول من اللازم
                suggestedWidth = img.width;
                suggestedHeight = Math.round(img.width / reqRatio);
            }
            
            adviceDiv.innerHTML = `<b>نصيحة للتصحيح اليدوي:</b><br>
                                 لجعل الصورة مثالية لهذه الخانة، قم بقصها خارجياً لتصبح بأبعاد:<br>
                                 العرض: <b>${suggestedWidth}</b> بكسل<br>
                                 الطول: <b>${suggestedHeight}</b> بكسل`;
            adviceDiv.style.display = 'block';
        }
    };
    img.src = URL.createObjectURL(file);
}

// --- بدء معالجة جميع الصور ---
async function startProcessing() {
    const gameId = gameIdInput.value.trim();
    if (Object.keys(selectedFiles).length === 0) {
        alert("الرجاء اختيار صورة واحدة على الأقل!"); return;
    }
    if (!gameId) {
        alert("خطأ: الرجاء إدخال ايدي اللعبة أولاً!"); return;
    }

    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ المعالجة...';

    const zip = new JSZip();
    const autoCrop = autoCropToggle.checked; // حالة القص التلقائي

    for (const suffix in selectedFiles) {
        const file = selectedFiles[suffix];
        const config = ART_CONFIG[suffix];
        const statusDiv = document.getElementById(`status-${suffix}`);
        
        try {
            const resizedBlob = await processImageOnCanvas(file, config, autoCrop);
            const newFilename = `${gameId}${suffix}.${config.format}`;
            zip.file(newFilename, resizedBlob);
            statusDiv.innerHTML += `<div class="success"><i class="fas fa-check"></i> تمت المعالجة بنجاح.</div>`;
        } catch (error) {
            console.error('Error:', error);
            statusDiv.innerHTML += `<div class="error">حدث خطأ أثناء المعالجة</div>`;
        }
    }

    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ تجميع الملف...';
    
    try {
        finalZipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
        downloadZipBtn.style.display = 'inline-block';
        processBtn.style.display = 'none';
    } catch (error) {
        alert('حدث خطأ أثناء إنشاء ملف الـ ZIP.');
        resetProcessState();
    }
}

// --- معالجة الصورة باستخدام Canvas (تغيير الأبعاد أو القص) ---
function processImageOnCanvas(file, config, autoCrop) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = config.width;
            canvas.height = config.height;
            const ctx = canvas.getContext('2d');

            if (autoCrop) {
                // تقنية القص من المنتصف (Center Crop)
                const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                const x = (canvas.width / scale / 2) - (img.width / 2);
                const y = (canvas.height / scale / 2) - (img.height / 2);
                
                ctx.scale(scale, scale);
                ctx.drawImage(img, x, y);
            } else {
                // الضغط التقليدي (قد يجعل الصورة مجعوصة)
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }

            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('فشل التحويل'));
            }, `image/${config.format}`, config.format === 'jpeg' ? 0.9 : 1.0);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function triggerDownload() {
    if (!finalZipBlob) return;
    const gameId = gameIdInput.value.trim() || 'ART';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(finalZipBlob);
    link.download = `${gameId}_ART.zip`;
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

// --- مستمعات الأحداث ---
document.addEventListener('DOMContentLoaded', buildUI);
processBtn.addEventListener('click', startProcessing);
downloadZipBtn.addEventListener('click', triggerDownload);
