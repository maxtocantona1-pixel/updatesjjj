


function openEditMode() {
  const modal = document.createElement('div');
  modal.className = 'edit-modal';
  modal.innerHTML = `
    <div class="edit-form">
  <h2 style="color:red;">Warning</h2>
  <p>
  if you need to remove player image background dawnload <a href="https://play.google.com/store/apps/details?id=photoeditor.cutout.backgrounderaser" target="_blank">Background Erazer</a> to Remove image background.
</p>
  <p>
  Player image maximum size is 1MB. 
  Visit <a href="https://tinypng.com" target="_blank">TinyPNG</a> to compress images smaller.
</p>
      <h2>Add/Edit Players</h2>
      <div class="form-group">
        <label for="playerName">Name:</label>
        <input type="text" id="playerName" placeholder="Player name">
      </div>
      <div class="form-group">
        <label for="playerPosition">Position:</label>
        <select id="playerPosition">
          <option value="CB">CB</option>
          <option value="LB">LB</option>
          <option value="RB">RB</option>
          <option value="DMF">DMF</option>
          <option value="CMF">CMF</option>
          <option value="RMF">RMF</option>
          <option value="LMF">LMF</option>
          <option value="AMF">AMF</option>
          <option value="RWF">RWF</option>
          <option value="LWF">LWF</option>
          <option value="CF">CF</option>
          <option value="GK">GK</option>
        </select>
      </div>
      <div class="form-group">
        <label for="playerOverall">Overall Rating:</label>
        <input type="number" id="playerOverall" min="1" max="110" value="80">
      </div>
      <div class="form-group">
        <label for="playerTeam">Team:</label>
        <select id="playerTeam">
          <option value="">Select Team</option>
          ${availableTeams.map(team => 
            `<option value="${team.logo}">${team.name}</option>`
          ).join('')}
        </select>
        <div class="team-preview" id="teamPreview" style="margin-top: 10px;"></div>
      </div>
      <div class="form-group">
        <label>Player Photo:</label>
        <div class="image-upload-container">
          <div class="upload-options">
            <label class="upload-btn">
              <input type="file" id="playerPhotoUpload" accept="image/*" onchange="handleImageUpload(this, 'playerPhotoPreview')" style="display: none;">
              📁 Upload from Device
            </label>
            <div style="margin: 10px 0; text-align: center; font-weight: bold;">OR</div>
            <input type="text" id="playerPhotoUrl" placeholder="Enter image filename (e.g., ronaldo.jpg)" style="width: 100%; padding: 8px; margin-bottom: 10px;">
            <small>Use simple filenames like: ronaldo.jpg, messi.jpg, unin.jpg</small>
          </div>
          <div class="image-preview" id="playerPhotoPreview">
            <span>No image selected</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Skills:</label>
        <div class="skills-selection">
          <select id="playerSkillSelect" multiple style="width: 100%; height: 100px;">
            ${availableSkills.map(skill => 
              `<option value="${skill}">${skill}</option>`
            ).join('')}
          </select>
          <small>Hold Ctrl/Cmd to select multiple skills</small>
        </div>
        <div class="selected-skills" id="selectedSkills" style="margin-top: 10px;"></div>
      </div>
      <div class="form-buttons">
        <button onclick="savePlayer()">Save Player</button>
        <button onclick="closeEditMode()">Close</button>
        <button onclick="exportPlayers()" style="background: #2196F3;">Export Players</button>
        <button onclick="importPlayers()" style="background: #FF9800;">Import Players</button>
      </div>
      <div class="player-list" id="playerList"></div>
    </div>
  `;
  
  document.body.appendChild(modal);
  renderPlayerList();
  
  // Add team preview
  const teamSelect = document.getElementById('playerTeam');
  const teamPreview = document.getElementById('teamPreview');
  
  teamSelect.addEventListener('change', function() {
    const selectedLogo = this.value;
    if (selectedLogo) {
      teamPreview.innerHTML = `<img src="${selectedLogo}" alt="Team Logo" style="height: 30px;">`;
    } else {
      teamPreview.innerHTML = '';
    }
  });
  
  // Add skills selection
  const skillSelect = document.getElementById('playerSkillSelect');
  const selectedSkillsDiv = document.getElementById('selectedSkills');
  
  skillSelect.addEventListener('change', function() {
    const selected = Array.from(this.selectedOptions).map(opt => opt.value);
    selectedSkillsDiv.innerHTML = selected.map(skill => 
      `<div class="skill-tag">${skill} <button type="button" onclick="removeSkill('${skill}')">×</button></div>`
    ).join('');
  });
}

// Handle image upload from mobile device
function handleImageUpload(input, previewId) {
  const file = input.files[0];
  const preview = document.getElementById(previewId);
  
  if (file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      // Store the base64 image in localStorage
      const imageKey = 'localStorageImage_' + Date.now() + '_' + file.name;
      storeImageInLocalStorage(imageKey, e.target.result);
      
      // Show preview
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 150px;">`;
      
      // Also set the filename in the URL input for reference
      document.getElementById('playerPhotoUrl').value = imageKey;
      
      console.log("Image uploaded and stored with key:", imageKey);
    };
    
    reader.onerror = function(error) {
      console.error("Error reading file:", error);
      Swal.fire('Error', 'Failed to read the image file', 'error');
    };
    
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '<span>No image selected</span>';
  }
}

