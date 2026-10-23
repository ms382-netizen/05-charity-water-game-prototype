// ===== Game settings =====
const GOAL = 20;            // points needed to win
const GAME_TIME = 30;       // seconds
const CLEAN_POINTS = 1;     // points for a clean drop
const DIRTY_PENALTY = 2;    // points lost for a dirty drop
const DIRTY_CHANCE = 0.25;  // 25% of drops are dirty
const SPAWN_EVERY = 700;    // ms between new drops

// ===== Grab elements from the page =====
const gameContainer = document.getElementById('game-container');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const timeStat = document.getElementById('time-stat');
const progressFill = document.getElementById('progress-fill');
const progressBar = document.querySelector('.progress');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const confettiCanvas = document.getElementById('confetti');

document.getElementById('goal').textContent = GOAL;

// ===== Game state =====
let score = 0;
let timeLeft = GAME_TIME;
let gameRunning = false;
let spawnTimer = null;
let countdownTimer = null;
let reachedMilestones = [];
let confettiFrame = null;

// ===== Feedback messages =====
const cleanMessages = ['Clean water collected!', 'Nice catch!', 'Every drop counts!', 'Keep it flowing!', 'Great tap!'];
const dirtyMessages = ['Oops, dirty water! −2', 'Contaminated! Watch out.', 'Avoid the dirty drops!'];
const milestones = [
  { score: 5, text: '💧 5 points! The jerry can is filling up!' },
  { score: 10, text: '💧 Halfway there! Keep going!' },
  { score: 15, text: '💧 Almost full! Just 5 more!' }
];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = 'message ' + type;
}

function updateScore() {
  scoreEl.textContent = score;
  const percent = Math.min(score / GOAL, 1) * 100;
  progressFill.style.width = percent + '%';
  progressBar.setAttribute('aria-valuenow', Math.round(percent));
}

// ===== Start the game =====
function startGame() {
  if (gameRunning) return;
  resetState();
  gameRunning = true;
  overlay.classList.add('hidden');
  startBtn.disabled = true;
  showMessage('Go! Tap the clean drops!', 'good');

  createDrop();
  spawnTimer = setInterval(createDrop, SPAWN_EVERY);
  countdownTimer = setInterval(tick, 1000);
}

// Runs once per second
function tick() {
  timeLeft--;
  timeEl.textContent = timeLeft;
  if (timeLeft <= 5) timeStat.classList.add('warning');
  if (timeLeft <= 0) endGame(false);
}

// ===== Make a falling drop =====
function createDrop() {
  const isDirty = Math.random() < DIRTY_CHANCE;

  const drop = document.createElement('div');
  drop.className = 'drop ' + (isDirty ? 'dirty' : 'clean');
  drop.innerHTML = '<div class="drop-shape"></div>';

  // Size scales with the game area so it works on phones and desktops
  const areaWidth = gameContainer.clientWidth;
  const size = Math.max(48, Math.min(70, areaWidth * 0.13));
  drop.style.width = size + 'px';
  drop.style.height = size + 'px';
  drop.style.left = Math.random() * (areaWidth - size) + 'px';

  // Drops fall faster as time runs out (between ~4s and ~2s)
  const elapsed = GAME_TIME - timeLeft;
  const fallTime = Math.max(2, 4 - elapsed * 0.06) + Math.random() * 0.6;
  drop.style.animationDuration = fallTime + 's';

  drop.addEventListener('pointerdown', function (event) {
    event.preventDefault();
    catchDrop(drop, isDirty);
  });

  // If it reaches the ground without being tapped, remove it
  drop.addEventListener('animationend', function () {
    drop.remove();
  });

  gameContainer.appendChild(drop);
}

// ===== Player taps a drop =====
function catchDrop(drop, isDirty) {
  if (!gameRunning || drop.classList.contains('caught')) return;
  drop.classList.add('caught');

  if (isDirty) {
    score = Math.max(0, score - DIRTY_PENALTY);
    showMessage(randomItem(dirtyMessages), 'bad');
    showPopup(drop, '−' + DIRTY_PENALTY, 'bad');
    gameContainer.classList.remove('hit-bad');
    void gameContainer.offsetWidth; // restart the shake animation
    gameContainer.classList.add('hit-bad');
  } else {
    score += CLEAN_POINTS;
    showMessage(randomItem(cleanMessages), 'good');
    showPopup(drop, '+' + CLEAN_POINTS, 'good');
    checkMilestones();
  }

  updateScore();
  setTimeout(function () { drop.remove(); }, 200);

  if (score >= GOAL) endGame(true);
}

