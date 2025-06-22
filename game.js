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

// アイテム画像（拡張）
const itemImages = {
    health: new Image(),
    triple: new Image(),
    laser: new Image(),
    shield: new Image(),
    rapid_fire: new Image(),
    speed_up: new Image(),
    power_up: new Image(),
    homing: new Image(),
    spread: new Image(),
    penetrate: new Image()
};
itemImages.health.src = 'item1.png';
itemImages.triple.src = 'item2.png';
itemImages.laser.src = 'item3.png';
itemImages.shield.src = 'item1.png'; // シールドはitem1を再利用
itemImages.rapid_fire.src = 'item2.png'; // 連射はitem2を再利用
itemImages.speed_up.src = 'item3.png'; // スピードはitem3を再利用
itemImages.power_up.src = 'item1.png'; // パワーはitem1を再利用
itemImages.homing.src = 'item2.png'; // ホーミングはitem2を再利用
itemImages.spread.src = 'item3.png'; // 拡散はitem3を再利用
itemImages.penetrate.src = 'item1.png'; // 貫通はitem1を再利用

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
const totalImages = 9; // 画像数（選択用2枚、プレイ用2枚、ボス、敵、アイテム3枚）

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
let secondBoss = null; // 3周目用の2体目ボス
let bossDefeated = false;
let gameOverTimer = 0;
let shootTimer = 0; // 連射用タイマーを追加
let effects = []; // 視覚エフェクト配列を追加
let gameStarted = false; // ゲーム開始フラグ
let bossMode = false; // ボスモードフラグ
let characterSelected = false; // キャラクター選択フラグ
let selectedCharacter = 1; // 選択されたキャラクター（1または2）
let currentRound = 1; // 現在の周回数
let maxRounds = 4; // 最大周回数（4周回に拡張）
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
    x: 400, // canvas.width / 2の代わりに固定値
    y: 520, // canvas.height - 80の代わりに固定値
    width: 60,
    height: 60,
    speed: 3, // 移動速度を下げる（元は4）
    health: 3,
    maxHealth: 5, // 最大ライフを追加
    // 複数武器効果を同時に持てるように変更
    activeWeapons: new Set(['normal']), // アクティブな武器効果のセット
    weaponTimers: {}, // 各武器効果の残り時間
    invincible: false, // 無敵状態
    invincibleTimer: 0, // 無敵時間
    blinkTimer: 0, // 点滅エフェクト用タイマー
    autoShootTimer: 0, // 自動発射用タイマー
    // 新しい能力値
    fireRate: 1.0, // 発射速度倍率
    moveSpeed: 1.0, // 移動速度倍率
    bulletDamage: 1.0, // 弾丸ダメージ倍率
    bulletSpeed: 1.0 // 弾丸速度倍率
};

// アイテムタイプ（大幅拡張）
const ItemTypes = {
    HEALTH: 'health',
    TRIPLE_SHOT: 'triple',
    LASER: 'laser',
    SHIELD: 'shield',
    RAPID_FIRE: 'rapid_fire', // 連射速度アップ
    SPEED_UP: 'speed_up', // 移動速度アップ
    POWER_UP: 'power_up', // 攻撃力アップ
    HOMING: 'homing', // ホーミング弾
    SPREAD: 'spread', // 拡散弾
    PENETRATE: 'penetrate' // 貫通弾
};

// エフェクトタイプ
const EffectTypes = {
    EXPLOSION: 'explosion',
    SPARKLE: 'sparkle',
    TEXT: 'text'
};

