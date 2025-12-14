// Players with logos
let helid = localStorage.getItem("unk1");
let mainPlayers = JSON.parse(localStorage.getItem('customPlayers') || '[]');
if (mainPlayers.length === 0) {
  mainPlayers = [
    { name:"Marco Van Basten", position:"CF", overall:105, photo:"vanbas.jpg", bg:"epic.jpg", skills:["Phenomenal Finishing"], team:"acmilan.png" },
    { name:"Andriy Shevshenko", position:"CF", overall:106, photo:"sheva.jpg", bg:"epic.jpg", skills:["Phenomenal Finishing "], team:"acmilan.png" },
  { name:"Eric Cantona", position:"CF", overall:106, photo:"cantona.jpg", bg:"epic.jpg", skills:["Phenomenal Finishing"], team:"manutd.png" },
  { name:"Nemanja Vidic", position:"CB", overall:108, photo:"vidic.jpg", bg:"epic.jpg", skills:["Long Reach Tackle","Wall Power"], team:"manutd.png"},
    { name:"Robert Lewandowski", position:"CF", overall:106, photo:"lewan.jpg", bg:"epic.jpg", skills:["Phenomenal Finishing"], team:"bayern.png"},
    { name:"Karl-Heinz Rummenigge", position:"CF", overall:105, photo:"rummi.jpg", bg:"epic.jpg", skills:["Phenomenal Finishing"], team:"bayern.png" },
    { name:"Carles Puyol", position:"CB", overall:105, photo:"puyol.jpg", bg:"epic.jpg", skills:["Long Reach Tackle"], team:"barca.png"},
   { name:"Rivaldo", position:"AMF", overall:106, photo:"rivaldo.jpg", bg:"epic.jpg", skills:["Phenomenal Pass"], team:"barca.png"},
  ];
  localStorage.setItem('customPlayers', JSON.stringify(mainPlayers));
}

// Available teams with proper logos
const availableTeams = [
  { name: "Manchester United", logo: "manutd.png" },
  { name: "Chelsea", logo: "chelsea.png" },
  { name: "Bayern Munich", logo: "bayern.png" },
  { name: "Tottenham", logo: "tottenham.png" },
  { name: "Liverpool", logo: "liverpool.png" },
  { name: "AC Milan", logo: "acmilan.png" },
  { name: "Manchester City", logo: "mancity.png" },
  { name: "Arsenal", logo: "arsenal.png" },
  { name: "Real Madrid", logo: "rmadrid.png" },
  { name: "Barcelona", logo: "barca.png" },
  { name: "PSG", logo: "psg.png" },
  { name: "Inter Milan", logo: "inter.png" },
  { name: "Juventus", logo: "juventus.png" },
  { name: "Dortumund", logo: "brossia.png" },
  { name: "Ataletico", logo: "amadrid.png" }
];

// Available skills
const availableSkills = [
  "Phenomenal Finishing",
  "Phenomenal Pass",
  "Blitz Curler",
  "Edged Crossing",
  "Visionary Pass",
  "Fortress",
  "Long Reach Tackle",
  "Momentum Dribbling",
  "Mr Save",
  "Aerial Fort",
"Low Screamer",
"Wall Power"
];

// Use only mainPlayers since unknownPlayers has been removed
const allPlayers = [...mainPlayers];

// Fix image path function for mobile files
function fixImagePath(path) {
  if (!path) return "unin.jpg";
  
  console.log("Original path:", path);
  
  // If it's already a simple filename, return it
  if (!path.includes('/') && !path.includes('\\') && !path.startsWith('file:') && !path.startsWith('content:') && !path.startsWith('blob:')) {
    return path;
  }
  
  // Handle mobile file paths - extract just the filename
  if (path.includes('/')) {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    
    // Clean up the filename (remove any parameters or extra stuff)
    const cleanFilename = filename.split('?')[0].split(':')[0];
    
    if (cleanFilename && cleanFilename.includes('.') && !cleanFilename.startsWith('.')) {
      console.log("Extracted filename:", cleanFilename);
      return cleanFilename;
    }
  }
  
  // Handle file:// paths
  if (path.startsWith('file://')) {
    const decodedPath = decodeURIComponent(path);
    const parts = decodedPath.split('/');
    const filename = parts[parts.length - 1];
    const cleanFilename = filename.split('?')[0];
    if (cleanFilename && cleanFilename.includes('.') && !cleanFilename.startsWith('.')) {
      console.log("Extracted from file://:", cleanFilename);
      return cleanFilename;
    }
  }
  
  // Handle content:// paths (Android content URIs)
  if (path.startsWith('content://')) {
    // For content URIs, we need to use the blob URL we created
    // Return a generic name since we can't extract filename easily
    return "mobile_photo.jpg";
  }
  
  // Handle blob URLs - these are temporary, so we need to store them properly
  if (path.startsWith('blob:')) {
    return "uploaded_photo.jpg";
  }
  
  // Fallback
  return "unin.jpg";
}

