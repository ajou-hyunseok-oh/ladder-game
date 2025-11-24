// 학생 데이터 저장
let students = [];
let ladderData = [];
let results = new Map();

// 캔버스 레이아웃 변수 (동적 계산용)
let canvasLayout = {
    padding: 80,
    columnSpacing: 120,
    rowSpacing: 40,
    portalRadius: 16,
    portalOffset: 26
};

// 학생별 색상 배열
const studentColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    '#E63946', '#A8DADC', '#457B9D', '#F1A7BE', '#FFD166',
    '#06FFA5', '#EF476F', '#118AB2', '#073B4C', '#FFB703',
    '#FB5607', '#8338EC', '#3A86FF', '#FF006E', '#FFBE0B',
    '#7209B7', '#F72585', '#4CC9F0', '#4361EE', '#560BAD'
];

// DOM 요소
const studentIdInput = document.getElementById('studentId');
const studentNameInput = document.getElementById('studentName');
const addStudentBtn = document.getElementById('addStudent');
const studentListDiv = document.getElementById('studentList');
const startGameBtn = document.getElementById('startGame');
const inputSection = document.querySelector('.input-section');
const gameSection = document.getElementById('gameSection');
const canvas = document.getElementById('ladderCanvas');
const ctx = canvas.getContext('2d');
const resultsDiv = document.getElementById('results');
const replayGameBtn = document.getElementById('replayGame');
const resetGameBtn = document.getElementById('resetGame');
const csvFileInput = document.getElementById('csvFile');
const fileNameSpan = document.getElementById('fileName');
const loadCsvBtn = document.getElementById('loadCsv');
const exportSection = document.getElementById('exportSection');
const exportCsvBtn = document.getElementById('exportCsv');

// 학생 추가 이벤트
addStudentBtn.addEventListener('click', addStudent);
studentIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addStudent();
});
studentNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addStudent();
});

// 게임 시작 이벤트
startGameBtn.addEventListener('click', startGame);
replayGameBtn.addEventListener('click', replayGame);
resetGameBtn.addEventListener('click', resetGame);

// CSV 파일 관련 이벤트
csvFileInput.addEventListener('change', handleFileSelect);
loadCsvBtn.addEventListener('click', loadCsvData);
exportCsvBtn.addEventListener('click', exportResultsToCsv);

// 학생 추가 함수
function addStudent() {
    const studentId = studentIdInput.value.trim();
    const studentName = studentNameInput.value.trim();

    if (!studentId || !studentName) {
        alert('학번과 이름을 모두 입력해주세요.');
        return;
    }

    // 중복 확인
    if (students.some(s => s.id === studentId)) {
        alert('이미 등록된 학번입니다.');
        return;
    }

    students.push({ id: studentId, name: studentName });
    updateStudentList();

    // 입력 필드 초기화
    studentIdInput.value = '';
    studentNameInput.value = '';
    studentIdInput.focus();

    // 시작 버튼 활성화 (2명 이상)
    startGameBtn.disabled = students.length < 2;
}

// 학생 목록 업데이트
function updateStudentList() {
    studentListDiv.innerHTML = '';
    students.forEach((student, index) => {
        const tag = document.createElement('div');
        tag.className = 'student-tag';
        tag.innerHTML = `
            <span>${student.id} - ${student.name}</span>
            <button onclick="removeStudent(${index})">×</button>
        `;
        studentListDiv.appendChild(tag);
    });
}

// 학생 제거
function removeStudent(index) {
    students.splice(index, 1);
    updateStudentList();
    startGameBtn.disabled = students.length < 2;
}

// 게임 시작
async function startGame() {
    inputSection.style.display = 'none';
    gameSection.style.display = 'block';

    await runLadderGame();
}

// 다시 추첨
async function replayGame() {
    replayGameBtn.disabled = true;
    await runLadderGame();
    replayGameBtn.disabled = false;
}

