// Клиентская логика простого чат-прототипа
// Элементы DOM, с которыми работает скрипт
const messagesEl = document.getElementById('messages'); // контейнер сообщений
const input = document.getElementById('input'); // поле ввода сообщения
const sendBtn = document.getElementById('send'); // кнопка отправки
const historyEl = document.getElementById('history'); // боковая панель истории
const newChatBtn = document.getElementById('newChat'); // кнопка нового чата
const convTitle = document.getElementById('convTitle'); // заголовок текущей беседы
const modelSelect = document.getElementById('modelSelect'); // селектор модели/режима (демо)
// Новые элементы: input для файла и кнопки управления
const fileInput = document.getElementById('fileInput');
const fileBtn = document.getElementById('fileBtn');
const voiceBtn = document.getElementById('voiceBtn');
const deleteBtn = document.getElementById('deleteBtn');
// Текущая выбранная кнопка в панели истории (если пользователь открыл конкретную историю)
let currentHistoryBtn = null;

// Функция добавляет сообщение в DOM
// Параметры:
// - text: текст сообщения
// - who: кто отправитель ('assistant' или 'user'), по умолчанию 'assistant'
// - scroll: прокручивать ли контейнер к новому сообщению (true/false)
function addMessage(text, who='assistant', scroll=true){
    const el = document.createElement('div');
    // класс 'msg' + конкретный класс для стилей пользователя/ассистента
    el.className = 'msg ' + (who==='user' ? 'user' : 'assistant');
    el.textContent = text;
    messagesEl.appendChild(el);
    // плавно прокручиваем к последнему сообщению, если нужно
    if(scroll) el.scrollIntoView({behavior:'smooth', block:'end'});
    return el;
}

// Отправка текстового сообщения: добавляем сообщение пользователя и имитируем ответ ассистента
function sendMessage(){
    const text = input.value.trim();
    if(!text) return;
    addMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;

    const placeholder = addMessage('...', 'assistant');
    setTimeout(()=>{
        const reply = text; // эхо
        placeholder.textContent = reply;
        sendBtn.disabled = false;
    }, 700);
}

// Привязки для кнопки отправки и Enter в textarea
if(sendBtn){
    sendBtn.addEventListener('click', sendMessage);
}
if(input){
    input.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter' && !e.shiftKey){
            e.preventDefault();
            sendMessage();
        }
    });
}

// Обработчик прикрепления файла (кнопка + скрытый input)
if(fileBtn && fileInput){
    fileBtn.addEventListener('click', ()=> fileInput.click());
    fileInput.addEventListener('change', async (e)=>{
        const file = e.target.files && e.target.files[0];
        if(!file) return;
        const name = file.name;
        const placeholder = addMessage('Attached file: ' + name, 'user');
        try{
            const url = URL.createObjectURL(file);
            if(file.type.startsWith('image/')){
                placeholder.textContent = '';
                const img = document.createElement('img');
                img.src = url;
                img.style.maxWidth = '240px';
                img.style.borderRadius = '8px';
                placeholder.appendChild(img);
            } else {
                placeholder.textContent = '';
                const link = document.createElement('a');
                link.href = url;
                link.textContent = name;
                link.download = name;
                placeholder.appendChild(link);
            }
        }catch(err){
            console.error('File attach error', err);
            addMessage('File attach error', 'assistant');
        } finally {
            fileInput.value = '';
        }
    });
}

