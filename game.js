// ゲーム設定
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// 画像読み込み
const playerSelectImage1 = new Image(); // キャラクター選択画面用の画像
playerSelectImage1.src = 'pelco.png';
const playerSelectImage2 = new Image(); // キャラクター選択画面用の画像
playerSelectImage2.src = 'jiki2.png';

const playerImage1 = new Image(); // 実際のゲームプレイ用の画像
playerImage1.src = 'jiki.png';  // jiki1.pngの代わりにjiki.pngを使用
const playerImage2 = new Image(); // 実際のゲームプレイ用の画像
playerImage2.src = 'jiki2.png';

let playerImage = playerImage1; // デフォルトの自機画像

const bossImage = new Image();
bossImage.src = 'pile.png';
const enemyImage = new Image();
enemyImage.src = 'enemy.png';

// アイテム画像
const itemImages = {
    health: new Image(),
    triple: new Image(),
    laser: new Image(),
    shield: new Image()
};
itemImages.health.src = 'item1.png';
itemImages.triple.src = 'item2.png';
itemImages.laser.src = 'item3.png';
itemImages.shield.src = 'item1.png'; // シールドはitem1を再利用

// サウンド設定
const sounds = {
    shoot: new Audio('sounds/shoot.mp3'),
    explosion: new Audio('sounds/explosion.mp3'),
    powerup: new Audio('sounds/powerup.mp3'),
    bossBattle: new Audio('sounds/boss_battle.mp3'),
    victory: new Audio('sounds/victory.mp3'),
    gameOver: new Audio('sounds/game_over.mp3'),
    bgm: new Audio('sounds/bgm.mp3')
};

// サウンド初期設定
for (const sound in sounds) {
    // エラー処理を追加（サウンドファイルがない場合もゲームが動作するように）
    sounds[sound].addEventListener('error', () => {
        console.log(`サウンド ${sound} の読み込みに失敗しました`);
    });
}

// BGMループ設定
sounds.bgm.loop = true;
sounds.bgm.volume = 0.5;

// 画像が読み込まれるまで待機
let imagesLoaded = 0;
const totalImages = 9; // 画像数を更新（選択用2枚、プレイ用2枚、ボス、敵、アイテム3枚）

function checkAllImagesLoaded() {
    imagesLoaded++;
    console.log(`Image loaded: ${imagesLoaded}/${totalImages}`);
    if (imagesLoaded === totalImages) {
        console.log("All images loaded, starting game loop");
        // 初期状態ではキャラクター選択画面を表示
        characterSelected = false;
        gameStarted = false;
        currentRound = 1;
        gameLoop();
    }
}

// 画像読み込みエラー処理
function handleImageError(imageName) {
    console.log(`Failed to load image: ${imageName}`);
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("All images processed, starting game loop with fallbacks");
        characterSelected = false;
        gameStarted = false;
        currentRound = 1;
        gameLoop();
    }
}

playerSelectImage1.onload = () => checkAllImagesLoaded();
playerSelectImage1.onerror = () => handleImageError('playerSelectImage1');

playerSelectImage2.onload = () => checkAllImagesLoaded();
playerSelectImage2.onerror = () => handleImageError('playerSelectImage2');

playerImage1.onload = () => checkAllImagesLoaded();
playerImage1.onerror = () => handleImageError('playerImage1');

playerImage2.onload = () => checkAllImagesLoaded();
playerImage2.onerror = () => handleImageError('playerImage2');

bossImage.onload = () => checkAllImagesLoaded();
bossImage.onerror = () => handleImageError('bossImage');

enemyImage.onload = () => checkAllImagesLoaded();
enemyImage.onerror = () => handleImageError('enemyImage');

itemImages.health.onload = () => checkAllImagesLoaded();
itemImages.health.onerror = () => handleImageError('itemImages.health');

itemImages.triple.onload = () => checkAllImagesLoaded();
itemImages.triple.onerror = () => handleImageError('itemImages.triple');

itemImages.laser.onload = () => checkAllImagesLoaded();
itemImages.laser.onerror = () => handleImageError('itemImages.laser');

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
let effects = []; // 視覚エフェクト配列を追加
let gameStarted = false; // ゲーム開始フラグ
let bossMode = false; // ボスモードフラグ
let characterSelected = false; // キャラクター選択フラグ
let selectedCharacter = 1; // 選択されたキャラクター（1または2）
let currentRound = 1; // 現在の周回数
let maxRounds = 3; // 最大周回数
let roundClearTimer = 0; // 周回クリア時のタイマー

// スマホ用コントロール
let mobileControls = {
    left: false,
    right: false
};

// スマホ用コントロール設定関数
window.setMobileControl = function(direction, pressed) {
    mobileControls[direction] = pressed;
};

// スマホ用ゲーム開始処理
window.handleMobileStart = function() {
    console.log('handleMobileStart called. characterSelected:', characterSelected, 'gameStarted:', gameStarted);
    
    // まずボタンを非表示にする
    try {
        const mobileButton = document.getElementById('mobileStartButton');
        if (mobileButton) {
            mobileButton.style.display = 'none';
            mobileButton.style.visibility = 'hidden';
            console.log('Mobile button hidden immediately');
        }
    } catch (e) {
        console.log('Mobile button hide error:', e);
    }
    
    if (!characterSelected) {
        // キャラクター選択を確定
        characterSelected = true;
        playerImage = selectedCharacter === 1 ? playerImage1 : playerImage2;
        console.log("Character selected:", selectedCharacter);
        
        // キャラクター選択効果音
        try {
            const selectSound = new Audio('sounds/select.mp3');
            selectSound.volume = 0.4;
            selectSound.play();
        } catch (e) {
            console.log('効果音の再生に失敗しました');
        }
    } else if (!gameStarted) {
        startGame();
    }
};

// キャンバスタッチ処理
window.handleCanvasTouch = function() {
    console.log('handleCanvasTouch called. characterSelected:', characterSelected, 'gameStarted:', gameStarted);
    
    // まずボタンを非表示にする
    try {
        const mobileButton = document.getElementById('mobileStartButton');
        if (mobileButton) {
            mobileButton.style.display = 'none';
            mobileButton.style.visibility = 'hidden';
            console.log('Mobile button hidden by canvas touch');
        }
    } catch (e) {
        console.log('Mobile button hide error:', e);
    }
    
    if (!characterSelected) {
        // キャラクター選択を確定
        characterSelected = true;
        playerImage = selectedCharacter === 1 ? playerImage1 : playerImage2;
        console.log("Character selected:", selectedCharacter);
        
        // キャラクター選択効果音
        try {
            const selectSound = new Audio('sounds/select.mp3');
            selectSound.volume = 0.4;
            selectSound.play();
        } catch (e) {
            console.log('効果音の再生に失敗しました');
        }
    } else if (!gameStarted) {
        startGame();
    }
};

