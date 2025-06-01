// ゲーム設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// 画像読み込み
const playerImage = new Image();
playerImage.src = 'jiki.png';
const bossImage = new Image();
bossImage.src = 'pile.png';

// 画像が読み込まれるまで待機
let imagesLoaded = 0;
const totalImages = 2;

playerImage.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        gameLoop();
    }
};

bossImage.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        gameLoop();
    }
};

// ゲーム状態
let gameRunning = true;
let score = 0;
let keys = {};
let enemies = [];
let bullets = [];
let items = []; // アイテム配列を追加
let boss = null;
let bossDefeated = false;
let gameOverTimer = 0;
let shootTimer = 0; // 連射用タイマーを追加

// プレイヤー設定
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 60,
    height: 60,
    speed: 5,
    health: 3,
    maxHealth: 5, // 最大ライフを追加
    weaponType: 'normal', // 武器タイプ: 'normal', 'triple', 'laser'
    weaponTimer: 0 // 武器効果の残り時間
};

// アイテムタイプ
const ItemTypes = {
    HEALTH: 'health',
    TRIPLE_SHOT: 'triple',
    LASER: 'laser'
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
        this.attackPattern = 0;
    }
    
    update() {
        // 左右移動
        this.x += this.speed * this.direction;
        if (this.x <= 0 || this.x >= canvas.width - this.width) {
            this.direction *= -1;
        }
        
        // 攻撃パターン
        this.attackTimer++;
        if (this.attackTimer > 30) {
            this.attack();
            this.attackTimer = 0;
            this.attackPattern = (this.attackPattern + 1) % 3;
        }
        
        this.hammerSwing = Math.sin(Date.now() * 0.01) * 20;
    }
    
    attack() {
        // 攻撃パターンによって異なる攻撃
        if (this.attackPattern === 0) {
            // パターン1: 扇形攻撃（5発）
            for (let i = 0; i < 5; i++) {
                const angle = (i - 2) * 0.3;
                enemies.push({
                    x: this.x + this.width / 2,
                    y: this.y + this.height,
                    width: 15,
                    height: 15,
                    speed: 4,
                    speedX: Math.sin(angle) * 3,
                    speedY: Math.cos(angle) * 4,
                    type: 'bossBullet'
                });
            }
        } else if (this.attackPattern === 1) {
            // パターン2: 直線攻撃（4発連射）
            for (let i = 0; i < 4; i++) {
                enemies.push({
                    x: this.x + this.width / 2 + (i - 1.5) * 20,
                    y: this.y + this.height,
                    width: 15,
                    height: 15,
                    speed: 5,
                    speedX: 0,
                    speedY: 5,
                    type: 'bossBullet'
                });
            }
        } else {
            // パターン3: ランダム攻撃（10発）
            for (let i = 0; i < 10; i++) {
                const randomAngle = (Math.random() - 0.5) * Math.PI;
                enemies.push({
                    x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                    y: this.y + this.height,
                    width: 12,
                    height: 12,
                    speed: 3 + Math.random() * 3,
                    speedX: Math.sin(randomAngle) * 2,
                    speedY: Math.cos(randomAngle) * 3 + 2,
                    type: 'bossBullet'
                });
            }
        }
    }
    
    draw() {
        ctx.save();
        
        // ボス画像を描画
        ctx.drawImage(bossImage, this.x, this.y, this.width, this.height);
        
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
            type: 'normal',
            rotation: 0
        });
    }
}

// アイテム生成
function spawnItem() {
    // ランダムでアイテム生成（確率は低めに）
    if (Math.random() < 0.005) { // 0.5%の確率
        const itemTypes = Object.values(ItemTypes);
        const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        
        items.push({
            x: Math.random() * (canvas.width - 40),
            y: -40,
            width: 30,
            height: 30,
            speed: 1.5,
            type: randomType
        });
    }
}

// 弾丸発射（武器タイプ対応）
function shootBullet() {
    if (player.weaponType === 'normal') {
        // 通常弾
        bullets.push({
            x: player.x + player.width / 2 - 3,
            y: player.y,
            width: 6,
            height: 12,
            speed: 8,
            type: 'normal'
        });
    } else if (player.weaponType === 'triple') {
        // 3方向弾
        for (let i = -1; i <= 1; i++) {
            bullets.push({
                x: player.x + player.width / 2 - 3,
                y: player.y,
                width: 6,
                height: 12,
                speed: 8,
                speedX: i * 2, // 横方向の速度
                speedY: 8,
                type: 'triple'
            });
        }
    } else if (player.weaponType === 'laser') {
        // レーザー（太くて高威力）
        bullets.push({
            x: player.x + player.width / 2 - 6,
            y: player.y,
            width: 12,
            height: 25,
            speed: 12,
            type: 'laser',
            damage: 2 // 2倍ダメージ
        });
    }
}