function checkMilestones() {
  milestones.forEach(function (m) {
    if (score >= m.score && !reachedMilestones.includes(m.score)) {
      reachedMilestones.push(m.score);
      showMessage(m.text, 'milestone');
    }
  });
}

// Floating "+1" / "−2" where the drop was tapped
function showPopup(drop, text, type) {
  const dropBox = drop.getBoundingClientRect();
  const areaBox = gameContainer.getBoundingClientRect();
  const popup = document.createElement('span');
  popup.className = 'popup ' + type;
  popup.textContent = text;
  popup.style.left = (dropBox.left - areaBox.left + dropBox.width / 2 - 12) + 'px';
  popup.style.top = (dropBox.top - areaBox.top) + 'px';
  gameContainer.appendChild(popup);
  setTimeout(function () { popup.remove(); }, 700);
}

// ===== End of game =====
function endGame(won) {
  stopTimers();
  gameRunning = false;
  clearDrops();
  startBtn.disabled = false;
  startBtn.textContent = 'Play Again';
  overlay.classList.remove('hidden');

  if (won) {
    overlayTitle.textContent = '🎉 You filled the jerry can!';
    overlayText.textContent = 'You collected ' + score + ' points with ' + timeLeft + ' seconds to spare. Clean water changes everything.';
    showMessage('You win! Clean water delivered! 🎉', 'good');
    launchConfetti();
  } else {
    overlayTitle.textContent = "Time's up!";
    overlayText.textContent = 'You got ' + score + ' of ' + GOAL + ' points. Try again and keep the water clean!';
    showMessage('So close! Press Play Again to try again.', 'bad');
  }
}

// ===== Reset button =====
function resetGame() {
  stopTimers();
  gameRunning = false;
  resetState();
  stopConfetti();
  startBtn.disabled = false;
  startBtn.textContent = 'Start';
  overlayTitle.textContent = 'Ready to bring clean water?';
  overlayText.textContent = 'Tap clean drops before they hit the ground. Reach ' + GOAL + ' points in ' + GAME_TIME + ' seconds to win!';
  overlay.classList.remove('hidden');
  showMessage('Game reset. Press Start to play!', '');
}

function resetState() {
  score = 0;
  timeLeft = GAME_TIME;
  reachedMilestones = [];
  timeEl.textContent = timeLeft;
  timeStat.classList.remove('warning');
  clearDrops();
  updateScore();
}

function stopTimers() {
  clearInterval(spawnTimer);
  clearInterval(countdownTimer);
  timeStat.classList.remove('warning');
}

function clearDrops() {
  gameContainer.querySelectorAll('.drop, .popup').forEach(function (el) { el.remove(); });
}

// ===== Confetti celebration =====
function launchConfetti() {
  const ctx = confettiCanvas.getContext('2d');
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  const colors = ['#FFC907', '#2E9DF7', '#8BD1CB', '#4FCB53', '#FF902A', '#F5402C'];

  const pieces = [];
  for (let i = 0; i < 160; i++) {
    pieces.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * -confettiCanvas.height,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: randomItem(colors),
      speedY: 3 + Math.random() * 4,
      speedX: -1.5 + Math.random() * 3,
      angle: Math.random() * 360,
      spin: -6 + Math.random() * 12
    });
  }

  const startTime = performance.now();
  cancelAnimationFrame(confettiFrame);

  function draw(now) {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    pieces.forEach(function (p) {
      p.x += p.speedX;
      p.y += p.speedY;
      p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (now - startTime < 4000) {
      confettiFrame = requestAnimationFrame(draw);
    } else {
      stopConfetti();
    }
  }
  confettiFrame = requestAnimationFrame(draw);
}

function stopConfetti() {
  cancelAnimationFrame(confettiFrame);
  const ctx = confettiCanvas.getContext('2d');
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

// ===== Buttons =====
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);