// プレイヤー設定
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 60,
    height: 60,
    speed: 3, // 移動速度を下げる（元は4）
    health: 3,
    maxHealth: 5, // 最大ライフを追加
    weaponType: 'normal', // 武器タイプ: 'normal', 'triple', 'laser', 'shield'
    weaponTimer: 0, // 武器効果の残り時間
    invincible: false, // 無敵状態
    invincibleTimer: 0, // 無敵時間
    blinkTimer: 0, // 点滅エフェクト用タイマー
    autoShootTimer: 0 // 自動発射用タイマー
};

// アイテムタイプ
const ItemTypes = {
    HEALTH: 'health',
    TRIPLE_SHOT: 'triple',
    LASER: 'laser',
    SHIELD: 'shield' // 新しいシールドアイテムを追加
};

// エフェクトタイプ
const EffectTypes = {
    EXPLOSION: 'explosion',
    SPARKLE: 'sparkle',
    TEXT: 'text'
};

// ボス設定
class Boss {
    constructor(round = 1) {
        this.round = round;
        this.x = canvas.width / 2 - 78; // ボスの位置を調整（大きくなるため）
        this.y = 100;
        
        // 周回に応じてサイズを調整
        let sizeMultiplier = 1.3; // 基本サイズ（1周目）
        if (round === 2) {
            sizeMultiplier = 1.5; // 2周目は1.5倍
        } else if (round === 3) {
            sizeMultiplier = 2.0; // 3周目は2倍
            this.x = canvas.width / 2 - 120; // より大きいので位置調整
        }
        
        this.width = 120 * sizeMultiplier;
        this.height = 120 * sizeMultiplier;
        
        // 周回に応じて体力を調整
        this.maxHealth = 50 + (round - 1) * 30; // 1周目50、2周目80、3周目110
        this.health = this.maxHealth;
        
        // 周回に応じて速度を調整（より緩やかに）
        this.speed = 1.2 + (round - 1) * 0.3; // 1周目1.2、2周目1.5、3周目1.8
        this.direction = 1;
        this.attackTimer = 0;
        this.hammerSwing = 0;
        this.attackPattern = 0;
        this.hammerX = 0;
        this.hammerY = 0;
        this.hammerAngle = 0;
        this.hammerSize = 65 * sizeMultiplier; // ハンマーも大きく
        this.angry = false; // ボスの怒りモード
        this.entryAnimation = 0; // 登場アニメーション
        
        // 周回に応じて攻撃間隔を調整（より緩やかに）
        this.attackInterval = Math.max(30, 50 - (round - 1) * 10); // 1周目50、2周目40、3周目30
        
        // ボスBGM開始
        try {
            sounds.bgm.pause();
            sounds.bossBattle.currentTime = 0;
            sounds.bossBattle.play();
        } catch (e) {
            console.log('ボスBGMの再生に失敗しました');
        }
    }
    
    update() {
        // 登場アニメーション
        if (this.entryAnimation < 60) {
            this.entryAnimation++;
            this.y = -this.height + (this.entryAnimation * 3);
            return;
        }
        
        // 左右移動
        this.x += this.speed * this.direction;
        if (this.x <= 0 || this.x >= canvas.width - this.width) {
            this.direction *= -1;
        }
        
        // ハンマーの位置と角度を更新
        this.hammerAngle = Math.sin(Date.now() * 0.004) * 0.5; // ハンマーの振りを少し速く
        this.hammerX = this.x + this.width / 2 + Math.sin(this.hammerAngle) * (78 * (this.width / 156));
        this.hammerY = this.y + this.height / 2 - Math.cos(this.hammerAngle) * (78 * (this.height / 156));
        
        // 攻撃パターン
        this.attackTimer++;
        const attackInterval = this.angry ? Math.max(15, this.attackInterval - 10) : this.attackInterval;
        
        if (this.attackTimer > attackInterval) {
            this.attack();
            this.attackTimer = 0;
            this.attackPattern = (this.attackPattern + 1) % 3;
        }
    }
    
    attack() {
        // 周回に応じて弾の数と速度を調整（より緩やかに）
        const roundMultiplier = this.round;
        const speedBonus = (this.round - 1) * 0.3; // 0.5から0.3に変更
        
        // 攻撃パターンによって異なる攻撃
        if (this.attackPattern === 0) {
            // パターン1: 扇形攻撃
            const bulletCount = (this.angry ? 7 : 5) + (this.round - 1) * 1; // 弾数増加を緩やかに
            
            for (let i = 0; i < bulletCount; i++) {
                const angle = ((i - (bulletCount - 1) / 2) * 0.3);
                enemies.push({
                    x: this.hammerX - 7.5,
                    y: this.hammerY - 7.5,
                    width: 15,
                    height: 15,
                    speed: (this.angry ? 3 : 2.5) + speedBonus, // 速度を下げる
                    speedX: Math.sin(angle) * ((this.angry ? 2.5 : 2) + speedBonus),
                    speedY: Math.cos(angle) * ((this.angry ? 3 : 2.5) + speedBonus),
                    type: 'bossBullet'
                });
            }
            
        } else if (this.attackPattern === 1) {
            // パターン2: 直線攻撃
            const bulletCount = (this.angry ? 6 : 4) + (this.round - 1) * 1;
            
            for (let i = 0; i < bulletCount; i++) {
                enemies.push({
                    x: this.x + this.width / 2 + (i - (bulletCount - 1) / 2) * 20,
                    y: this.y + this.height,
                    width: 15,
                    height: 15,
                    speed: (this.angry ? 3.5 : 3) + speedBonus, // 速度を下げる
                    speedX: 0,
                    speedY: (this.angry ? 3.5 : 3) + speedBonus,
                    type: 'bossBullet'
                });
            }
            
        } else {
            // パターン3: ランダム攻撃
            const bulletCount = (this.angry ? 12 : 8) + (this.round - 1) * 2;
            
            for (let i = 0; i < bulletCount; i++) {
                const randomAngle = (Math.random() - 0.5) * Math.PI;
                enemies.push({
                    x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                    y: this.y + this.height,
                    width: 12,
                    height: 12,
                    speed: (2 + Math.random() * 1.5) + speedBonus, // 速度を下げる
                    speedX: Math.sin(randomAngle) * ((this.angry ? 2 : 1.5) + speedBonus),
                    speedY: Math.cos(randomAngle) * ((this.angry ? 2.5 : 2) + speedBonus) + 1.5,
                    type: 'bossBullet'
                });
            }
        }
    }
    
