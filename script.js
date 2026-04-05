let quizData = [];          
let displayedQuizzes = [];  
let currentIndex = 0;
let isReviewMode = false; // ★追加：復習モードの状態を管理

// --- 1. 初期化 ---
async function init() {
    try {
        const response = await fetch('quiz.json');
        quizData = await response.json();
        
        setupCategoryMenu(quizData);
        updateDisplayList(); // ★ここを updateDisplayList に変更
    } catch (e) {
        console.error("データの読み込みに失敗しました", e);
    }
}

// --- 2. 表示リストの更新（統合フィルタリング） ---
// カテゴリと復習モードの状態を組み合わせて表示リストを作る
function updateDisplayList() {
    const selectedCategory = document.getElementById('category-select').value;
    const records = JSON.parse(localStorage.getItem('linuc_records') || '{}');

    // 条件1: カテゴリで絞り込み
    let filtered = (selectedCategory === "all") 
        ? [...quizData] 
        : quizData.filter(q => q.category === selectedCategory);

    // 条件2: 復習モードがONなら不正解・未回答のみに絞り込み
    if (isReviewMode) {
        filtered = filtered.filter(q => {
            const record = records[q.url];
            return !record || record.status === 'incorrect';
        });
    }

    displayedQuizzes = filtered;
    currentIndex = 0;
    
    // UIの表示更新
    const modeTextEl = document.getElementById('current-mode-text'); // 追加
    const btn = document.getElementById('review-unsolved-btn');
    
    if (isReviewMode) {
        btn.textContent = "復習モード解除 (全表示)";
        btn.style.backgroundColor = "#ffc107";
        if (modeTextEl) modeTextEl.textContent = "現在の表示: 【復習モード】不正解・未回答のみ"; // 追加
    } else {
        btn.textContent = "不正解・未回答のみ解く";
        btn.style.backgroundColor = ""; 
        if (modeTextEl) modeTextEl.textContent = "現在の表示: すべての問題"; // 追加
    }

    showQuiz(currentIndex);
    updateProgress();
}

// --- 3. リセット・表示処理 ---
function resetDisplay() {
    const feedback = document.getElementById('feedback');
    const details = document.getElementById('answer-details');
    feedback.classList.add('hidden');
    details.classList.add('hidden');
    feedback.textContent = '';
    details.textContent = '';
    feedback.className = 'hidden'; 
}

function showQuiz(index) {
    resetDisplay();
    const quiz = displayedQuizzes[index];
    if (!quiz) {
        document.getElementById('quiz-question').textContent = isReviewMode ? "このカテゴリに復習が必要な問題はありません！" : "問題がありません。";
        document.getElementById('choices-container').innerHTML = '';
        document.getElementById('quiz-category').textContent = "-";
        return;
    }

    document.getElementById('quiz-category').textContent = quiz.category;
    document.getElementById('quiz-question').textContent = quiz.question;
    
    const choicesDiv = document.getElementById('choices-container');
    choicesDiv.innerHTML = ''; 
    quiz.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.textContent = `${i + 1}. ${choice}`;
        btn.onclick = () => checkAnswer(i + 1, quiz);
        choicesDiv.appendChild(btn);
    });
}

// --- 4. 正解判定・保存 ---
function checkAnswer(selectedNum, quiz) {
    const correctMatch = quiz.answer.match(/正解は、[「\(（](\d)/);
    const correctNum = correctMatch ? parseInt(correctMatch[1]) : null;
    const isCorrect = selectedNum === correctNum;
    
    saveRecord(quiz.url, isCorrect);
    
    // 解答直後に進捗だけ更新（リストからはまだ消さない方が学習しやすい）
    updateProgress();

    const feedback = document.getElementById('feedback');
    feedback.textContent = isCorrect ? "正解！" : "不正解...";
    feedback.className = isCorrect ? "correct" : "incorrect";
    feedback.classList.remove('hidden');
    
    const details = document.getElementById('answer-details');
    details.textContent = quiz.answer;
    details.classList.remove('hidden');
}

function saveRecord(id, isCorrect) {
    const records = JSON.parse(localStorage.getItem('linuc_records') || '{}');
    records[id] = {
        status: isCorrect ? 'correct' : 'incorrect',
        date: new Date().toLocaleDateString()
    };
    localStorage.setItem('linuc_records', JSON.stringify(records));
}

function updateProgress() {
    const records = JSON.parse(localStorage.getItem('linuc_records') || '{}');
    const total = displayedQuizzes.length;
    if (total === 0) {
        if (document.getElementById('progress-bar-fill')) document.getElementById('progress-bar-fill').style.width = `0%`;
        return;
    }
    const solved = displayedQuizzes.filter(q => records[q.url] && records[q.url].status === 'correct').length;
    const percent = Math.round((solved / total) * 100);

    const textEl = document.getElementById('progress-text');
    const fillEl = document.getElementById('progress-bar-fill');
    if (textEl) textEl.textContent = `このリストの正解率: ${percent}% (正解:${solved} / 全:${total})`;
    if (fillEl) fillEl.style.width = `${percent}%`;
}

// --- 5. イベントリスナー ---
document.getElementById('next-btn').addEventListener('click', () => {
    currentIndex++;
    if (currentIndex < displayedQuizzes.length) {
        showQuiz(currentIndex);
    } else {
        alert("最後の問題です。");
    }
});

// 復習モードボタンの挙動を変更
document.getElementById('review-unsolved-btn').addEventListener('click', () => {
    isReviewMode = !isReviewMode;
    updateDisplayList();
});

document.getElementById('shuffle-btn').addEventListener('click', () => {
    displayedQuizzes.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    showQuiz(currentIndex);
    alert("順番を入れ替えました。");
});

function setupCategoryMenu(data) {
    const select = document.getElementById('category-select');
    let categories = [...new Set(data.map(item => item.category))].sort();
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
    // カテゴリ変更時も updateDisplayList を呼ぶように修正
    select.addEventListener('change', updateDisplayList);
}

init();