let recognition = null;
let recognizing = false;
if(voiceBtn){
    voiceBtn.addEventListener('click', async ()=>{
        // Попробуем Web Speech API (SpeechRecognition) первым — он сразу выдаёт текст
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
        if(SpeechRecognition){
            // если уже распознаём — остановим
            if(recognizing && recognition){
                try{ recognition.stop(); }catch(e){}
                voiceBtn.classList.remove('recording');
                voiceBtn.textContent = '🎤';
                return;
            }
            recognition = new SpeechRecognition();
            recognition.lang = navigator.language || 'ru-RU';
            // показываем промежуточные результаты в поле ввода, чтобы пользователь мог редактировать
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            recognition.onstart = ()=>{ recognizing = true; voiceBtn.classList.add('recording'); voiceBtn.textContent = '■'; };
            recognition.onresult = (ev)=>{
                try{
                    // Собираем текущий скрипт (включая промежуточный)
                    const transcript = Array.from(ev.results).map(r=>r[0].transcript).join('');
                    if(transcript != null){
                        // Помещаем распознанный текст в поле ввода для редактирования
                        input.value = transcript.trim();
                        input.focus();
                        // поместим курсор в конец
                        try{ input.selectionStart = input.selectionEnd = input.value.length; }catch(e){}
                    }
                }catch(err){ console.error('Recognition result error', err); addMessage('Recognition processing error.', 'assistant'); }
            };
            recognition.onerror = (ev)=>{ console.error('SpeechRecognition error', ev); addMessage('Speech recognition error: '+(ev.error||ev.message||'unknown'), 'assistant'); };
            recognition.onend = ()=>{ recognizing = false; voiceBtn.classList.remove('recording'); voiceBtn.textContent = '🎤'; };
            try{ recognition.start(); }catch(e){ console.error('Recognition start failed', e); addMessage('Speech recognition start failed.', 'assistant'); }
            return;
        }

        // Fallback: MediaRecorder-based recording (audio blob)
        // если уже записываем — остановим
        if(recorder && recorder.state === 'recording'){
            try{ recorder.stop(); }catch(e){ console.warn('Stop recorder failed', e); }
            voiceBtn.classList.remove('recording');
            voiceBtn.textContent = '🎤';
            return;
        }

        // Проверки поддержки API
        if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
            addMessage('Your browser does not support microphone access (navigator.mediaDevices).', 'assistant');
            return;
        }
        if(typeof MediaRecorder === 'undefined'){
            addMessage('MediaRecorder API is not available in this browser.', 'assistant');
            return;
        }

        // запрос прав на микрофон и старт записи
        try{
            mediaStream = await navigator.mediaDevices.getUserMedia({audio:true});
            // выберем подходящий mimeType если возможно
            let options = {};
            if(MediaRecorder.isTypeSupported){
                if(MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) options.mimeType = 'audio/webm;codecs=opus';
                else if(MediaRecorder.isTypeSupported('audio/webm')) options.mimeType = 'audio/webm';
                else if(MediaRecorder.isTypeSupported('audio/mp4')) options.mimeType = 'audio/mp4';
            }
            try{ recorder = Object.keys(options).length ? new MediaRecorder(mediaStream, options) : new MediaRecorder(mediaStream); }catch(e){ recorder = new MediaRecorder(mediaStream); }
            chunks = [];
            recorder.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
            recorder.onstop = ()=>{
                try{
                    const mime = chunks[0] && chunks[0].type ? chunks[0].type : 'audio/webm';
                    const blob = new Blob(chunks, {type: mime});
                    const url = URL.createObjectURL(blob);
                    const placeholder = addMessage('Voice message', 'user');
                    placeholder.textContent = '';
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = url;
                    audio.style.maxWidth = '320px';
                    placeholder.appendChild(audio);
                    // остановить треки микрофона
                    if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); mediaStream = null; }
                }catch(err){ console.error('Error processing recorded audio', err); addMessage('Recording failed to process.', 'assistant'); }
            };
            recorder.onerror = (ev)=>{ console.error('Recorder error', ev); addMessage('Recording error: ' + (ev?.error?.name||ev?.error||'unknown'), 'assistant'); };
            recorder.start();
            voiceBtn.classList.add('recording');
            voiceBtn.textContent = '■'; // индикация записи (квадрат стоп)
        }catch(err){
            console.error('Voice record error', err);
            if(err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')){
                addMessage('Permission to use microphone was denied.', 'assistant');
            } else {
                addMessage('Voice input not supported or permission denied.', 'assistant');
            }
            try{ if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); mediaStream = null; } }catch(e){}
        }
    });
}

// Сохраняет краткий фрагмент ответа в боковой истории
// При клике по элементу истории восстанавливается простая «история» в окне чата
// Сериализует текущее содержимое чата в массив объектов (тип, кто, содержимое)
function serializeConversation(){
    const out = [];
    for(const node of messagesEl.children){
        const who = node.classList.contains('user') ? 'user' : 'assistant';
        const img = node.querySelector('img');
        const audio = node.querySelector('audio');
        const link = node.querySelector('a');
        if(img){
            out.push({who, type: 'image', content: img.src});
            continue;
        }
        if(audio){
            out.push({who, type: 'audio', content: audio.src});
            continue;
        }
        if(link){
            out.push({who, type: 'file', content: link.href, name: link.textContent||link.download||''});
            continue;
        }
        // обычный текст
        out.push({who, type: 'text', content: node.textContent});
    }
    return out;
}