    draw() {
        ctx.save();
        
        // ボス画像を描画
        ctx.drawImage(bossImage, this.x, this.y, this.width, this.height);
        
        // サングラスを描画（サイズに合わせて調整）
        const glassesScale = this.width / 156;
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 39 * glassesScale, this.y + 52 * glassesScale, 78 * glassesScale, 26 * glassesScale);
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + 39 * glassesScale, this.y + 52 * glassesScale, 78 * glassesScale, 6 * glassesScale);
        
        // ピコピコハンマーを描画
        ctx.save();
        ctx.translate(this.hammerX, this.hammerY);
        ctx.rotate(this.hammerAngle);
        
        const hammerScale = this.width / 156;
        
        // ハンマーの柄
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 10 * hammerScale;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 65 * hammerScale);
        ctx.stroke();
        
        // ハンマーヘッド（ピンク）
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(-26 * hammerScale, 65 * hammerScale, 52 * hammerScale, 32 * hammerScale);
        
        // ハンマーヘッドのハイライト
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(-20 * hammerScale, 71 * hammerScale, 40 * hammerScale, 20 * hammerScale);
        
        ctx.restore();
        
        // ヘルスバー
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y - 20, this.width, 10);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x, this.y - 20, (this.health / this.maxHealth) * this.width, 10);
        
        // 3周目の場合は特別なエフェクト
        if (this.round === 3) {
            // 激おこエフェクト（赤いオーラ）
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.fillRect(this.x - 15, this.y - 15, this.width + 30, this.height + 30);
            
            // 激おこの炎エフェクト
            for (let i = 0; i < 8; i++) {
                const flameX = this.x + Math.random() * this.width;
                const flameY = this.y + this.height - 10;
                
                ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 50)}, 0, ${0.6 + Math.random() * 0.4})`;
                ctx.beginPath();
                ctx.moveTo(flameX, flameY);
                ctx.quadraticCurveTo(
                    flameX - 15 + Math.random() * 30, 
                    flameY - 30 - Math.random() * 30,
                    flameX, 
                    flameY - 60 - Math.random() * 30
                );
                ctx.quadraticCurveTo(
                    flameX + 15 - Math.random() * 30, 
                    flameY - 30 - Math.random() * 30,
                    flameX, 
                    flameY
                );
                ctx.fill();
            }
        }
        
        // 怒りモード時のエフェクト
        if (this.angry) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(this.x - 10, this.y - 10, this.width + 20, this.height + 20);
            
            // 怒りの炎エフェクト
            for (let i = 0; i < 5; i++) {
                const flameX = this.x + Math.random() * this.width;
                const flameY = this.y + this.height - 10;
                
                ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 100)}, 0, ${0.5 + Math.random() * 0.5})`;
                ctx.beginPath();
                ctx.moveTo(flameX, flameY);
                ctx.quadraticCurveTo(
                    flameX - 10 + Math.random() * 20, 
                    flameY - 20 - Math.random() * 20,
                    flameX, 
                    flameY - 40 - Math.random() * 20
                );
                ctx.quadraticCurveTo(
                    flameX + 10 - Math.random() * 20, 
                    flameY - 20 - Math.random() * 20,
                    flameX, 
                    flameY
                );
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
    
    takeDamage() {
        this.health--;
        
        // 体力が半分以下になると怒りモードに
        if (this.health <= this.maxHealth / 2 && !this.angry) {
            this.angry = true;
            this.speed *= 1.5;
            
            // テキストエフェクト
            const angerText = this.round === 3 ? "激おこパイルが本気を出した！" : "パイルが怒った！";
            effects.push({
                type: EffectTypes.TEXT,
                text: angerText,
                x: this.x + this.width / 2,
                y: this.y - 30,
                color: '#FF0000',
                size: 24,
                timer: 60
            });
        }
        
        // ダメージエフェクト
        effects.push({
            type: EffectTypes.SPARKLE,
            x: this.x + Math.random() * this.width,
            y: this.y + Math.random() * this.height,
            size: 20 + Math.random() * 10,
            color: '#FFFF00',
            timer: 20
        });
        
        if (this.health <= 0) {
            bossDefeated = true;
            score += 1000 * this.round; // 周回に応じてスコア倍増
            updateScore();
            
            // 爆発エフェクト
            const explosionCount = this.round === 3 ? 30 : 20;
            for (let i = 0; i < explosionCount; i++) {
                effects.push({
                    type: EffectTypes.EXPLOSION,
                    x: this.x + Math.random() * this.width,
                    y: this.y + Math.random() * this.height,
                    size: 30 + Math.random() * 50,
                    timer: 30 + Math.random() * 30
                });
            }
            
            // 勝利効果音
            try {
                sounds.bossBattle.pause();
                sounds.victory.play();
            } catch (e) {
                console.log('効果音の再生に失敗しました');
            }
        }
    }
}

// 敵生成
function spawnEnemy() {
    if (!boss) {
        const enemyType = Math.random() < 0.2 ? 'fast' : 'normal';
        
        // 周回に応じて敵の速度を調整（より緩やかに）
        const speedMultiplier = 1 + (currentRound - 1) * 0.2; // 0.3から0.2に変更
        const enemySpeed = enemyType === 'fast' ? 
            (1.8 + Math.random() * 1) * speedMultiplier : // 速度を下げる
            (1.2 + Math.random() * 0.8) * speedMultiplier; // 速度を下げる
        
        const enemySize = enemyType === 'fast' ? 30 : 40;
        
        enemies.push({
            x: Math.random() * (canvas.width - enemySize),
            y: -enemySize,
            width: enemySize,
            height: enemySize,
            speed: enemySpeed,
            type: enemyType,
            rotation: 0,
            health: enemyType === 'fast' ? 1 : Math.min(2 + currentRound - 1, 4) // 周回ごとに体力増加（最大4）
        });
    }
}