// ボス設定
class Boss {
    constructor(round = 1, isSecondBoss = false) {
        this.round = round;
        this.isSecondBoss = isSecondBoss; // 3周目の2体目かどうか
        
        // 3周目の2体ボス戦の場合の位置調整
        if (round === 3 && isSecondBoss) {
            this.x = canvas.width * 3/4 - 60; // 右側に配置
        } else if (round === 3 && !isSecondBoss) {
            this.x = canvas.width * 1/4 - 60; // 左側に配置
        } else {
            this.x = canvas.width / 2 - 78; // 中央配置
        }
        this.y = 100;
        
        // 周回に応じてサイズを調整
        let sizeMultiplier = 1.3; // 基本サイズ（1周目）
        if (round === 2) {
            sizeMultiplier = 1.5; // 2周目は1.5倍
        } else if (round === 3) {
            sizeMultiplier = 1.4; // 3周目は2体なので少し小さめ
        } else if (round === 4) {
            sizeMultiplier = 2.2; // 4周目（激おこパイル）は最大サイズ
            this.x = canvas.width / 2 - 132; // より大きいので位置調整
        }
        
        this.width = 120 * sizeMultiplier;
        this.height = 120 * sizeMultiplier;
        
        // 周回に応じて体力を調整
        if (round === 3) {
            this.maxHealth = 60; // 3周目は2体なので個別体力は少なめ
        } else {
            this.maxHealth = 50 + (round - 1) * 35; // 1周目50、2周目85、4周目155
        }
        this.health = this.maxHealth;
        
        // 周回に応じて速度を調整
        this.speed = 1.2 + (round - 1) * 0.3; // 1周目1.2、2周目1.5、3周目1.8、4周目2.1
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
        
        // 周回に応じて攻撃間隔を調整
        this.attackInterval = Math.max(25, 50 - (round - 1) * 8); // より攻撃的に
        
        // ボスBGM開始（最初のボスのみ）
        if (!isSecondBoss) {
            try {
                sounds.bgm.pause();
                sounds.bossBattle.currentTime = 0;
                sounds.bossBattle.play();
            } catch (e) {
                console.log('ボスBGMの再生に失敗しました');
            }
        }
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
    if (Math.random() < 0.012) { // 1.2%の確率（新アイテム追加で少し上げる）
        // アイテムタイプの重み付け
        const itemPool = [
            ItemTypes.HEALTH, ItemTypes.HEALTH, ItemTypes.HEALTH, // 回復は多めに
            ItemTypes.TRIPLE_SHOT, ItemTypes.TRIPLE_SHOT,
            ItemTypes.LASER, ItemTypes.LASER,
            ItemTypes.SHIELD, ItemTypes.SHIELD,
            ItemTypes.RAPID_FIRE,
            ItemTypes.SPEED_UP,
            ItemTypes.POWER_UP,
            ItemTypes.HOMING,
            ItemTypes.SPREAD,
            ItemTypes.PENETRATE
        ];
        
        const randomType = itemPool[Math.floor(Math.random() * itemPool.length)];
        
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

// 弾丸発射（複数武器効果対応）
function shootBullet() {
    // 発射効果音
    try {
        sounds.shoot.currentTime = 0;
        sounds.shoot.volume = 0.3;
        sounds.shoot.play();
    } catch (e) {
        console.log('効果音の再生に失敗しました');
    }
    
    const baseSpeed = 8 * player.bulletSpeed;
    const baseDamage = 1 * player.bulletDamage;
    
    // 基本弾丸を発射
    let bulletsFired = [];
    
    // 通常弾またはシールド時
    if (player.activeWeapons.has('normal') || player.activeWeapons.has('shield')) {
        bulletsFired.push({
            x: player.x + player.width / 2 - 3,
            y: player.y,
            width: 6,
            height: 12,
            speed: baseSpeed,
            damage: baseDamage,
            type: 'normal',
            penetrate: player.activeWeapons.has('penetrate'),
            homing: player.activeWeapons.has('homing')
        });
    }
    
    // 3方向弾
    if (player.activeWeapons.has('triple')) {
        for (let i = -1; i <= 1; i++) {
            bulletsFired.push({
                x: player.x + player.width / 2 - 3,
                y: player.y,
                width: 6,
                height: 12,
                speed: baseSpeed,
                speedX: i * 2,
                speedY: baseSpeed,
                damage: baseDamage * 0.8, // 3方向弾は少し威力を下げる
                type: 'triple',
                penetrate: player.activeWeapons.has('penetrate'),
                homing: player.activeWeapons.has('homing')
            });
        }
    }
    
    // レーザー
    if (player.activeWeapons.has('laser')) {
        bulletsFired.push({
            x: player.x + player.width / 2 - 6,
            y: player.y,
            width: 12,
            height: 25,
            speed: baseSpeed * 1.2,
            damage: baseDamage * 2,
            type: 'laser',
            penetrate: true, // レーザーは常に貫通
            homing: false
        });
    }
    
    // 拡散弾
    if (player.activeWeapons.has('spread')) {
        for (let i = 0; i < 5; i++) {
            const angle = (i - 2) * 0.3; // -0.6 to 0.6 radians
            bulletsFired.push({
                x: player.x + player.width / 2 - 2,
                y: player.y,
                width: 4,
                height: 8,
                speed: baseSpeed * 0.9,
                speedX: Math.sin(angle) * baseSpeed * 0.9,
                speedY: Math.cos(angle) * baseSpeed * 0.9,
                damage: baseDamage * 0.6,
                type: 'spread',
                penetrate: player.activeWeapons.has('penetrate'),
                homing: false
            });
        }
    }
    
    // 弾丸を配列に追加
    bullets.push(...bulletsFired);
    
    // 発射エフェクト
    createEffect(EffectTypes.SPARKLE, player.x + player.width / 2, player.y, {
        size: 15,
        color: '#FFFF00',
        timer: 10
    });
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
    if (player.activeWeapons.has('shield')) {
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
                
            } else if (item.type === ItemTypes.LASER) {
                // レーザー（黄色い四角）
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height);
                
            } else if (item.type === ItemTypes.SHIELD) {
                // シールド（青い盾）
                ctx.fillStyle = '#1E90FF';
                ctx.beginPath();
                ctx.arc(0, 0, item.width / 2, 0, Math.PI * 2);
                ctx.fill();
                
            } else if (item.type === ItemTypes.RAPID_FIRE) {
                // 連射（オレンジの矢印）
                ctx.fillStyle = '#FF4500';
                ctx.beginPath();
                ctx.moveTo(0, -item.height / 2);
                ctx.lineTo(-item.width / 3, 0);
                ctx.lineTo(item.width / 3, 0);
                ctx.closePath();
                ctx.fill();
                
            } else if (item.type === ItemTypes.SPEED_UP) {
                // スピードアップ（緑の稲妻）
                ctx.fillStyle = '#00FF00';
                ctx.beginPath();
                ctx.moveTo(-item.width / 4, -item.height / 2);
                ctx.lineTo(item.width / 4, -item.height / 4);
                ctx.lineTo(-item.width / 8, 0);
                ctx.lineTo(item.width / 4, item.height / 2);
                ctx.lineTo(-item.width / 4, item.height / 4);
                ctx.lineTo(item.width / 8, 0);
                ctx.closePath();
                ctx.fill();
                
            } else if (item.type === ItemTypes.POWER_UP) {
                // パワーアップ（赤い星）
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5;
                    const x = Math.cos(angle) * item.width / 3;
                    const y = Math.sin(angle) * item.height / 3;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                
            } else if (item.type === ItemTypes.HOMING) {
                // ホーミング（ピンクの円）
                ctx.fillStyle = '#FF69B4';
                ctx.beginPath();
                ctx.arc(0, 0, item.width / 2, 0, Math.PI * 2);
                ctx.fill();
                
            } else if (item.type === ItemTypes.SPREAD) {
                // 拡散（紫の扇形）
                ctx.fillStyle = '#9370DB';
                ctx.beginPath();
                ctx.arc(0, 0, item.width / 2, -Math.PI / 3, Math.PI / 3);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();
                
            } else if (item.type === ItemTypes.PENETRATE) {
                // 貫通（金色の矢）
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.moveTo(0, -item.height / 2);
                ctx.lineTo(-item.width / 4, -item.height / 4);
                ctx.lineTo(-item.width / 6, -item.height / 4);
                ctx.lineTo(-item.width / 6, item.height / 2);
                ctx.lineTo(item.width / 6, item.height / 2);
                ctx.lineTo(item.width / 6, -item.height / 4);
                ctx.lineTo(item.width / 4, -item.height / 4);
                ctx.closePath();
                ctx.fill();
            }
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
    // 弾丸と敵の衝突（貫通機能対応）
    for (let i = bullets.length - 1; i >= 0; i--) {
        let bulletRemoved = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i] && enemies[j] && enemies[j].type !== 'bossBullet' &&
                bullets[i].x < enemies[j].x + enemies[j].width &&
                bullets[i].x + bullets[i].width > enemies[j].x &&
                bullets[i].y < enemies[j].y + enemies[j].height &&
                bullets[i].y + bullets[i].height > enemies[j].y) {
                
                // ダメージを適用
                const damage = bullets[i].damage || 1;
                
                // 敵のヘルスを減らす
                if (enemies[j].health) {
                    enemies[j].health -= damage;
                    
                    // ダメージエフェクト
                    createEffect(EffectTypes.SPARKLE, 
                        enemies[j].x + enemies[j].width / 2, 
                        enemies[j].y + enemies[j].height / 2,
                        { size: 15, timer: 10 }
                    );
                    
                    // 敵がまだ生きている場合
                    if (enemies[j].health > 0) {
                        // 貫通弾でない場合は弾を削除
                        if (!bullets[i].penetrate) {
                            bullets.splice(i, 1);
                            bulletRemoved = true;
                            break;
                        }
                        continue; // 貫通弾の場合は次の敵をチェック
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
                
                // 敵を削除
                enemies.splice(j, 1);
                
                // 貫通弾でない場合は弾も削除
                if (!bullets[i].penetrate) {
                    bullets.splice(i, 1);
                    bulletRemoved = true;
                    break;
                }
                
                // スコア加算
                score += 10;
                updateScore();
                
                // スコアエフェクト
                createEffect(EffectTypes.TEXT, 
                    enemies[j] ? enemies[j].x + enemies[j].width / 2 : canvas.width / 2, 
                    enemies[j] ? enemies[j].y : canvas.height / 2,
                    { text: "+10", color: '#FFFF00', timer: 30 }
                );
                
                // アイテムドロップ判定
                spawnItem();
            }
        }
        
        // 弾丸が削除されていたらループを抜ける
        if (bulletRemoved) break;
    }
            }
        }
    }
    
    // 弾丸とボスの衝突（2体ボス対応）
    const bosses = [boss, secondBoss].filter(b => b !== null);
    
    for (const currentBoss of bosses) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i] &&
                bullets[i].x < currentBoss.x + currentBoss.width &&
                bullets[i].x + bullets[i].width > currentBoss.x &&
                bullets[i].y < currentBoss.y + currentBoss.height &&
                bullets[i].y + bullets[i].height > currentBoss.y) {
                
                // ダメージを適用
                const damage = bullets[i].damage || 1;
                
                // ダメージを与える
                for (let d = 0; d < damage; d++) {
                    currentBoss.takeDamage();
                }
                
                // 貫通弾でない場合は弾を削除
                if (!bullets[i].penetrate) {
                    bullets.splice(i, 1);
                    break;
                }
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
                if (player.activeWeapons.has('shield')) {
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

// アイテム効果の適用（複数効果同時対応）
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
            player.activeWeapons.add('triple');
            player.weaponTimers['triple'] = 600; // 60fps × 10秒
            
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "3WAY攻撃!", color: '#4169E1', timer: 45 }
            );
            break;
            
        case ItemTypes.LASER:
            // レーザー攻撃（8秒間）
            player.activeWeapons.add('laser');
            player.weaponTimers['laser'] = 480; // 60fps × 8秒
            
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "レーザー!", color: '#FFD700', timer: 45 }
            );
            break;
            
        case ItemTypes.SHIELD:
            // シールド（12秒間）
            player.activeWeapons.add('shield');
            player.weaponTimers['shield'] = 720; // 60fps × 12秒
            
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "シールド!", color: '#1E90FF', timer: 45 }
            );
            break;
            
        case ItemTypes.RAPID_FIRE:
            // 連射速度アップ（15秒間）
            player.fireRate = Math.min(player.fireRate + 0.5, 3.0); // 最大3倍まで
            player.weaponTimers['rapid_fire'] = 900; // 60fps × 15秒
            
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "連射アップ!", color: '#FF4500', timer: 45 }
            );
            break;
            
        case ItemTypes.SPEED_UP:
            // 移動速度アップ（20秒間）
            player.moveSpeed = Math.min(player.moveSpeed + 0.3, 2.0); // 最大2倍まで
            player.weaponTimers['speed_up'] = 1200; // 60fps × 20秒
            
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "スピードアップ!", color: '#00FF00', timer: 45 }
            );
            break;
            
        case ItemTypes.POWER_UP:
            // 攻撃力アップ（25秒間）
            player.bulletDamage = Math.min(player.bulletDamage + 0.5, 3.0); // 最大3倍まで
            player.weaponTimers['power_up'] = 1500; // 60fps × 25秒
            
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "パワーアップ!", color: '#FF0000', timer: 45 }
            );
            break;
            
        case ItemTypes.HOMING:
            // ホーミング弾（12秒間）
            player.activeWeapons.add('homing');
            player.weaponTimers['homing'] = 720; // 60fps × 12秒
            
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "ホーミング弾!", color: '#FF69B4', timer: 45 }
            );
            break;
            
        case ItemTypes.SPREAD:
            // 拡散弾（10秒間）
            player.activeWeapons.add('spread');
            player.weaponTimers['spread'] = 600; // 60fps × 10秒
            
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "拡散弾!", color: '#9370DB', timer: 45 }
            );
            break;
            
        case ItemTypes.PENETRATE:
            // 貫通弾（15秒間）
            player.activeWeapons.add('penetrate');
            player.weaponTimers['penetrate'] = 900; // 60fps × 15秒
            
            createEffect(EffectTypes.TEXT, 
                player.x + player.width / 2, 
                player.y - 20,
                { text: "貫通弾!", color: '#FFD700', timer: 45 }
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
    
    // 自動発射（連射速度を考慮）
    player.autoShootTimer++;
    const fireInterval = Math.max(8, Math.floor(18 / player.fireRate)); // 連射速度に応じて調整
    if (player.autoShootTimer > fireInterval) {
        shootBullet();
        player.autoShootTimer = 0;
    }
    
    // 武器効果の時間制限（複数効果対応）
    for (const [weaponType, timer] of Object.entries(player.weaponTimers)) {
        if (timer > 0) {
            player.weaponTimers[weaponType]--;
            if (player.weaponTimers[weaponType] <= 0) {
                // 武器効果終了
                player.activeWeapons.delete(weaponType);
                delete player.weaponTimers[weaponType];
                
                // 能力値をリセット（段階的に）
                if (weaponType === 'rapid_fire') {
                    player.fireRate = Math.max(1.0, player.fireRate - 0.5);
                } else if (weaponType === 'speed_up') {
                    player.moveSpeed = Math.max(1.0, player.moveSpeed - 0.3);
                } else if (weaponType === 'power_up') {
                    player.bulletDamage = Math.max(1.0, player.bulletDamage - 0.5);
                }
                
                // 効果終了エフェクト
                createEffect(EffectTypes.TEXT, 
                    player.x + player.width / 2, 
                    player.y - 20,
                    { text: `${weaponType}効果終了`, color: '#FFFFFF', timer: 30 }
                );
            }
        }
    }
    
    // normalが削除されていたら追加し直す
    if (player.activeWeapons.size === 0) {
        player.activeWeapons.add('normal');
    }
    
    // プレイヤー移動（左右のみ、スマホ対応、移動速度倍率適用）
    const actualSpeed = player.speed * player.moveSpeed;
    if ((keys['ArrowLeft'] || mobileControls.left) && player.x > 0) {
        player.x -= actualSpeed;
    }
    if ((keys['ArrowRight'] || mobileControls.right) && player.x < canvas.width - player.width) {
        player.x += actualSpeed;
    }
    
    // 弾丸更新（ホーミング機能対応）
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // ホーミング機能
        if (bullet.homing && enemies.length > 0) {
            // 最も近い敵を見つける
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            for (const enemy of enemies) {
                if (enemy.type !== 'bossBullet') { // ボスの弾は除外
                    const dx = enemy.x + enemy.width / 2 - (bullet.x + bullet.width / 2);
                    const dy = enemy.y + enemy.height / 2 - (bullet.y + bullet.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                    }
                }
            }
            
            // 最も近い敵に向かって移動
            if (closestEnemy && closestDistance < 200) { // 200ピクセル以内の敵を追尾
                const dx = closestEnemy.x + closestEnemy.width / 2 - (bullet.x + bullet.width / 2);
                const dy = closestEnemy.y + closestEnemy.height / 2 - (bullet.y + bullet.height / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    const homingStrength = 0.3; // ホーミングの強さ
                    bullet.speedX = (bullet.speedX || 0) + (dx / distance) * homingStrength;
                    bullet.speedY = (bullet.speedY || bullet.speed) + (dy / distance) * homingStrength;
                    
                    // 速度を制限
                    const maxSpeed = bullet.speed * 1.5;
                    const currentSpeed = Math.sqrt(bullet.speedX * bullet.speedX + bullet.speedY * bullet.speedY);
                    if (currentSpeed > maxSpeed) {
                        bullet.speedX = (bullet.speedX / currentSpeed) * maxSpeed;
                        bullet.speedY = (bullet.speedY / currentSpeed) * maxSpeed;
                    }
                }
            }
        }
        
        // 弾丸の移動
        if (bullet.type === 'triple' && bullet.speedX !== undefined) {
            // 3方向弾の動き
            bullet.x += bullet.speedX;
            bullet.y -= bullet.speedY;
        } else if (bullet.speedX !== undefined && bullet.speedY !== undefined) {
            // ホーミング弾や拡散弾の動き
            bullet.x += bullet.speedX;
            bullet.y -= bullet.speedY;
        } else {
            // 通常弾とレーザーの動き
            bullet.y -= bullet.speed;
        }
        
        // 画面外の弾丸を削除
        if (bullet.y < -10 || bullet.x < -50 || bullet.x > canvas.width + 50) {
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
        if (currentRound === 3) {
            // 3周目は2体のボスを同時出現
            boss = new Boss(currentRound, false); // 1体目
            secondBoss = new Boss(currentRound, true); // 2体目
        } else {
            boss = new Boss(currentRound);
        }
        bossMode = true;
        
        // ボス出現エフェクト
        let bossText = "";
        if (currentRound === 1) {
            bossText = "パイル出現！";
        } else if (currentRound === 2) {
            bossText = "強化パイル出現！";
        } else if (currentRound === 3) {
            bossText = "強化パイル2体が現れた！";
        } else if (currentRound === 4) {
            bossText = "激おこパイルが現れた！";
        }
        
        createEffect(EffectTypes.TEXT, 
            canvas.width / 2, 
            canvas.height / 2,
            { text: bossText, color: '#FF0000', size: 40, timer: 120 }
        );
        
        console.log(`Boss appeared in round ${currentRound} at score ${score}`);
    }
    
    // ボス更新（2体ボス対応）
    if (!bossDefeated) {
        if (boss) {
            boss.update();
        }
        if (secondBoss) {
            secondBoss.update();
        }
        
        // 3周目の場合、両方のボスが倒されたかチェック
        if (currentRound === 3) {
            if ((!boss || boss.health <= 0) && (!secondBoss || secondBoss.health <= 0)) {
                bossDefeated = true;
                boss = null;
                secondBoss = null;
            }
        } else {
            // 通常の周回では1体のボスのみ
            if (boss && boss.health <= 0) {
                bossDefeated = true;
                boss = null;
            }
        }
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
            
            if (!bossDefeated) {
                if (boss) {
                    boss.draw();
                }
                if (secondBoss) {
                    secondBoss.draw();
                }
            }
            
            // 現在の周回表示
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '18px Comic Sans MS';
            ctx.fillText(`${currentRound}周目`, canvas.width - 100, 40);
            
            // ヘルス表示
            ctx.fillStyle = '#FF69B4';
            ctx.font = '20px Comic Sans MS';
            ctx.fillText(`❤️ × ${player.health}/${player.maxHealth}`, 20, 40);
            
            // 武器状態表示（複数効果対応）
            if (player.activeWeapons.size > 1 || !player.activeWeapons.has('normal')) {
                ctx.fillStyle = '#FFD700';
                ctx.font = '14px Comic Sans MS';
                let yOffset = 65;
                
                // アクティブな武器効果を表示
                for (const [weaponType, timer] of Object.entries(player.weaponTimers)) {
                    if (timer > 0) {
                        const timeLeft = Math.ceil(timer / 60);
                        let weaponText = '';
                        
                        switch(weaponType) {
                            case 'triple': weaponText = `🔱 3WAY: ${timeLeft}s`; break;
                            case 'laser': weaponText = `⚡ LASER: ${timeLeft}s`; break;
                            case 'shield': weaponText = `🛡️ SHIELD: ${timeLeft}s`; break;
                            case 'rapid_fire': weaponText = `🔥 RAPID: ${timeLeft}s`; break;
                            case 'speed_up': weaponText = `💨 SPEED: ${timeLeft}s`; break;
                            case 'power_up': weaponText = `💪 POWER: ${timeLeft}s`; break;
                            case 'homing': weaponText = `🎯 HOMING: ${timeLeft}s`; break;
                            case 'spread': weaponText = `🌟 SPREAD: ${timeLeft}s`; break;
                            case 'penetrate': weaponText = `⚡ PIERCE: ${timeLeft}s`; break;
                        }
                        
                        if (weaponText) {
                            ctx.fillText(weaponText, 20, yOffset);
                            yOffset += 18;
                        }
                    }
                }
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
                    warningText = '強化パイル2体出現まで...';
                } else if (currentRound === 4) {
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
    secondBoss = null;
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
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 80;
    player.health = 3;
    player.activeWeapons = new Set(['normal']);
    player.weaponTimers = {};
    player.fireRate = 1.0;
    player.moveSpeed = 1.0;
    player.bulletDamage = 1.0;
    player.bulletSpeed = 1.0;
    player.invincible = false;
    player.invincibleTimer = 0;
    player.autoShootTimer = 0; // 自動発射タイマーをリセット
    enemies = [];
    bullets = [];
    items = [];
    effects = [];
    boss = null;
    secondBoss = null;
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
        
        // プレイヤーの位置を正しく設定
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - 80;
        
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
