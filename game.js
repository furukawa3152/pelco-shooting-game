// ゲーム設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// ゲーム状態
let gameRunning = true;
let score = 0;
let keys = {};
let enemies = [];
let bullets = [];
let boss = null;
let bossDefeated = false;
let gameOverTimer = 0;

// プレイヤー設定
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 60,
    height: 60,
    speed: 5,
    health: 3
};

// ボス設定
class Boss {
    constructor() {
        this.x = canvas.width / 2;
        this.y = 100;
        this.width = 120;
        this.height = 120;
        this.health = 50;
        this.maxHealth = 50;
        this.speed = 2;
        this.direction = 1;
        this.attackTimer = 0;
        this.hammerSwing = 0;
    }
    
    update() {
        // 左右移動
        this.x += this.speed * this.direction;
        if (this.x <= 0 || this.x >= canvas.width - this.width) {
            this.direction *= -1;
        }
        
        // 攻撃パターン
        this.attackTimer++;
        if (this.attackTimer > 60) {
            this.attack();
            this.attackTimer = 0;
        }
        
        this.hammerSwing = Math.sin(Date.now() * 0.01) * 20;
    }
    
    attack() {
        // ボスから弾を発射
        for (let i = 0; i < 3; i++) {
            enemies.push({
                x: this.x + this.width / 2 + (i - 1) * 30,
                y: this.y + this.height,
                width: 15,
                height: 15,
                speed: 3,
                type: 'bossBullet'
            });
        }
    }
    
    draw() {
        ctx.save();
        
        // ボスパンダの体
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 20, this.y + 40, this.width - 40, this.height - 40);
        
        // ボスパンダの頭
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 30, 35, 0, Math.PI * 2);
        ctx.fill();
        
        // 耳
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2 - 25, this.y + 15, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2 + 25, this.y + 15, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // サングラス
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + this.width / 2 - 30, this.y + 20, 60, 20);
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + this.width / 2 - 25, this.y + 25, 20, 10);
        ctx.fillRect(this.x + this.width / 2 + 5, this.y + 25, 20, 10);
        
        // 鼻
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 35, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 手とピコピコハンマー
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2 + 40, this.y + 60);
        ctx.lineTo(this.x + this.width / 2 + 50 + this.hammerSwing, this.y + 40);
        ctx.stroke();
        
        // ハンマーヘッド
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(this.x + this.width / 2 + 45 + this.hammerSwing, this.y + 30, 20, 20);
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(this.x + this.width / 2 + 48 + this.hammerSwing, this.y + 33, 14, 14);
        
        // ヘルスバー
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y - 20, this.width, 8);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x, this.y - 20, (this.health / this.maxHealth) * this.width, 8);
        
        ctx.restore();
    }
    
    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            bossDefeated = true;
            score += 1000;
            updateScore();
        }
    }
}

// 敵生成
function spawnEnemy() {
    if (!boss) {
        enemies.push({
            x: Math.random() * (canvas.width - 40),
            y: -40,
            width: 40,
            height: 40,
            speed: 2 + Math.random() * 2,
            type: 'normal'
        });
    }
}

// 弾丸発射
function shootBullet() {
    bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y,
        width: 6,
        height: 12,
        speed: 8
    });
}

// プレイヤー描画
function drawPlayer() {
    ctx.save();
    
    // プレイヤーパンダの体
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // 耳
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2 - 18, player.y + 15, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2 + 18, player.y + 15, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // 目
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2 - 8, player.y + 25, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2 + 8, player.y + 25, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 鼻
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + 30, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // 可愛い頬の赤み
    ctx.fillStyle = '#FFB6C1';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2 - 20, player.y + 35, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2 + 20, player.y + 35, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// 敵描画
function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.type === 'bossBullet') {
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 小さな敵パンダ
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // 敵の耳
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2 - 10, enemy.y + 10, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2 + 10, enemy.y + 10, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // 怒った表情
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2 - 5, enemy.y + 20, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2 + 5, enemy.y + 20, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// 弾丸描画
function drawBullets() {
    ctx.fillStyle = '#FFD700';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        
        // 星型の弾丸エフェクト
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
    });
}