// アイテム生成
function spawnItem() {
    // ランダムでアイテム生成（確率は低めに）
    if (Math.random() < 0.008) { // 0.8%の確率（元は0.005）
        const itemTypes = Object.values(ItemTypes);
        const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        
        items.push({
            x: Math.random() * (canvas.width - 40),
            y: -40,
            width: 30,
            height: 30,
            speed: 1.2, // アイテムの落下速度を上げる（元は1）
            type: randomType,
            rotation: 0,
            floatOffset: 0
        });
    }
}

// エフェクト生成
function createEffect(type, x, y, options = {}) {
    switch(type) {
        case EffectTypes.EXPLOSION:
            effects.push({
                type: EffectTypes.EXPLOSION,
                x: x,
                y: y,
                size: options.size || 30,
                timer: options.timer || 30,
                color: options.color || '#FF5500'
            });
            break;
            
        case EffectTypes.SPARKLE:
            effects.push({
                type: EffectTypes.SPARKLE,
                x: x,
                y: y,
                size: options.size || 10,
                timer: options.timer || 20,
                color: options.color || '#FFFF00'
            });
            break;
            
        case EffectTypes.TEXT:
            effects.push({
                type: EffectTypes.TEXT,
                text: options.text || '',
                x: x,
                y: y,
                color: options.color || '#FFFFFF',
                size: options.size || 20,
                timer: options.timer || 60
            });
            break;
    }
}

