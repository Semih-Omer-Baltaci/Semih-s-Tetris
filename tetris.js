const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('start-btn');

const BLOCK_SIZE = 20;
const ROWS = 20;
const COLS = 12;
let score = 0;
let lines = 0;
let level = 1;
let gameLoop;
let currentPiece;
let nextPiece;
let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let gameOver = false;

const PIECES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[1, 1, 1], [0, 1, 0]], // T
    [[1, 1, 1], [1, 0, 0]], // L
    [[1, 1, 1], [0, 0, 1]], // J
    [[1, 1, 0], [0, 1, 1]], // S
    [[0, 1, 1], [1, 1, 0]]  // Z
];

// Modern ve göz yormayan renkler
const COLORS = [
    '#e74c3c', // kırmızı
    '#3498db', // mavi
    '#2ecc71', // yeşil
    '#9b59b6', // mor
    '#f1c40f', // sarı
    '#e67e22', // turuncu
    '#1abc9c'  // turkuaz
];

class Piece {
    constructor(shape = null, color = null) {
        this.shape = shape || PIECES[Math.floor(Math.random() * PIECES.length)];
        this.color = color || COLORS[PIECES.indexOf(this.shape)];
        this.x = Math.floor((COLS - this.shape[0].length) / 2);
        this.y = 0;
    }

    rotate() {
        const newShape = Array(this.shape[0].length).fill()
            .map(() => Array(this.shape.length).fill(0));
        
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                newShape[x][this.shape.length - 1 - y] = this.shape[y][x];
            }
        }
        
        const oldShape = this.shape;
        this.shape = newShape;
        
        if (this.collision()) {
            this.shape = oldShape;
        }
    }

    collision() {
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x]) {
                    const boardX = this.x + x;
                    const boardY = this.y + y;
                    
                    if (boardX < 0 || boardX >= COLS || 
                        boardY >= ROWS ||
                        (boardY >= 0 && board[boardY][boardX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}

function drawBoard() {
    // Temiz arka plan
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Izgara çizgileri
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1;
    
    // Dikey çizgiler
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    
    // Yatay çizgiler
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }
    
    // Mevcut blokları çiz
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(x * BLOCK_SIZE, y * BLOCK_SIZE, board[y][x]);
            }
        }
    }
}

function drawBlock(x, y, color) {
    // Ana blok
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    
    // Kenar efekti
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x + 1, y + 1, BLOCK_SIZE - 2, 3);
    ctx.fillRect(x + 1, y + 1, 3, BLOCK_SIZE - 2);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(x + BLOCK_SIZE - 4, y + 1, 3, BLOCK_SIZE - 2);
    ctx.fillRect(x + 1, y + BLOCK_SIZE - 4, BLOCK_SIZE - 2, 3);
}

function drawPiece(piece, context, offsetX = 0, offsetY = 0) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(
                    (piece.x + x + offsetX) * BLOCK_SIZE,
                    (piece.y + y + offsetY) * BLOCK_SIZE,
                    piece.color
                );
            }
        });
    });
}

function mergePiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                if (currentPiece.y + y < 0) {
                    gameOver = true;
                    return;
                }
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
            }
        });
    });
}

function clearLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        score += linesCleared * 100 * level;
        level = Math.floor(lines / 10) + 1;
        
        scoreElement.textContent = score;
        linesElement.textContent = lines;
        levelElement.textContent = level;
    }
}

function moveDown() {
    currentPiece.y++;
    if (currentPiece.collision()) {
        currentPiece.y--;
        mergePiece();
        clearLines();
        if (gameOver) {
            endGame();
            return;
        }
        currentPiece = nextPiece;
        nextPiece = new Piece();
        drawNextPiece();
    }
}

function moveLeft() {
    currentPiece.x--;
    if (currentPiece.collision()) {
        currentPiece.x++;
    }
}

function moveRight() {
    currentPiece.x++;
    if (currentPiece.collision()) {
        currentPiece.x--;
    }
}

function hardDrop() {
    while (!currentPiece.collision()) {
        currentPiece.y++;
    }
    currentPiece.y--;
    moveDown();
}

function update() {
    drawBoard();
    drawPiece(currentPiece, ctx);
}

function gameStep() {
    moveDown();
    update();
}

function startGame() {
    if (gameLoop) return;
    
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;
    
    currentPiece = new Piece();
    nextPiece = new Piece();
    drawNextPiece();
    
    gameLoop = setInterval(() => {
        gameStep();
    }, 1000 / level);
}

function endGame() {
    clearInterval(gameLoop);
    gameLoop = null;
    
    // Game Over ekranı
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 30px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '20px Segoe UI';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
}

function drawNextPiece() {
    // Temiz arka plan
    nextCtx.fillStyle = '#2c3e50';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const offsetX = (nextCanvas.width / BLOCK_SIZE - nextPiece.shape[0].length) / 2;
    const offsetY = (nextCanvas.height / BLOCK_SIZE - nextPiece.shape.length) / 2;
    
    drawPiece(nextPiece, nextCtx, offsetX, offsetY);
}

document.addEventListener('keydown', event => {
    if (!currentPiece || gameOver) return;
    
    switch (event.keyCode) {
        case 37: // Left arrow
            moveLeft();
            break;
        case 39: // Right arrow
            moveRight();
            break;
        case 40: // Down arrow
            moveDown();
            break;
        case 38: // Up arrow
            currentPiece.rotate();
            break;
        case 32: // Space
            hardDrop();
            break;
    }
    update();
});

startBtn.addEventListener('click', startGame);

drawBoard();