// 衝突判定
function checkCollisions() {
    // 弾丸と敵の衝突
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i] && enemies[j] && enemies[j].type !== 'bossBullet' &&
                bullets[i].x < enemies[j].x + enemies[j].width &&
                bullets[i].x + bullets[i].width > enemies[j].x &&
                bullets[i].y < enemies[j].y + enemies[j].height &&
                bullets[i].y + bullets[i].height > enemies[j].y) {
                
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                score += 100;
                updateScore();
                break;
            }
        }
    }
    
    // 弾丸とボスの衝突
    if (boss) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i] &&
                bullets[i].x < boss.x + boss.width &&
                bullets[i].x + bullets[i].width > boss.x &&
                bullets[i].y < boss.y + boss.height &&
                bullets[i].y + bullets[i].height > boss.y) {
                
                bullets.splice(i, 1);
                boss.takeDamage();
                break;
            }
        }
    }
    
    // プレイヤーと敵の衝突
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].x < player.x + player.width &&
            enemies[i].x + enemies[i].width > player.x &&
            enemies[i].y < player.y + player.height &&
            enemies[i].y + enemies[i].height > player.y) {
            
            enemies.splice(i, 1);
            player.health--;
            
            if (player.health <= 0) {
                gameRunning = false;
                showGameOver();
            }
        }
    }
}

// ゲーム更新
function update() {
    if (!gameRunning) return;
    
    // プレイヤー移動
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;
    if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;
    
    // 弾丸更新
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;
        if (bullets[i].y < -10) {
            bullets.splice(i, 1);
        }
    }
    
    // 敵更新
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].y += enemies[i].speed;
        if (enemies[i].y > canvas.height + 40) {
            enemies.splice(i, 1);
        }
    }
    
    // ボス出現条件
    if (score >= 1000 && !boss && !bossDefeated) {
        boss = new Boss();
    }
    
    // ボス更新
    if (boss && !bossDefeated) {
        boss.update();
    }
    
    // 敵生成
    if (Math.random() < 0.02 && !boss) {
        spawnEnemy();
    }
    
    checkCollisions();
    
    // ボス撃破後の処理
    if (bossDefeated && gameOverTimer++ > 120) {
        gameRunning = false;
        showGameOver(true);
    }
}

// 描画
function draw() {
    // 背景クリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景グラデーション
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E6E6FA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 雲の描画
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 5; i++) {
        const x = (Date.now() * 0.02 + i * 160) % (canvas.width + 100) - 50;
        const y = 50 + i * 30;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawPlayer();
    drawEnemies();
    drawBullets();
    
    if (boss && !bossDefeated) {
        boss.draw();
    }
    
    // ヘルス表示
    ctx.fillStyle = '#FF69B4';
    ctx.font = '20px Comic Sans MS';
    ctx.fillText(`❤️ × ${player.health}`, 20, 40);
    
    // ボス出現予告
    if (score >= 800 && score < 1000 && !boss) {
        ctx.fillStyle = '#FF0000';
        ctx.font = '30px Comic Sans MS';
        ctx.textAlign = 'center';
        ctx.fillText('ボス出現まで...', canvas.width / 2, 100);
        ctx.textAlign = 'left';
    }
    
    // 勝利メッセージ
    if (bossDefeated) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '40px Comic Sans MS';
        ctx.textAlign = 'center';
        ctx.fillText('🎉 ボス撃破！ 🎉', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
    }
}

// スコア更新
function updateScore() {
    scoreElement.textContent = `スコア: ${score}`;
}

// ゲームオーバー表示
function showGameOver(victory = false) {
    finalScoreElement.textContent = `最終スコア: ${score}`;
    document.getElementById('gameOverTitle').textContent = victory ? '🎉 勝利！ 🎉' : 'ゲームオーバー';
    gameOverElement.style.display = 'block';
}

// ゲーム再起動
function restartGame() {
    gameRunning = true;
    score = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    player.health = 3;
    enemies = [];
    bullets = [];
    boss = null;
    bossDefeated = false;
    gameOverTimer = 0;
    updateScore();
    gameOverElement.style.display = 'none';
}

// キーボードイベント
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameRunning) shootBullet();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// ゲームループ
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// ゲーム開始
updateScore();
gameLoop(); 