// 弾丸発射（武器タイプ対応）
function shootBullet() {
    // 発射効果音
    try {
        sounds.shoot.currentTime = 0;
        sounds.shoot.volume = 0.3;
        sounds.shoot.play();
    } catch (e) {
        console.log('効果音の再生に失敗しました');
    }
    
    if (player.weaponType === 'normal' || player.weaponType === 'shield') {
        // 通常弾（シールド時も発射可能）
        bullets.push({
            x: player.x + player.width / 2 - 3,
            y: player.y,
            width: 6,
            height: 12,
            speed: 8,
            type: 'normal'
        });
        
        // 発射エフェクト
        createEffect(EffectTypes.SPARKLE, player.x + player.width / 2, player.y, {
            size: 15,
            color: '#FFFF00',
            timer: 10
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
            
            // 発射エフェクト
            createEffect(EffectTypes.SPARKLE, player.x + player.width / 2 + i * 10, player.y, {
                size: 12,
                color: '#4169E1',
                timer: 10
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
        
        // レーザーエフェクト
        createEffect(EffectTypes.SPARKLE, player.x + player.width / 2, player.y, {
            size: 20,
            color: '#FFD700',
            timer: 15
        });
    }
}

// プレイヤー描画
function drawPlayer() {
    ctx.save();
    
    // 無敵状態の点滅
    if (player.invincible) {
        player.blinkTimer++;
        if (player.blinkTimer % 6 >= 3) {
            ctx.globalAlpha = 0.5;
        }
    }
    
    // プレイヤー画像を描画（選択したキャラクターに応じて）
    try {
        const currentPlayerImage = selectedCharacter === 1 ? playerImage1 : playerImage2;
        ctx.drawImage(currentPlayerImage, player.x, player.y, player.width, player.height);
    } catch (e) {
        console.log("Error drawing player:", e);
        // フォールバック表示（画像が読み込めない場合）
        ctx.fillStyle = selectedCharacter === 1 ? '#FFB6C1' : '#87CEEB';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(player.x + player.width/3, player.y + player.height/3, 5, 0, Math.PI * 2);
        ctx.arc(player.x + player.width*2/3, player.y + player.height/3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height*2/3, 10, 0, Math.PI);
        ctx.stroke();
    }
    
    // シールドエフェクト
    if (player.weaponType === 'shield') {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
        
        // シールドの光沢
        const gradient = ctx.createRadialGradient(
            player.x + player.width / 2, player.y + player.height / 2, player.width / 2,
            player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 10
        );
        gradient.addColorStop(0, 'rgba(100, 200, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(100, 200, 255, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// 敵描画
function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.type === 'bossBullet') {
            // ボスの弾
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 弾のエフェクト
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 4, 0, Math.PI * 2);
            ctx.fill();
            
        } else {
            // 通常の敵パンダ
            ctx.save();
            
            // 敵の種類によって色を変える
            if (enemy.type === 'fast') {
                ctx.globalAlpha = 0.8;
            }
            
            // 敵パンダ画像を描画
            ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
            
            // 速い敵は青みがかった色合い
            if (enemy.type === 'fast') {
                ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
            
            ctx.restore();
        }
    });
}

// アイテム描画
function drawItems() {
    items.forEach(item => {
        ctx.save();
        
        // アイテムの浮遊アニメーション
        item.floatOffset = (item.floatOffset || 0) + 0.1;
        const floatY = Math.sin(item.floatOffset) * 5;
        
        // アイテムの回転
        item.rotation = (item.rotation || 0) + 0.05;
        
        // アイテム画像を描画
        const itemImage = itemImages[item.type];
        if (itemImage) {
            ctx.translate(item.x + item.width / 2, item.y + item.height / 2 + floatY);
            ctx.rotate(item.rotation);
            ctx.drawImage(itemImage, -item.width / 2, -item.height / 2, item.width, item.height);
            
            // キラキラエフェクト
            const sparkleSize = 3;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(item.width / 4, -item.height / 4, sparkleSize, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 画像がない場合は従来の描画方法を使用
            ctx.translate(item.x + item.width / 2, item.y + item.height / 2 + floatY);
            ctx.rotate(item.rotation);
            
            // アイテムの種類に応じて色と形を変更
            if (item.type === ItemTypes.HEALTH) {
                // ライフ回復（赤いハート）
                ctx.fillStyle = '#FF69B4';
                ctx.beginPath();
                ctx.arc(-5, -7, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(5, -7, 6, 0, Math.PI * 2);
                ctx.fill();
                
                // ハート型の下部
                ctx.beginPath();
                ctx.moveTo(0, 5);
                ctx.lineTo(-10, -5);
                ctx.lineTo(10, -5);
                ctx.closePath();
                ctx.fill();
                
            } else if (item.type === ItemTypes.TRIPLE_SHOT) {
                // 3方向攻撃（青い三角）
                ctx.fillStyle = '#4169E1';
                ctx.beginPath();
                ctx.moveTo(0, -item.height / 2);
                ctx.lineTo(-item.width / 2, item.height / 2);
                ctx.lineTo(item.width / 2, item.height / 2);
                ctx.closePath();
                ctx.fill();
                
                // 3つの矢印マーク
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 2;
                for (let i = -1; i <= 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 6, -5);
                    ctx.lineTo(i * 6, 5);
                    ctx.stroke();
                }
                
            } else if (item.type === ItemTypes.LASER) {
                // レーザー（黄色い四角）
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height);
                
                // レーザーエフェクト
                ctx.fillStyle = '#FFF';
                ctx.fillRect(-item.width / 2 + 5, -item.height / 2 + 5, item.width - 10, item.height - 10);
                
                // L字マーク
                ctx.fillStyle = '#FF0000';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('L', 0, 5);
                
            } else if (item.type === ItemTypes.SHIELD) {
                // シールド（青い円）
                ctx.fillStyle = '#1E90FF';
                ctx.beginPath();
                ctx.arc(0, 0, item.width / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // シールドマーク
                ctx.strokeStyle = '#FFF';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, item.width / 3, 0, Math.PI * 1.5);
                ctx.stroke();
            }
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
            
            // レーザー軌跡
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height + 20);
            
        } else {
            // 通常弾の描画
            ctx.fillStyle = bullet.type === 'triple' ? '#4169E1' : '#FFD700';
            
            // 星型の弾丸
            const centerX = bullet.x + bullet.width / 2;
            const centerY = bullet.y + bullet.height / 2;
            const outerRadius = bullet.width;
            const innerRadius = bullet.width / 2;
            const spikes = 5;
            
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            
            // 弾丸の中心
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// エフェクト描画
function drawEffects() {
    effects.forEach(effect => {
        ctx.save();
        
        if (effect.type === EffectTypes.EXPLOSION) {
            // 爆発エフェクト
            const gradient = ctx.createRadialGradient(
                effect.x, effect.y, 0,
                effect.x, effect.y, effect.size
            );
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.3, effect.color || '#FF5500');
            gradient.addColorStop(1, 'rgba(255, 85, 0, 0)');
            
            ctx.globalAlpha = effect.timer / 30;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.size * (1 - effect.timer / 60), 0, Math.PI * 2);
            ctx.fill();
            
        } else if (effect.type === EffectTypes.SPARKLE) {
            // キラキラエフェクト
            ctx.globalAlpha = effect.timer / 20;
            
            // 星型のキラキラ
            const centerX = effect.x;
            const centerY = effect.y;
            const outerRadius = effect.size;
            const innerRadius = effect.size / 2;
            const spikes = 5;
            
            ctx.fillStyle = effect.color;
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes + Date.now() * 0.005;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            
        } else if (effect.type === EffectTypes.TEXT) {
            // テキストエフェクト
            ctx.font = `bold ${effect.size}px Comic Sans MS`;
            ctx.textAlign = 'center';
            ctx.fillStyle = effect.color;
            ctx.globalAlpha = effect.timer / 60;
            
            // テキストの影
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            ctx.fillText(effect.text, effect.x, effect.y - (60 - effect.timer) * 0.5);
        }
        
        ctx.restore();
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
                
                // 敵のヘルスを減らす
                if (enemies[j].health) {
                    enemies[j].health--;
                    
                    // ダメージエフェクト
                    createEffect(EffectTypes.SPARKLE, 
                        enemies[j].x + enemies[j].width / 2, 
                        enemies[j].y + enemies[j].height / 2,
                        { size: 15, timer: 10 }
                    );
                    
                    // 敵がまだ生きている場合は弾だけ消す
                    if (enemies[j].health > 0) {
                        bullets.splice(i, 1);
                        break;
                    }
                }
                
                // 爆発エフェクト
                createEffect(EffectTypes.EXPLOSION, 
                    enemies[j].x + enemies[j].width / 2, 
                    enemies[j].y + enemies[j].height / 2,
                    { size: 30 }
                );
                
                // 敵を倒した時の効果音
                try {
                    sounds.explosion.currentTime = 0;
                    sounds.explosion.volume = 0.3;
                    sounds.explosion.play();
                } catch (e) {
                    console.log('効果音の再生に失敗しました');
                }
                
                // 敵と弾を削除
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                
                // スコア加算
                score += 100;
                updateScore();
                
                // スコアエフェクト
                createEffect(EffectTypes.TEXT, 
                    enemies[j] ? enemies[j].x + enemies[j].width / 2 : canvas.width / 2, 
                    enemies[j] ? enemies[j].y : canvas.height / 2,
                    { text: "+100", color: '#FFFF00', timer: 30 }
                );
                
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
                
                // レーザーは2倍ダメージ
                const damage = bullets[i] && bullets[i].damage ? bullets[i].damage : 1;
                
                // ダメージを与える
                for (let d = 0; d < damage; d++) {
                    boss.takeDamage();
                }
                
                // 弾を削除
                bullets.splice(i, 1);
                break;
            }
        }
    }
    
    // プレイヤーと敵の衝突
    if (!player.invincible) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            // プレイヤーの当たり判定を中心部のみに縮小
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            const hitboxSize = 20; // 当たり判定のサイズ（元のサイズの約1/3）
            
            if (enemies[i].x < playerCenterX + hitboxSize / 2 &&
                enemies[i].x + enemies[i].width > playerCenterX - hitboxSize / 2 &&
                enemies[i].y < playerCenterY + hitboxSize / 2 &&
                enemies[i].y + enemies[i].height > playerCenterY - hitboxSize / 2) {
                
                // シールド状態の場合は敵だけ消す
                if (player.weaponType === 'shield') {
                    // シールド効果音
                    try {
                        const shieldSound = new Audio('sounds/shield.mp3');
                        shieldSound.volume = 0.4;
                        shieldSound.play();
                    } catch (e) {
                        console.log('効果音の再生に失敗しました');
                    }
                    
                    // シールドエフェクト
                    createEffect(EffectTypes.EXPLOSION, 
                        playerCenterX, 
                        playerCenterY,
                        { size: 40, color: '#1E90FF' }
                    );
                    
                    enemies.splice(i, 1);
                    continue;
                }
                
                // 爆発エフェクト
                createEffect(EffectTypes.EXPLOSION, 
                    enemies[i].x + enemies[i].width / 2, 
                    enemies[i].y + enemies[i].height / 2
                );
                
                // ダメージ効果音
                try {
                    const damageSound = new Audio('sounds/damage.mp3');
                    damageSound.volume = 0.4;
                    damageSound.play();
                } catch (e) {
                    console.log('効果音の再生に失敗しました');
                }
                
                enemies.splice(i, 1);
                player.health--;
                
                // 無敵時間を設定
                player.invincible = true;
                player.invincibleTimer = 90; // 1.5秒間
                
                // ダメージテキストエフェクト
                createEffect(EffectTypes.TEXT, 
                    playerCenterX, 
                    playerCenterY - 30,
                    { text: "ダメージ!", color: '#FF0000', timer: 45 }
                );
                
                if (player.health <= 0) {
                    gameRunning = false;
                    
                    // ゲームオーバー効果音
                    try {
                        sounds.bgm.pause();
                        if (bossMode) {
                            sounds.bossBattle.pause();
                        }
                        sounds.gameOver.play();
                    } catch (e) {
                        console.log('効果音の再生に失敗しました');
                    }
                    
                    showGameOver();
                }
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
            
            // アイテム取得効果音
            try {
                sounds.powerup.currentTime = 0;
                sounds.powerup.volume = 0.4;
                sounds.powerup.play();
            } catch (e) {
                console.log('効果音の再生に失敗しました');
            }
            
            // アイテム取得エフェクト
            createEffect(EffectTypes.SPARKLE, 
                items[i].x + items[i].width / 2, 
                items[i].y + items[i].height / 2,
                { size: 25, color: '#FFFFFF', timer: 30 }
            );
            
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
            
            // 回復エフェクト
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "❤️ +1", color: '#FF69B4', timer: 45 }
            );
            break;
            
        case ItemTypes.TRIPLE_SHOT:
            // 3方向攻撃（10秒間）
            player.weaponType = 'triple';
            player.weaponTimer = 600; // 60fps × 10秒
            
            // 武器変更エフェクト
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "3WAY攻撃!", color: '#4169E1', timer: 45 }
            );
            break;
            
        case ItemTypes.LASER:
            // レーザー攻撃（8秒間）
            player.weaponType = 'laser';
            player.weaponTimer = 480; // 60fps × 8秒
            
            // 武器変更エフェクト
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "レーザー!", color: '#FFD700', timer: 45 }
            );
            break;
            
        case ItemTypes.SHIELD:
            // シールド（12秒間）
            player.weaponType = 'shield';
            player.weaponTimer = 720; // 60fps × 12秒
            
            // シールドエフェクト
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "シールド!", color: '#1E90FF', timer: 45 }
            );
            break;
    }
}