// 사다리 게임 실행 (공통 로직)
async function runLadderGame() {
    // 캔버스 완전 초기화
    const tempWidth = canvas.width;
    const tempHeight = canvas.height;
    canvas.width = tempWidth;
    canvas.height = tempHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 결과 초기화
    results.clear();
    resultsDiv.innerHTML = '';

    // 사다리 생성
    generateLadder();

    // 캔버스 그리기
    drawLadder();

    // 약간의 딜레이 후 애니메이션 시작
    await new Promise(resolve => setTimeout(resolve, 100));

    // 모든 학생이 동시에 사다리 타기 시작
    const promises = students.map((student, index) => traceLadder(index, studentColors[index % studentColors.length]));
    await Promise.all(promises);

    // 모든 애니메이션이 끝난 후 결과를 순위별로 정렬하여 표시
    const sortedResults = Array.from(results.entries())
        .map(([id, data]) => {
            const student = students.find(s => s.id === id);
            return { student, rank: data.rank, color: data.color };
        })
        .sort((a, b) => a.rank - b.rank);

    sortedResults.forEach(item => {
        displayResult(item.student, item.rank, item.color);
    });

    // CSV 내보내기 버튼 표시
    exportSection.style.display = 'block';
}

// 사다리 생성 로직
function generateLadder() {
    const numStudents = students.length;
    const numRows = Math.max(8, numStudents * 2); // 최소 8개의 가로줄

    ladderData = [];

    // 각 행마다 가로줄 생성 여부 결정
    for (let row = 0; row < numRows; row++) {
        const bridges = new Array(numStudents).fill(false);

        // 각 세로줄 사이에 가로줄을 랜덤하게 배치
        for (let col = 0; col < numStudents; col++) {
            // 이전 가로줄과 겹치지 않도록 (연속된 가로줄 방지)
            if (col > 0 && bridges[col - 1]) {
                continue;
            }

            bridges[col] = Math.random() > 0.5;
        }

        if (bridges[0] && bridges[numStudents - 1]) {
            bridges[numStudents - 1] = false;
        }

        ladderData.push(bridges);
    }
}

// 캔버스에 사다리 그리기
function drawLadder() {
    const numStudents = students.length;

    // 컨테이너 너비 가져오기
    const containerWidth = document.querySelector('.canvas-container').clientWidth;

    // 동적으로 간격 계산
    const padding = 80;
    const minColumnSpacing = 80; // 최소 간격
    const maxColumnSpacing = 150; // 최대 간격

    // 사용 가능한 너비에서 간격 계산
    const availableWidth = containerWidth - (padding * 2);
    let columnSpacing = availableWidth / (numStudents - 1);

    // 간격 제한
    if (columnSpacing < minColumnSpacing) {
        columnSpacing = minColumnSpacing;
    } else if (columnSpacing > maxColumnSpacing) {
        columnSpacing = maxColumnSpacing;
    }

    const rowSpacing = 40;

    // 레이아웃 정보 저장 (traceLadder에서 사용)
    canvasLayout.padding = padding;
    canvasLayout.columnSpacing = columnSpacing;
    canvasLayout.rowSpacing = rowSpacing;
    canvasLayout.portalRadius = Math.min(18, columnSpacing / 4);
    canvasLayout.portalOffset = canvasLayout.portalRadius + Math.min(24, columnSpacing / 3);

    const canvasWidth = padding * 2 + (numStudents - 1) * columnSpacing;
    const canvasHeight = padding * 2 + ladderData.length * rowSpacing;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 세로줄 그리기
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;

    for (let i = 0; i < numStudents; i++) {
        const x = padding + i * columnSpacing;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, canvasHeight - padding);
        ctx.stroke();
    }

    // 가로줄 그리기
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;

    ladderData.forEach((bridges, row) => {
        const y = padding + (row + 1) * rowSpacing;
        bridges.forEach((hasBridge, col) => {
            if (!hasBridge) return;

            const nextCol = (col + 1) % numStudents;
            const x1 = padding + col * columnSpacing;
            const x2 = padding + nextCol * columnSpacing;
            const wrapsAround = col === numStudents - 1 && nextCol === 0;

            drawBridgeSegment(x1, x2, y, wrapsAround, canvasLayout);
        });
    });

    // 위쪽에 학번 표시
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    students.forEach((student, i) => {
        const x = padding + i * columnSpacing;
        ctx.fillText(student.id, x, padding - 40);
        ctx.fillText(student.name, x, padding - 20);
    });

    // 아래쪽에 순서 번호 표시
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 20px Arial';

    for (let i = 0; i < numStudents; i++) {
        const x = padding + i * columnSpacing;
        ctx.fillText((i + 1).toString(), x, canvasHeight - padding + 30);
    }
}