// プレイヤー描画
function drawPlayer() {
    ctx.save();
    
    // プレイヤー画像を描画
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    
    // デバッグ用：当たり判定の範囲を表示（半透明の赤い円）
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const hitboxSize = 20;
    
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(playerCenterX, playerCenterY, hitboxSize / 2, 0, Math.PI * 2);
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
            // ピコピコハンマー
            ctx.save();
            
            // 中心点に移動して回転
            ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            ctx.rotate(enemy.rotation);
            
            // ハンマーの柄
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, 15);
            ctx.stroke();
            
            // ハンマーヘッド（ピンク）
            ctx.fillStyle = '#FF69B4';
            ctx.fillRect(-12, -18, 24, 12);
            
            // ハンマーヘッドのハイライト
            ctx.fillStyle = '#FFB6C1';
            ctx.fillRect(-10, -16, 20, 8);
            
            // 可愛い星マーク
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5;
                const x = Math.cos(angle) * 4;
                const y = Math.sin(angle) * 4 - 12;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
            
            // 回転を更新
            enemy.rotation += 0.2;
        }
    });
}

// アイテム描画
function drawItems() {
    items.forEach(item => {
        ctx.save();
        
        // アイテムの種類に応じて色と形を変更
        if (item.type === ItemTypes.HEALTH) {
            // ライフ回復（赤いハート）
            ctx.fillStyle = '#FF69B4';
            ctx.beginPath();
            ctx.arc(item.x + item.width / 2 - 5, item.y + 8, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(item.x + item.width / 2 + 5, item.y + 8, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(item.x + item.width / 2 - 10, item.y + 5, 20, 15);
            
            // ハート型の下部
            ctx.beginPath();
            ctx.moveTo(item.x + item.width / 2, item.y + 25);
            ctx.lineTo(item.x + item.width / 2 - 10, item.y + 15);
            ctx.lineTo(item.x + item.width / 2 + 10, item.y + 15);
            ctx.closePath();
            ctx.fill();
            
        } else if (item.type === ItemTypes.TRIPLE_SHOT) {
            // 3方向攻撃（青い三角）
            ctx.fillStyle = '#4169E1';
            ctx.beginPath();
            ctx.moveTo(item.x + item.width / 2, item.y);
            ctx.lineTo(item.x, item.y + item.height);
            ctx.lineTo(item.x + item.width, item.y + item.height);
            ctx.closePath();
            ctx.fill();
            
            // 3つの矢印マーク
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(item.x + item.width / 2 + i * 6, item.y + 10);
                ctx.lineTo(item.x + item.width / 2 + i * 6, item.y + 20);
                ctx.stroke();
            }
            
        } else if (item.type === ItemTypes.LASER) {
            // レーザー（黄色い四角）
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(item.x, item.y, item.width, item.height);
            
            // レーザーエフェクト
            ctx.fillStyle = '#FFF';
            ctx.fillRect(item.x + 5, item.y + 5, item.width - 10, item.height - 10);
            
            // L字マーク
            ctx.fillStyle = '#FF0000';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('L', item.x + item.width / 2, item.y + item.height / 2 + 5);
        }
        
        ctx.restore();
    });
}

// 弾丸描画
function drawBullets() {
    bullets.forEach(bullet => {
        if (bullet.type === 'laser') {
            // レーザー弾の描画
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            
            // レーザーエフェクト
            ctx.fillStyle = '#FFF';
            ctx.fillRect(bullet.x + 2, bullet.y, bullet.width - 4, bullet.height);
        } else {
            // 通常弾の描画
            ctx.fillStyle = bullet.type === 'triple' ? '#4169E1' : '#FFD700';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            
            // 星型の弾丸エフェクト
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
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
                // レーザーは2倍ダメージ
                const damage = bullets[i] && bullets[i].damage ? bullets[i].damage : 1;
                for (let d = 0; d < damage; d++) {
                    boss.takeDamage();
                }
                break;
            }
        }
    }
    
    // プレイヤーと敵の衝突
    for (let i = enemies.length - 1; i >= 0; i--) {
        // プレイヤーの当たり判定を中心部のみに縮小
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const hitboxSize = 20; // 当たり判定のサイズ（元のサイズの約1/3）
        
        if (enemies[i].x < playerCenterX + hitboxSize / 2 &&
            enemies[i].x + enemies[i].width > playerCenterX - hitboxSize / 2 &&
            enemies[i].y < playerCenterY + hitboxSize / 2 &&
            enemies[i].y + enemies[i].height > playerCenterY - hitboxSize / 2) {
            
            enemies.splice(i, 1);
            player.health--;
            
            if (player.health <= 0) {
                gameRunning = false;
                showGameOver();
            }
        }
    }
    
    // プレイヤーとアイテムの衝突
    for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].x < player.x + player.width &&
            items[i].x + items[i].width > player.x &&
            items[i].y < player.y + player.height &&
            items[i].y + items[i].height > player.y) {
            
            // アイテム効果を適用
            applyItemEffect(items[i].type);
            items.splice(i, 1);
        }
    }
}