// ゲーム更新
function update() {
    if (!gameRunning) return;
    
    // 無敵時間の更新
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) {
            player.invincible = false;
            player.blinkTimer = 0;
        }
    }
    
    // 自動発射（弾を出っ放しにする）
    player.autoShootTimer++;
    if (player.autoShootTimer > 18) { // 18フレームごとに自動発射（元は12）
        shootBullet();
        player.autoShootTimer = 0;
    }
    
    // 武器効果の時間制限
    if (player.weaponTimer > 0) {
        player.weaponTimer--;
        if (player.weaponTimer <= 0) {
            // 武器効果終了エフェクト
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "通常武器に戻りました", color: '#FFFFFF', timer: 45 }
            );
            
            player.weaponType = 'normal'; // 通常武器に戻す
        }
    }
    
    // プレイヤー移動（左右のみ、スマホ対応）
    if ((keys['ArrowLeft'] || mobileControls.left) && player.x > 0) {
        player.x -= player.speed;
    }
    if ((keys['ArrowRight'] || mobileControls.right) && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    
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
    
    // エフェクト更新
    for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].timer--;
        if (effects[i].timer <= 0) {
            effects.splice(i, 1);
        }
    }
    
    // ボス出現条件（各周回で1000点に達したらボス出現）
    if (score >= 1000 && !boss && !bossDefeated) {
        boss = new Boss(currentRound);
        bossMode = true;
        
        // ボス出現エフェクト
        let bossText = "";
        if (currentRound === 1) {
            bossText = "パイル出現！";
        } else if (currentRound === 2) {
            bossText = "強化パイル出現！";
        } else if (currentRound === 3) {
            bossText = "激おこパイルが現れた！";
        }
        
        createEffect(EffectTypes.TEXT, 
            canvas.width / 2, 
            canvas.height / 2,
            { text: bossText, color: '#FF0000', size: 40, timer: 120 }
        );
        
        console.log(`Boss appeared in round ${currentRound} at score ${score}`);
    }
    
    // ボス更新
    if (boss && !bossDefeated) {
        boss.update();
    }
    
    // 敵生成（確率を下げる）
    if (Math.random() < 0.015 && !boss) { // 元は0.02
        spawnEnemy();
    }
    
    // アイテム生成
    spawnItem();
    
    checkCollisions();
    
    // ボス撃破後の処理
    if (bossDefeated && gameOverTimer++ > 180) {
        if (currentRound < maxRounds) {
            // 次の周回へ
            roundClearTimer++;
            if (roundClearTimer > 240) { // 4秒後に次の周回開始
                startNextRound();
            }
        } else {
            // 全周回クリア
            gameRunning = false;
            showGameOver(true, true); // 完全クリア
        }
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
    
    // 星の描画（背景装飾）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 20; i++) {
        const x = (Math.sin(Date.now() * 0.001 + i) * 10) + (i * 40) % canvas.width;
        const y = (Math.cos(Date.now() * 0.001 + i) * 10) + (i * 30) % canvas.height;
        const size = 2 + Math.sin(Date.now() * 0.003 + i) * 1;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // キャラクター選択画面
    if (!characterSelected) {
        drawCharacterSelection();
        // スマホ用開始ボタンを表示（強制表示）
        setTimeout(() => {
            try {
                const mobileButton = document.getElementById('mobileStartButton');
                if (mobileButton) {
                    mobileButton.style.display = 'block';
                    mobileButton.style.visibility = 'visible';
                    const buttonElement = mobileButton.querySelector('button');
                    if (buttonElement) {
                        buttonElement.textContent = 'キャラクターを選択してスタート！';
                        buttonElement.style.display = 'block';
                    }
                    console.log('Mobile button shown for character selection (forced)');
                }
            } catch (e) {
                console.log('Mobile button error in character selection:', e);
            }
        }, 100);
        return;
    } else {
        // ゲーム開始後は確実にボタンを非表示
        try {
            const mobileButton = document.getElementById('mobileStartButton');
            if (mobileButton) {
                mobileButton.style.display = 'none';
                mobileButton.style.visibility = 'hidden';
                console.log('Mobile button hidden during game');
            }
        } catch (e) {
            console.log('Mobile button hide error during game:', e);
        }
    }
    
    // ゲーム画面
    if (gameStarted) {
        // ゲーム中は常にボタンを非表示にする
        try {
            const mobileButton = document.getElementById('mobileStartButton');
            if (mobileButton) {
                mobileButton.style.display = 'none';
                mobileButton.style.visibility = 'hidden';
                mobileButton.style.pointerEvents = 'none';
            }
        } catch (e) {
            // エラーは無視
        }
        
        try {
            drawPlayer();
            drawEnemies();
            drawItems();
            drawBullets();
            drawEffects();
            
            if (boss && !bossDefeated) {
                boss.draw();
            }
            
            // 現在の周回表示
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '18px Comic Sans MS';
            ctx.fillText(`${currentRound}周目`, canvas.width - 100, 40);
            
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
                } else if (player.weaponType === 'shield') {
                    weaponText = `🛡️ SHIELD: ${timeLeft}s`;
                }
                
                ctx.fillText(weaponText, 20, 65);
            }
            
            // ボス出現予告
            // パイル出現予告
            if (score >= 800 && score < 1000 && !boss) {
                ctx.fillStyle = '#FF0000';
                ctx.font = '30px Comic Sans MS';
                ctx.textAlign = 'center';
                
                let warningText = "";
                if (currentRound === 1) {
                    warningText = 'パイル出現まで...';
                } else if (currentRound === 2) {
                    warningText = '強化パイル出現まで...';
                } else if (currentRound === 3) {
                    warningText = '激おこパイル出現まで...';
                }
                
                ctx.fillText(warningText, canvas.width / 2, 100);
                ctx.fillText(`あと ${1000 - score} ポイント!`, canvas.width / 2, 140);
                ctx.textAlign = 'left';
            }
            
            // 勝利メッセージ
            if (bossDefeated) {
                ctx.fillStyle = '#FFD700';
                ctx.font = '40px Comic Sans MS';
                ctx.textAlign = 'center';
                
                if (currentRound < maxRounds) {
                    ctx.fillText('🎉 パイル撃破！ 🎉', canvas.width / 2, canvas.height / 2);
                    ctx.font = '24px Comic Sans MS';
                    ctx.fillText(`${currentRound}周目クリア！`, canvas.width / 2, canvas.height / 2 + 50);
                    ctx.fillText(`${currentRound + 1}周目準備中...`, canvas.width / 2, canvas.height / 2 + 80);
                } else {
                    ctx.fillText('🎉 完全クリア！ 🎉', canvas.width / 2, canvas.height / 2);
                    ctx.font = '24px Comic Sans MS';
                    ctx.fillText('全ての周回をクリアしました！', canvas.width / 2, canvas.height / 2 + 50);
                }
                
                ctx.textAlign = 'left';
            }
        } catch (e) {
            console.log("Error in game drawing:", e);
        }
    } else {
        // タイトル画面
        // 半透明の黒背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // タイトル
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '50px Comic Sans MS';
        ctx.textAlign = 'center';
        ctx.fillText('🐼 ペルコちゃんシューティングゲーム 🐼', canvas.width / 2, canvas.height / 2 - 50);
        
        // 説明
        ctx.font = '24px Comic Sans MS';
        ctx.fillText('左右ボタンで移動、弾は自動発射！', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('画面をタップしてスタート！', canvas.width / 2, canvas.height / 2 + 60);
        
        ctx.textAlign = 'left';
        
        // スマホ用開始ボタンを表示（強制表示）
        setTimeout(() => {
            try {
                const mobileButton = document.getElementById('mobileStartButton');
                if (mobileButton) {
                    mobileButton.style.display = 'block';
                    mobileButton.style.visibility = 'visible';
                    const buttonElement = mobileButton.querySelector('button');
                    if (buttonElement) {
                        buttonElement.textContent = 'タップしてスタート！';
                        buttonElement.style.display = 'block';
                    }
                    console.log('Mobile button shown for title screen (forced)');
                }
            } catch (e) {
                console.log('Mobile button error in title screen:', e);
            }
        }, 100);
    }
}