function removeSkill(skill) {
  const skillSelect = document.getElementById('playerSkillSelect');
  const options = Array.from(skillSelect.options);
  const optionToDeselect = options.find(opt => opt.value === skill);
  if (optionToDeselect) {
    optionToDeselect.selected = false;
  }
  // Trigger change event to update display
  const event = new Event('change');
  skillSelect.dispatchEvent(event);
}

function closeEditMode() {
  const modal = document.querySelector('.edit-modal');
  if (modal) {
    document.body.removeChild(modal);
  }
}

function renderPlayerList() {
  const playerList = document.getElementById('playerList');
  if (!playerList) return;
  
  playerList.innerHTML = '<h3>Existing Players:</h3>';
  
  mainPlayers.forEach((player, index) => {
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item';
    
    // Find team name
    const team = availableTeams.find(t => t.logo === player.team) || { name: 'Unknown' };
    
    playerItem.innerHTML = `
      <div class="player-info">
        <strong>${player.name}</strong> (${player.position}) - ${player.overall}
        <br>
        <small>Team: ${team.name} | Skills: ${player.skills?.join(', ') || 'None'}</small>
      </div>
      <div class="actions">
        <button onclick="editPlayer(${index})">Edit</button>
        <button onclick="deletePlayer(${index})">Delete</button>
      </div>
    `;
    playerList.appendChild(playerItem);
  });
}

function getSelectedSkills() {
  const skillSelect = document.getElementById('playerSkillSelect');
  return Array.from(skillSelect.selectedOptions).map(opt => opt.value);
}

function savePlayer() {
  const name = document.getElementById('playerName').value;
  const position = document.getElementById('playerPosition').value;
  const overall = parseInt(document.getElementById('playerOverall').value);
  const team = document.getElementById('playerTeam').value;
  const photoUrl = document.getElementById('playerPhotoUrl').value;
  const skills = getSelectedSkills();
  
  if (!name || !position || !overall) {
    alert('Please fill in all required fields');
    return;
  }
  if(overall > 110) {
  alert("This overal is not impossible");
  return;
  }
  // Fix photo path - handle both uploaded images and simple filenames
  let finalPhoto = "unin.jpg";
  if (photoUrl) {
    if (photoUrl.startsWith('localStorageImage_')) {
      // This is an uploaded image stored in localStorage
      finalPhoto = photoUrl;
    } else {
      // This is a simple filename
      finalPhoto = fixImagePath(photoUrl);
    }
  }
  
  const fixedTeam = fixImagePath(team) || "unknown.png";
  
  const newPlayer = {
    name,
    position,
    overall,
    photo: finalPhoto,
    bg: 'epic.jpg',
    skills,
    team: fixedTeam
  };
  
  // Check if we're editing an existing player
  const editingIndex = mainPlayers.findIndex(p => p.name === name);
  
  if (editingIndex >= 0) {
    mainPlayers[editingIndex] = newPlayer;
  } else {
    mainPlayers.push(newPlayer);
  }
  
  // Save to localStorage
  localStorage.setItem('customPlayers', JSON.stringify(mainPlayers));
  alert("Player Created successfully!");
  
  
    
    // Reset form
    document.getElementById('playerName').value = '';
    document.getElementById('playerOverall').value = '80';
    document.getElementById('playerPhotoUrl').value = '';
    document.getElementById('playerPhotoUpload').value = '';
    document.getElementById('playerTeam').value = '';
    document.getElementById('playerSkillSelect').selectedIndex = -1;
    document.getElementById('selectedSkills').innerHTML = '';
    document.getElementById('teamPreview').innerHTML = '';
    document.getElementById('playerPhotoPreview').innerHTML = '<span>No image selected</span>';
  location.reload();
  
}

function editPlayer(index) {
  const player = mainPlayers[index];
  
  document.getElementById('playerName').value = player.name;
  document.getElementById('playerPosition').value = player.position;
  document.getElementById('playerOverall').value = player.overall;
  document.getElementById('playerTeam').value = player.team || '';
  
  // Handle photo - check if it's stored in localStorage or a simple filename
  if (player.photo && player.photo.startsWith('localStorageImage_')) {
    const storedImage = getImageFromLocalStorage(player.photo);
    document.getElementById('playerPhotoUrl').value = player.photo;
    document.getElementById('playerPhotoPreview').innerHTML = `<img src="${storedImage}" alt="Preview" style="max-width: 200px; max-height: 150px;">`;
  } else {
    document.getElementById('playerPhotoUrl').value = player.photo || '';
    if (player.photo && player.photo !== 'unin.jpg') {
      document.getElementById('playerPhotoPreview').innerHTML = `<img src="${player.photo}" alt="Preview" style="max-width: 200px; max-height: 150px;" onerror="this.style.display='none'">`;
    } else {
      document.getElementById('playerPhotoPreview').innerHTML = '<span>No image selected</span>';
    }
  }
  
  // Set team preview
  const teamPreview = document.getElementById('teamPreview');
  if (player.team) {
    teamPreview.innerHTML = `<img src="${player.team}" alt="Team Logo" style="height: 30px;">`;
  }
  
  // Set skills
  const skillSelect = document.getElementById('playerSkillSelect');
  Array.from(skillSelect.options).forEach(option => {
    option.selected = player.skills?.includes(option.value) || false;
  });
  
  // Trigger change to update selected skills display
  const event = new Event('change');
  skillSelect.dispatchEvent(event);
}