// Store uploaded images in localStorage
function storeImageInLocalStorage(imageKey, base64Data) {
  try {
    // Store base64 image in localStorage
    localStorage.setItem(imageKey, base64Data);
    return imageKey; // Return the key to reference the image
  } catch (e) {
    console.error("Error storing image:", e);
    return "unin.jpg";
  }
}

// Get image from localStorage
function getImageFromLocalStorage(imageKey) {
  if (imageKey && imageKey.startsWith('localStorageImage_')) {
    return localStorage.getItem(imageKey) || "unin.jpg";
  }
  return imageKey; // Return as-is if it's not a stored image
}

// Make card
function makeCard(p){
  const card=document.createElement("article");
  if(mainPlayers.some(mp=>mp.name===p.name)){ card.className="epic-card epic"; }
  else{ card.className="low-card low"; }

  const skillsHtml = (p.skills && p.skills.length) ? p.skills.map(s=>`<div class="skill">${s}</div>`).join("") : "";
  const history = JSON.parse(localStorage.getItem("obtained")||"[]");
  const isObtained = history.some(h=>h.name===p.name);
  const bgStyle = isObtained ? "filter: brightness(0.4)" : "filter: brightness(1)";
  
  // Fix photo and team paths
  const fixedPhoto = fixImagePath(p.photo);
  const fixedTeam = fixImagePath(p.team);
  
  // Check if photo is stored in localStorage
  let photoSrc = fixedPhoto;
  if (fixedPhoto.startsWith('localStorageImage_')) {
    const storedImage = getImageFromLocalStorage(fixedPhoto);
    photoSrc = storedImage;
  }
  
  // team logo
  const teamHtml = fixedTeam ? `<div class="team"><img src="${fixedTeam}" alt="team logo" onerror="this.style.display='none'"></div>` : "";

  card.innerHTML=`
    <div class="card-bg" style="${bgStyle}"></div>
    <div style="${bgStyle}" class="skills ${!skillsHtml?'hide':''}">${skillsHtml}</div>
    <div style="${bgStyle}" class="badge">
      <div class="rating">${p.overall}</div>
      <div class="pos">${p.position}</div>
      ${teamHtml}
    </div>
    <div class="photo"><img src="${photoSrc}" style="${bgStyle}" alt="${p.name}" onerror="this.src='unin.jpg'"></div>
    <div style="${bgStyle}" class="name">${p.name}</div>
  <div class="hos"> <img src="hos.png"></img></div>
  `;
  
  // Add click event to the card
  card.style.cursor = 'pointer';
  card.addEventListener('click', function() {
    viewPlayerCard(p);
  });
  
  return card;
}

// Initial display
const container=document.getElementById("cards");
mainPlayers.forEach(p=>container.appendChild(makeCard(p)));

function viewPlayerCard(player) {
    // Store player data in sessionStorage for the viewcard.html page
    sessionStorage.setItem('playerView', JSON.stringify(player));
    // Navigate to viewcard.html
    window.location.href = 'viewcard.html';
}

// Add click event listeners to all player cards
function addCardClickEvents() {
    const cards = document.querySelectorAll('.epic-card, .low-card');
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
            // Find the player data for this card
            const playerName = this.querySelector('.name').textContent;
            const player = allPlayers.find(p => p.name === playerName);
            if (player) {
                viewPlayerCard(player);
            }
        });
    });
}

// Initialize card click events when page loads
document.addEventListener('DOMContentLoaded', function() {
    addCardClickEvents();
});

function resetGame(){
  let confirms3 = confirm("Reset all data? Coins and history will be cleared!");
  if(confirms3){
    localStorage.clear(); 
    sessionStorage.clear();
    location.reload(); 
  }
}