// キャラクター選択画面の描画
function drawCharacterSelection() {
    // 半透明の黒背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // タイトル
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '40px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.fillText('キャラクター選択', canvas.width / 2, 100);
    
    // キャラクター1
    try {
        ctx.drawImage(playerSelectImage1, canvas.width / 4 - 50, canvas.height / 2 - 50, 100, 100);
    } catch (e) {
        console.log("Error drawing playerSelectImage1:", e);
        // フォールバック表示
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(canvas.width / 4 - 50, canvas.height / 2 - 50, 100, 100);
        ctx.fillStyle = '#000000';
        ctx.fillText("ペルコ", canvas.width / 4, canvas.height / 2);
    }
    
    // キャラクター2
    try {
        ctx.drawImage(playerSelectImage2, canvas.width * 3 / 4 - 50, canvas.height / 2 - 50, 100, 100);
    } catch (e) {
        console.log("Error drawing playerSelectImage2:", e);
        // フォールバック表示
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(canvas.width * 3 / 4 - 50, canvas.height / 2 - 50, 100, 100);
        ctx.fillStyle = '#000000';
        ctx.fillText("キイチゴアイドル", canvas.width * 3 / 4, canvas.height / 2);
    }
    
    // 選択枠
    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 5;
    if (selectedCharacter === 1) {
        ctx.strokeRect(canvas.width / 4 - 60, canvas.height / 2 - 60, 120, 120);
    } else {
        ctx.strokeRect(canvas.width * 3 / 4 - 60, canvas.height / 2 - 60, 120, 120);
    }
    
    // 説明
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Comic Sans MS';
    ctx.fillText('←→キーで選択、画面をタップで決定', canvas.width / 2, canvas.height / 2 + 100);
    
    // キャラクター名
    ctx.font = '20px Comic Sans MS';
    ctx.fillText('ペルコ', canvas.width / 4, canvas.height / 2 + 70);
    ctx.fillText('キイチゴアイドル', canvas.width * 3 / 4, canvas.height / 2 + 70);
    
    ctx.textAlign = 'left';
}

// スコア更新
function updateScore() {
    scoreElement.textContent = `スコア: ${score}`;
}