// アイテム効果の適用
function applyItemEffect(itemType) {
    switch(itemType) {
        case ItemTypes.HEALTH:
            // ライフ回復
            player.health = Math.min(player.health + 1, player.maxHealth);
            break;
            
        case ItemTypes.TRIPLE_SHOT:
            // 3方向攻撃（10秒間）
            player.weaponType = 'triple';
            player.weaponTimer = 600; // 60fps × 10秒
            break;
            
        case ItemTypes.LASER:
            // レーザー攻撃（8秒間）
            player.weaponType = 'laser';
            player.weaponTimer = 480; // 60fps × 8秒
            break;
    }
}

// ゲーム更新
function update() {
    if (!gameRunning) return;
    
    // 攻撃ボタンが押されている間の連射
    if (keys['Space']) {
        shootTimer++;
        if (shootTimer > 10) { // 10フレームごとに発射
            shootBullet();
            shootTimer = 0;
        }
    } else {
        shootTimer = 0;
    }
    
    // 武器効果の時間制限
    if (player.weaponTimer > 0) {
        player.weaponTimer--;
        if (player.weaponTimer <= 0) {
            player.weaponType = 'normal'; // 通常武器に戻す
        }
    }
    
    // プレイヤー移動
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;
    if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;
    
    // 弾丸更新
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i].type === 'triple' && bullets[i].speedX !== undefined) {
            // 3方向弾の動き
            bullets[i].x += bullets[i].speedX;
            bullets[i].y -= bullets[i].speedY;
        } else {
            // 通常弾とレーザーの動き
            bullets[i].y -= bullets[i].speed;
        }
        
        if (bullets[i].y < -10) {
            bullets.splice(i, 1);
        }
    }
    
    // アイテム更新
    for (let i = items.length - 1; i >= 0; i--) {
        items[i].y += items[i].speed;
        if (items[i].y > canvas.height + 40) {
            items.splice(i, 1);
        }
    }
    
    // 敵更新
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].type === 'bossBullet' && enemies[i].speedX !== undefined) {
            // ボスの弾の特殊な動き
            enemies[i].x += enemies[i].speedX;
            enemies[i].y += enemies[i].speedY;
        } else {
            // 通常の敵やボスの弾の動き
            enemies[i].y += enemies[i].speed;
        }
        
        // 画面外に出た敵を削除
        if (enemies[i].y > canvas.height + 40 || 
            enemies[i].x < -40 || 
            enemies[i].x > canvas.width + 40) {
            enemies.splice(i, 1);
        }
    }
    
    // ボス出現条件
    if (score >= 0 && !boss && !bossDefeated) {
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
    
    // アイテム生成
    spawnItem();
    
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
    drawItems();
    drawBullets();
    
    if (boss && !bossDefeated) {
        boss.draw();
    }
    
    // ヘルス表示
    ctx.fillStyle = '#FF69B4';
    ctx.font = '20px Comic Sans MS';
    ctx.fillText(`❤️ × ${player.health}/${player.maxHealth}`, 20, 40);
    
    // 武器状態表示
    if (player.weaponType !== 'normal') {
        ctx.fillStyle = '#FFD700';
        ctx.font = '16px Comic Sans MS';
        const timeLeft = Math.ceil(player.weaponTimer / 60);
        let weaponText = '';
        
        if (player.weaponType === 'triple') {
            weaponText = `🔱 3WAY: ${timeLeft}s`;
        } else if (player.weaponType === 'laser') {
            weaponText = `⚡ LASER: ${timeLeft}s`;
        }
        
        ctx.fillText(weaponText, 20, 65);
    }
    
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
    player.weaponType = 'normal';
    player.weaponTimer = 0;
    enemies = [];
    bullets = [];
    items = [];
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