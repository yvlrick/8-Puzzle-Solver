
const boardElement = document.getElementById('board');
const newGameBtn = document.getElementById('newGameBtn');
const restartBtn = document.getElementById('restartBtn');
const solveBtn = document.getElementById('solveBtn');
const showHintBtn = document.getElementById('showHintBtn');
const timerElement = document.getElementById('timer');
const stepCountElement = document.getElementById('stepCount');


let state = [1, 2, 3, 4, 5, 6, 7, 8, 0];
let initialState = [...state];
const goalState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
let steps = 0;
let timer = null;
let seconds = 0;
let gameStarted = false;
let aiInterval = null;
let isSolving = false;

function startTimer() {
    if (!gameStarted) {
        gameStarted = true;
        seconds = 0;
        clearInterval(timer);
        timer = setInterval(() => {
            seconds++;
            let mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            let secs = (seconds % 60).toString().padStart(2, '0');
            timerElement.textContent = `⏱️ ${mins}:${secs}`;
        }, 1000);
    }
}

function stopTimer() {
    clearInterval(timer);
    timer = null;
    gameStarted = false;
}

function stopAI() {
    if (aiInterval !== null) {
        clearInterval(aiInterval);
        aiInterval = null;
    }

    isSolving = false;
    solveBtn.disabled = false;
}

function render() {
    boardElement.innerHTML = '';
    state.forEach((val, idx) => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        if (val === 0) {
            tile.classList.add('empty');
        } else {
            tile.textContent = val;
            tile.addEventListener('click', () => {
                if (isSolving) return;
                startTimer();
                moveTile(idx);
            });
        }
        boardElement.appendChild(tile);
    });
    stepCountElement.textContent = `👆 ${steps}`;
}

function getZeroIndex(currentBoard) {
    return currentBoard.indexOf(0);
}

function moveTile(idx) {
    if (isSolving) return;

    const zeroIdx = getZeroIndex(state);
    if (isValidMove(idx, zeroIdx)) {
        [state[idx], state[zeroIdx]] = [state[zeroIdx], state[idx]];
        steps++;
        render();
        checkWin();
    }
}

function isValidMove(idx1, idx2) {
    const r1 = Math.floor(idx1 / 3), c1 = idx1 % 3;
    const r2 = Math.floor(idx2 / 3), c2 = idx2 % 3;
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

function newGame() {
    stopAI();
    stopTimer();
    seconds = 0;
    timerElement.textContent = `⏱️ 00:00`;
    steps = 0;
    
    // Acak puzzle secara valid
    for (let i = 0; i < 150; i++) {
        const zeroIdx = getZeroIndex(state);
        const validNeighbors = [];
        for (let j = 0; j < 9; j++) {
            if (isValidMove(j, zeroIdx)) validNeighbors.push(j);
        }
        const randomIdx = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        [state[randomIdx], state[zeroIdx]] = [state[zeroIdx], state[randomIdx]];
    }
    initialState = [...state]; // Simpan state awal untuk tombol restart
    render();
}

function restartPuzzle() {
    stopAI();
    stopTimer();
    seconds = 0;
    timerElement.textContent = `⏱️ 00:00`;
    steps = 0;
    state = [...initialState];
    render();
}

// Kontrol Keyboard (Arrow keys)
document.addEventListener('keydown', (e) => {
    if (isSolving) return;

    const zeroIdx = getZeroIndex(state);
    let targetIdx = -1;
    const r = Math.floor(zeroIdx / 3);
    const c = zeroIdx % 3;

    if (e.key === 'ArrowUp' && r < 2) targetIdx = zeroIdx + 3;
    if (e.key === 'ArrowDown' && r > 0) targetIdx = zeroIdx - 3;
    if (e.key === 'ArrowLeft' && c < 2) targetIdx = zeroIdx + 1;
    if (e.key === 'ArrowRight' && c > 0) targetIdx = zeroIdx - 1;

    if (targetIdx !== -1) {
        startTimer();
        moveTile(targetIdx);
    }
});



function showHint() {
    if (isSolving) return;

    if (isEqual(state, goalState)) {
        alert('Puzzle sudah selesai!');
        return;
    }

    const solution = aStarSearch([...state]);

    if (!solution || solution.length === 0) {
        alert('Solusi tidak ditemukan.');
        return;
    }

    const nextBoard = solution[0];
    const zeroIdx = getZeroIndex(state);
    const tileIdx = nextBoard.indexOf(0);

    const tileValue = state[tileIdx];

    alert(`💡 Hint: Pindahkan ubin ${tileValue} ke kotak kosong!`);
}


//A*
function solveAStar() {
    if (isSolving) return;

    if (isEqual(state, goalState)) {
        checkWin();
        return;
    }

    isSolving = true;
    solveBtn.disabled = true;

    startTimer();
    const solution = aStarSearch([...state]);

    if (!solution || solution.length === 0) {
        stopAI();
        stopTimer();
        alert('Solusi tidak ditemukan.');
        return;
    }

    let step = 0;
    aiInterval = setInterval(() => {
        if (step < solution.length) {
            state = [...solution[step]];
            steps++;
            render();
            step++;
        } else {
            clearInterval(aiInterval);
            aiInterval = null;
            isSolving = false;
            solveBtn.disabled = false;
            checkWin();
        }
    }, 350);
}

function aStarSearch(startState) {
    const openSet = [{ board: startState, g: 0, h: getManhattan(startState), f: getManhattan(startState), path: [] }];
    const closedSet = new Set();

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();

        if (isEqual(current.board, goalState)) return current.path;
        closedSet.add(current.board.toString());

        const zeroIdx = getZeroIndex(current.board);
        for (let i = 0; i < 9; i++) {
            if (isValidMove(i, zeroIdx)) {
                const nextBoard = [...current.board];
                [nextBoard[i], nextBoard[zeroIdx]] = [nextBoard[zeroIdx], nextBoard[i]];

                if (closedSet.has(nextBoard.toString())) continue;

                const g = current.g + 1;
                const h = getManhattan(nextBoard);
                const f = g + h;

                const existing = openSet.find(item => isEqual(item.board, nextBoard));
                if (!existing || g < existing.g) {
                    if (!existing) {
                        openSet.push({ board: nextBoard, g, h, f, path: [...current.path, nextBoard] });
                    } else {
                        existing.g = g;
                        existing.f = f;
                        existing.path = [...current.path, nextBoard];
                    }
                }
            }
        }
    }
    return null;
}

function getManhattan(board) {
    let distance = 0;
    for (let i = 0; i < 9; i++) {
        const val = board[i];
        if (val !== 0) {
            const targetRow = Math.floor((val - 1) / 3);
            const targetCol = (val - 1) % 3;
            const currentRow = Math.floor(i / 3);
            const currentCol = i % 3;
            distance += Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
        }
    }
    return distance;
}

function isEqual(b1, b2) {
    return b1.every((val, idx) => val === b2[idx]);
}

function checkWin() {
    if (isEqual(state, goalState)) {
        stopTimer();
        setTimeout(() => alert(`🎉 Selamat! Puzzle selesai dalam ${steps} langkah dan waktu ${timerElement.textContent.replace('⏱️ ', '')}!`), 100);
    }
}

newGameBtn.addEventListener('click', newGame);
restartBtn.addEventListener('click', restartPuzzle);
solveBtn.addEventListener('click', solveAStar);
showHintBtn.addEventListener('click', showHint);

newGame();