// ゲームオーバー表示
function showGameOver(victory = false, completeClear = false) {
    let titleText = '';
    let message = '';
    
    if (completeClear) {
        titleText = '🎉 完全クリア！ 🎉';
        message = '全ての周回をクリアしました！あなたは真のペルコマスターです！';
    } else if (victory) {
        titleText = '🎉 勝利！ 🎉';
        message = `${currentRound}周目クリア！素晴らしい戦いでした！`;
    } else {
        titleText = 'ゲームオーバー';
        message = `${currentRound}周目で力尽きました...もう一度挑戦しよう！`;
    }
    
    finalScoreElement.textContent = `最終スコア: ${score}`;
    document.getElementById('gameOverTitle').textContent = titleText;
    
    // メッセージ要素がなければ作成
    let messageElement = document.getElementById('gameOverMessage');
    if (!messageElement) {
        messageElement = document.createElement('p');
        messageElement.id = 'gameOverMessage';
        document.getElementById('gameOver').insertBefore(
            messageElement, 
            document.querySelector('#gameOver button')
        );
    }
    
    messageElement.textContent = message;
    gameOverElement.style.display = 'block';
}

// 次の周回開始
function startNextRound() {
    currentRound++;
    bossDefeated = false;
    boss = null;
    bossMode = false;
    gameOverTimer = 0;
    roundClearTimer = 0;
    
    // プレイヤーの体力を回復
    player.health = Math.min(player.health + 1, player.maxHealth);
    
    // 敵と弾丸をクリア
    enemies = [];
    bullets = [];
    
    // スコアを各周回の開始値にリセット
    if (currentRound === 2) {
        score = 0; // 2周目は0から開始
    } else if (currentRound === 3) {
        score = 0; // 3周目も0から開始
    }
    updateScore();
    
    // 次の周回開始エフェクト
    createEffect(EffectTypes.TEXT, 
        canvas.width / 2, 
        canvas.height / 2,
        { text: `${currentRound}周目開始！`, color: '#00FF00', size: 36, timer: 120 }
    );
    
    // BGM再開
    try {
        sounds.bgm.currentTime = 0;
        sounds.bgm.play();
    } catch (e) {
        console.log('BGMの再生に失敗しました');
    }
}

// ゲーム再起動
function restartGame() {
    gameRunning = true;
    gameStarted = true;
    characterSelected = true; // キャラクター選択をスキップ
    score = 0;
    currentRound = 1; // 周回をリセット
    roundClearTimer = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    player.health = 3;
    player.weaponType = 'normal';
    player.weaponTimer = 0;
    player.invincible = false;
    player.invincibleTimer = 0;
    player.autoShootTimer = 0; // 自動発射タイマーをリセット
    enemies = [];
    bullets = [];
    items = [];
    effects = [];
    boss = null;
    bossDefeated = false;
    bossMode = false;
    gameOverTimer = 0;
    updateScore();
    gameOverElement.style.display = 'none';
    
    // BGM再生
    try {
        sounds.bgm.currentTime = 0;
        sounds.bgm.play();
    } catch (e) {
        console.log('BGMの再生に失敗しました');
    }
}

// ゲーム開始
function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        
        // ボタンを確実に非表示にする
        try {
            const mobileButton = document.getElementById('mobileStartButton');
            if (mobileButton) {
                mobileButton.style.display = 'none';
                mobileButton.style.visibility = 'hidden';
                mobileButton.style.pointerEvents = 'none';
                console.log('Mobile button hidden in startGame');
            }
        } catch (e) {
            console.log('Mobile button hide error in startGame:', e);
        }
        
        // BGM再生
        try {
            sounds.bgm.play();
        } catch (e) {
            console.log('BGMの再生に失敗しました');
        }
        
        // 開始エフェクト
        createEffect(EffectTypes.TEXT, 
            canvas.width / 2, 
            canvas.height / 2,
            { text: "ゲームスタート！", color: '#FFFFFF', size: 40, timer: 60 }
        );
    }
}

// キーボードイベント
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (e.code === 'Space') {
        e.preventDefault();
        
        if (!characterSelected) {
            // キャラクター選択を確定
            characterSelected = true;
            // 選択したキャラクターに応じて実際のプレイ用画像を設定
            playerImage = selectedCharacter === 1 ? playerImage1 : playerImage2;
            console.log("Character selected:", selectedCharacter);
            
            // キャラクター選択効果音
            try {
                const selectSound = new Audio('sounds/select.mp3');
                selectSound.volume = 0.4;
                selectSound.play();
            } catch (e) {
                console.log('効果音の再生に失敗しました');
            }
        } else if (!gameStarted) {
            startGame();
        }
        // スペースキーでの攻撃は削除（自動発射のため）
    }
    
    // キャラクター選択画面での左右キー
    if (!characterSelected) {
        if (e.code === 'ArrowLeft') {
            selectedCharacter = 1;
            console.log("Selected character 1");
        } else if (e.code === 'ArrowRight') {
            selectedCharacter = 2;
            console.log("Selected character 2");
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// ゲームループ
function gameLoop() {
    console.log("Game loop running. Character selected:", characterSelected, "Game started:", gameStarted, "Current round:", currentRound);
    
    draw();
    
    if (characterSelected && gameStarted) {
        update();
    }
    
    requestAnimationFrame(gameLoop);
}

// ゲーム開始
updateScore();

// 強制的にゲームループを開始（画像読み込み完了を待たない）
setTimeout(() => {
    console.log("Force starting game loop");
    characterSelected = false;
    gameStarted = false;
    currentRound = 1;
    
    // モバイル用ボタンを強制表示
    try {
        const mobileButton = document.getElementById('mobileStartButton');
        if (mobileButton) {
            mobileButton.style.display = 'block';
            console.log('Mobile button force displayed');
        }
    } catch (e) {
        console.log('Mobile button force display error:', e);
    }
    
    gameLoop();
}, 500); 
// サウンド管理関数
window.updateSoundSettings = function(enabled) {
    for (const sound in sounds) {
        if (enabled) {
            sounds[sound].muted = false;
            if (sound === 'bgm' && gameStarted) {
                sounds.bgm.play();
            }
        } else {
            sounds[sound].muted = true;
        }
    }
};
// 初期化処理
window.onload = function() {
    console.log("Window loaded");
    
    // 初期状態を設定
    characterSelected = false;
    gameStarted = false;
    currentRound = 1;
    
    // モバイル用ボタンを即座に表示
    setTimeout(() => {
        try {
            const mobileButton = document.getElementById('mobileStartButton');
            if (mobileButton) {
                mobileButton.style.display = 'block';
                console.log('Mobile button displayed on window load');
            }
        } catch (e) {
            console.log('Mobile button display error on load:', e);
        }
    }, 100);
    
    // 画像が読み込まれない場合のフォールバック
    setTimeout(() => {
        if (imagesLoaded < totalImages) {
            console.log("Not all images loaded, starting game loop anyway");
            gameLoop();
        }
    }, 1000);
};