// 사다리 타기 애니메이션
async function traceLadder(startCol, color) {
    const student = students[startCol];

    // canvasLayout에서 레이아웃 정보 가져오기
    const { padding, columnSpacing, rowSpacing } = canvasLayout;
    const numStudents = students.length;

    let currentCol = startCol;

    // 시작점
    let x = padding + currentCol * columnSpacing;
    let y = padding;

    // 경로 추적 시작
    const strokeStyle = color;
    const lineWidth = 4;

    // 아래로 이동
    for (let row = 0; row < ladderData.length; row++) {
        const targetY = padding + (row + 1) * rowSpacing;

        // 세로로 이동 애니메이션
        await animateLine(x, y, x, targetY, strokeStyle, lineWidth);
        y = targetY;

        // 가로줄 확인
        const bridges = ladderData[row];

        const leftIndex = (currentCol - 1 + numStudents) % numStudents;
        const canMoveLeft = bridges[leftIndex];

        if (canMoveLeft) {
            const targetCol = leftIndex;
            const targetX = padding + targetCol * columnSpacing;
            const wrapsLeft = currentCol === 0 && targetCol === numStudents - 1;

            if (wrapsLeft) {
                await animatePortalBridgeMove(x, y, targetX, canvasLayout, strokeStyle, lineWidth);
            } else {
                await animateLine(x, y, targetX, y, strokeStyle, lineWidth);
            }

            x = targetX;
            currentCol = targetCol;
        } else if (bridges[currentCol]) {
            const targetCol = (currentCol + 1) % numStudents;
            const targetX = padding + targetCol * columnSpacing;
            const wrapsRight = currentCol === numStudents - 1 && targetCol === 0;

            if (wrapsRight) {
                await animatePortalBridgeMove(x, y, targetX, canvasLayout, strokeStyle, lineWidth);
            } else {
                await animateLine(x, y, targetX, y, strokeStyle, lineWidth);
            }

            x = targetX;
            currentCol = targetCol;
        }
    }

    // 최종 위치까지 이동
    const finalY = canvas.height - padding;
    await animateLine(x, y, x, finalY, strokeStyle, lineWidth);

    // 결과 저장
    const rank = currentCol + 1;
    results.set(student.id, { rank, color });
}

// 선 애니메이션 함수
function animateLine(x1, y1, x2, y2, strokeStyle, lineWidth) {
    return new Promise((resolve) => {
        const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.ceil(distance / 6);
        const dx = (x2 - x1) / steps;
        const dy = (y2 - y1) / steps;

        let currentStep = 0;
        let currentX = x1;
        let currentY = y1;

        function step() {
            if (currentStep >= steps) {
                resolve();
                return;
            }

            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            currentX += dx;
            currentY += dy;
            ctx.lineTo(currentX, currentY);
            ctx.stroke();

            currentStep++;
            requestAnimationFrame(step);
        }

        step();
    });
}

async function animatePortalBridgeMove(xStart, startY, xEnd, layout, strokeStyle, lineWidth) {
    const radius = layout.portalRadius ?? 16;
    const spacing = layout.columnSpacing || 120;
    const offset = layout.portalOffset ?? Math.max(radius + 10, spacing / 2);

    const leftColumnX = Math.min(xStart, xEnd);
    const rightColumnX = Math.max(xStart, xEnd);
    const leftCenterX = leftColumnX - offset;
    const rightCenterX = rightColumnX + offset;
    const leftEntryX = leftCenterX + radius;
    const rightEntryX = rightCenterX - radius;

    const startsAtLeft = xStart <= xEnd;
    const entryX = startsAtLeft ? leftEntryX : rightEntryX;
    const exitX = startsAtLeft ? rightEntryX : leftEntryX;

    await animateLine(xStart, startY, entryX, startY, strokeStyle, lineWidth);
    await new Promise(resolve => setTimeout(resolve, 80));
    await animateLine(exitX, startY, xEnd, startY, strokeStyle, lineWidth);
}

function drawBridgeSegment(xStart, xEnd, y, wrapsAround, layout) {
    if (!wrapsAround) {
        ctx.beginPath();
        ctx.moveTo(xStart, y);
        ctx.lineTo(xEnd, y);
        ctx.stroke();
        return;
    }

    drawPortalBridgeSegment(xStart, xEnd, y, layout);
}