// Рендерит массив сообщений (или JSON-строку) в окно чата
function renderConversationFromSnapshot(snapshot){
    let items = snapshot;
    if(typeof snapshot === 'string'){
        try{ items = JSON.parse(snapshot); }catch(e){ items = null; }
    }
    if(!items || !Array.isArray(items)){
        messagesEl.innerHTML = '';
        return;
    }
    messagesEl.innerHTML = '';
    for(const it of items){
        if(it.type === 'image'){
            const el = addMessage('', it.who, false);
            el.textContent = '';
            const img = document.createElement('img');
            img.src = it.content;
            img.style.maxWidth = '240px';
            img.style.borderRadius = '8px';
            el.appendChild(img);
        } else if(it.type === 'audio'){
            const el = addMessage('', it.who, false);
            el.textContent = '';
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = it.content;
            audio.style.maxWidth = '320px';
            el.appendChild(audio);
        } else if(it.type === 'file'){
            const el = addMessage('', it.who, false);
            el.textContent = '';
            const link = document.createElement('a');
            link.href = it.content;
            link.textContent = it.name || it.content.split('/').pop();
            link.download = it.name || '';
            el.appendChild(link);
        } else {
            addMessage(it.content, it.who, false);
        }
    }
    if(messagesEl.lastElementChild) messagesEl.lastElementChild.scrollIntoView({behavior:'smooth', block:'end'});
}

// Сохраняет краткий фрагмент ответа в боковой истории
// Теперь сохраняет структурированный снимок разговора (JSON) в data-атрибуте
function saveToHistory(snippet, snapshot){
    const btn = document.createElement('button');
    // укорачиваем длинные строки для удобства в UI
    btn.textContent = snippet.length>40? snippet.slice(0,40)+'…' : snippet;
    btn.dataset.snippet = snippet;
    // snapshot может быть передан явно; по умолчанию сериализуем текущее содержимое чата
    const snapArray = Array.isArray(snapshot) ? snapshot : (typeof snapshot === 'string' ? (function(){ try{return JSON.parse(snapshot);}catch(e){return null;} })() : serializeConversation());
    try{ btn.dataset.snapshot = JSON.stringify(snapArray || serializeConversation()); }catch(e){ btn.dataset.snapshot = ''; }

    btn.addEventListener('click', ()=>{ // при клике восстанавливаем снимок истории
        if(btn.dataset.snapshot){
            renderConversationFromSnapshot(btn.dataset.snapshot);
        } else {
            messagesEl.innerHTML = '';
            addMessage('History: ' + snippet, 'assistant');
        }
        convTitle.textContent = btn.textContent; // set title to the short snippet
        // запомним, какая кнопка истории сейчас активна
        currentHistoryBtn = btn;
    });

    historyEl.prepend(btn); // добавляем новый элемент в начало
}

// Создать новый чат: очистка сообщений и заголовка, показать приветствие
newChatBtn.addEventListener('click', ()=>{
    let exists = false;
    // перед созданием нового чата — если есть текущие сообщения, сохраним их в истории
    try{
        const items = serializeConversation();
        // не сохраняем, если разговор пуст или содержит только приветствие
        if(items && items.length>0){
            // короткий сниппет: возьмём последнее текстовое сообщение или тип
            const snippet = (function(arr){
                if(!arr || !arr.length) return 'Conversation';
                const last = arr[arr.length-1];
                if(last.type === 'text') return (last.content||'').slice(0,40);
                if(last.type === 'image') return 'Image';
                if(last.type === 'audio') return 'Voice message';
                if(last.type === 'file') return 'File: ' + (last.name || '');
                return 'Conversation';
            })(items);
            // Сохранение в историю
            saveToHistory(snippet, items);
        }
    }catch(e){ console.warn('Save before new chat failed', e); }
    // очистка и новый чат
    messagesEl.innerHTML = '';
    convTitle.textContent = 'New Chat';
    addMessage('Hello! I am a local prototype. Ask me anything or write a task.', 'assistant');
});

// Удаление текущего диалога: подтверждение и очистка
if(deleteBtn){
    deleteBtn.addEventListener('click', ()=>{
        const ok = confirm('Delete this conversation? This cannot be undone.');
        if(!ok) return;
        // очищаем область сообщений и сбрасываем заголовок
        messagesEl.innerHTML = '';
        convTitle.textContent = 'New Chat';
        addMessage('Conversation deleted.', 'assistant');
        // также удаляем кнопку истории, если она соответствует текущему чату
        if(currentHistoryBtn && currentHistoryBtn.parentElement === historyEl){
            currentHistoryBtn.remove();
            currentHistoryBtn = null;
            return;
        }
        // если currentHistoryBtn не установлен, попробуем найти кнопку по заголовку
        const title = convTitle.textContent || '';
        const buttons = historyEl.querySelectorAll('button');
        for(const b of buttons){
            const full = b.dataset.snippet || b.textContent || '';
            if(title && (full === title || full.includes(title) || b.textContent === title)){
                b.remove();
                break;
            }
        }
    });
}

// Поставить фокус в поле ввода при загрузке скрипта
input.focus();