function deletePlayer(index) {
    
     let confirms2 = confirm('Are you sure you want to delete this player?');
    
  
    if (confirms2) {
      mainPlayers.splice(index, 1);
      localStorage.setItem('customPlayers', JSON.stringify(mainPlayers));
      renderPlayerList();
      alert( 'Player has been deleted.');
    }
}

// Export/Import functionality
function exportPlayers() {
  const dataStr = JSON.stringify(mainPlayers, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = 'efootball_players.json';
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function importPlayers() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
      try {
        const importedPlayers = JSON.parse(event.target.result);
        if (Array.isArray(importedPlayers)) {
          mainPlayers = importedPlayers;
          localStorage.setItem('customPlayers', JSON.stringify(mainPlayers));
          alert( 'Players imported successfully!').then(() => {
            location.reload();
          });
        } else {
          alert('Invalid player data format');
        }
      } catch (error) {
        alert( 'Failed to import players: ' + error.message, );
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

// Check if we need to show results (for results.html)
if (window.location.pathname.endsWith("results.html") || sessionStorage.getItem("newObtained")) {
  showResults();
}

function showResults() {
  document.body.innerHTML = `
    <div class="results-container">
      <div class="results-header">
        <h1>🎮 eFootball Pull Results</h1>
        <div class="mode-indicator">Mode: ${currentMode.toUpperCase()}</div>
      </div>
      <div class="new-cards-section">
        <h2>New Players</h2>
        <div class="results-grid" id="new-cards"></div>
      </div>
      <div class="all-cards-section">
        <h2>My Collection (${JSON.parse(localStorage.getItem("obtained") || "[]").length} players)</h2>
        <div class="results-grid" id="all-cards"></div>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <button onclick="window.location = 'index.html'" class="back-btn">Back to Main</button>
      </div>
    </div>
  `;
  
  const newObtained = JSON.parse(sessionStorage.getItem("newObtained") || "[]");
  const allObtained = JSON.parse(localStorage.getItem("obtained") || "[]");
  
  const newCardsContainer = document.getElementById("new-cards");
  const allCardsContainer = document.getElementById("all-cards");
  
  // Display new cards
  newObtained.forEach(player => {
    const card = makeCard(player);
    newCardsContainer.appendChild(card);
  });
  
  // Display all cards
  allObtained.forEach(player => {
    const card = makeCard(player);
    allCardsContainer.appendChild(card);
  });
  
  // Clear the session storage
  sessionStorage.removeItem("newObtained");
}

// Add CSS for new features
const additionalStyles = `
  .game-mode-btn {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    margin: 10px;
    font-weight: bold;
  }
  
  .game-mode-btn.arcade {
    background: #ff4444;
  }
  
  .arcade-glow {
    box-shadow: 0 0 30px #ff4444, 0 0 60px #ff4444;
  }
  
  .arcade-celebration {"
    animation: pulse 0.5s infinite;
  }
  
  @keyframes pulse {
    0% { transform: translateX(-50%) scale(1); }
    50% { transform: translateX(-50%) scale(1.1); }
    100% { transform: translateX(-50%) scale(1); }
  }
  
  .back-btn {
    background: #2196F3;
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 8px;
    font-size: 1.2em;
    cursor: pointer;
  }
  
  .results-header {
    text-align: center;
    margin-bottom: 30px;
  }
  
  .mode-indicator {
    display: inline-block;
    background: ${currentMode === 'arcade' ? '#ff4444' : '#4CAF50'};
    color: white;
    padding: 5px 15px;
    border-radius: 20px;
    font-weight: bold;
    margin-top: 10px;
  }
  
  .player-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border: 1px solid #ddd;
    margin: 5px 0;
    border-radius: 5px;
  }
  
  .player-info {
    flex: 1;
  }
  
  .skill-tag {
    display: inline-block;
    background: #2196F3;
    color: white;
    padding: 2px 8px;
    margin: 2px;
    border-radius: 10px;
    font-size: 0.8em;
  }
  
  .skills-selection select {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px;
  }
  
  .selected-skills {
    min-height: 30px;
  }
  
  .upload-btn {
    display: inline-block;
    background: #4CAF50;
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    text-align: center;
    margin-bottom: 10px;
  }
  
  .upload-btn:hover {
    background: #45a049;
  }
  
  .image-upload-container {
    border: 1px solid #ddd;
    padding: 15px;
    border-radius: 5px;
  }
  
  .upload-options {
    margin-bottom: 15px;
  }
  
  .image-preview {
    min-height: 100px;
    border: 1px dashed #ddd;
    padding: 10px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);