function drawPortalBridgeSegment(xStart, xEnd, y, layout) {
    const radius = layout.portalRadius ?? 16;
    const spacing = layout.columnSpacing || 120;
    const offset = layout.portalOffset ?? Math.max(radius + 10, spacing / 2);

    const leftColumnX = Math.min(xStart, xEnd);
    const rightColumnX = Math.max(xStart, xEnd);

    const leftCenterX = leftColumnX - offset;
    const rightCenterX = rightColumnX + offset;
    const leftEntryX = leftCenterX + radius;
    const rightEntryX = rightCenterX - radius;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(leftColumnX, y);
    ctx.lineTo(leftEntryX, y);
    ctx.moveTo(rightEntryX, y);
    ctx.lineTo(rightColumnX, y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.35)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftCenterX, y);
    ctx.bezierCurveTo(
        (leftCenterX + rightCenterX) / 2,
        y - radius * 1.5,
        (leftCenterX + rightCenterX) / 2,
        y + radius * 1.5,
        rightCenterX,
        y
    );
    ctx.stroke();
    ctx.restore();

    drawPortalCircle(leftCenterX, y, radius);
    drawPortalCircle(rightCenterX, y, radius);
}

function drawPortalCircle(centerX, centerY, radius) {
    ctx.save();
    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(0.5, '#c7d2fe');
    gradient.addColorStop(1, '#7886ff');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#4c51bf';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

// 결과 표시
function displayResult(student, rank, color) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    resultItem.innerHTML = `
        <div class="rank" style="color: ${color};">${rank}번</div>
        <div class="info">
            <span style="display: inline-block; width: 20px; height: 20px; background: ${color}; border-radius: 50%; margin-right: 10px; vertical-align: middle;"></span>
            <span style="vertical-align: middle;">${student.id} - ${student.name}</span>
        </div>
    `;
    resultsDiv.appendChild(resultItem);
}

// 게임 리셋
function resetGame() {
    inputSection.style.display = 'block';
    gameSection.style.display = 'none';
    exportSection.style.display = 'none';
    students = [];
    ladderData = [];
    results.clear();
    updateStudentList();
    startGameBtn.disabled = true;
}

// CSV 파일 선택 처리
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        fileNameSpan.textContent = file.name;
        loadCsvBtn.disabled = false;
    } else {
        fileNameSpan.textContent = '파일을 선택하지 않았습니다';
        loadCsvBtn.disabled = true;
    }
}

// CSV 데이터 로드
function loadCsvData() {
    const file = csvFileInput.files[0];
    if (!file) {
        alert('파일을 먼저 선택해주세요.');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const text = e.target.result;
            parseCsvData(text);
        } catch (error) {
            alert('CSV 파일을 읽는 중 오류가 발생했습니다: ' + error.message);
        }
    };

    reader.onerror = function() {
        alert('파일을 읽을 수 없습니다.');
    };

    reader.readAsText(file, 'UTF-8');
}

// CSV 데이터 파싱
function parseCsvData(csvText) {
    const lines = csvText.split('\n');
    let addedCount = 0;
    let duplicateCount = 0;

    lines.forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return; // 빈 줄 건너뛰기

        const parts = trimmedLine.split(',');
        if (parts.length >= 2) {
            const studentId = parts[0].trim();
            const studentName = parts[1].trim();

            // 중복 확인
            if (!students.some(s => s.id === studentId)) {
                students.push({ id: studentId, name: studentName });
                addedCount++;
            } else {
                duplicateCount++;
            }
        }
    });

    updateStudentList();
    startGameBtn.disabled = students.length < 2;

    // 결과 알림
    let message = `${addedCount}명의 학생이 추가되었습니다.`;
    if (duplicateCount > 0) {
        message += `\n(${duplicateCount}명은 중복으로 제외되었습니다.)`;
    }
    alert(message);

    // 입력 필드 초기화
    csvFileInput.value = '';
    fileNameSpan.textContent = '파일을 선택하지 않았습니다';
    loadCsvBtn.disabled = true;
}

// CSV로 결과 내보내기
function exportResultsToCsv() {
    if (results.size === 0) {
        alert('먼저 사다리 게임을 진행해주세요.');
        return;
    }

    // 결과를 순위별로 정렬
    const sortedResults = Array.from(results.entries())
        .map(([id, data]) => {
            const student = students.find(s => s.id === id);
            return { student, rank: data.rank };
        })
        .sort((a, b) => a.rank - b.rank);

    // CSV 헤더와 데이터 생성
    let csvContent = '';

    sortedResults.forEach(item => {
        const row = `${item.rank},${item.student.id},${item.student.name}`;
        csvContent += row + '\n';
    });

    // BOM 추가 (엑셀에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // 다운로드 링크 생성
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    // 현재 날짜와 시간으로 파일명 생성
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:]/g, '-').split('.')[0];
    const filename = `사다리게임_결과_${timestamp}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
