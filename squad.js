import { formations } from './formations.js';
import { allplayers } from './mainplayers.js';
import { hagag } from './logic.js';

let playersData = allplayers;

let state = {
    gameplanes: JSON.parse(localStorage.getItem('gameplanes')) || { "my-gameplane": {} },
    currentgameplane: localStorage.getItem("currentgameplane") || "my-gameplane",
    draggedPlayerId: null,
    sourceSlotId: null,          // "pitch" slot id or "bench"
    sourceBenchIndex: null,      // index within bench array
    sourceBenchArray: null,      // 'subs' or 'reserves'
    benchActive: false
};

if (!state.gameplanes[state.currentgameplane]) {
    state.gameplanes[state.currentgameplane] = {};
}
state.squad = state.gameplanes[state.currentgameplane];

// separate arrays for substitutes and reserves
state.squad.formation = state.squad.formation || "4-3-3";
state.squad.subs = state.squad.subs || [];       // first 12 slots (fixed slots)
state.squad.reserves = state.squad.reserves || []; // extra players
// pitch slots remain stored keyed by slot.id, e.g. state.squad['cb1'] = player

const canvas = document.getElementById('chem-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const pitch = document.getElementById('pitch');
const bench = document.getElementById('bench');
const benchBtn = document.getElementById('toggle-bench-btn');

const App = {
    popup: null,

    init() {
        this.createPopup();
        this.initFormationOptions();
        this.resizeCanvas();
        this.bindEvents();
        this.render();
        window.addEventListener('resize', () => this.resizeCanvas());

        // open bench when dragging near left
        document.addEventListener('dragover', (e) => {
            if (!bench) return;
            if (state.draggedPlayerId) {
                if (e.clientX < 80) bench.classList.add('active');
                else if (e.clientX > 350) bench.classList.remove('active');
            }
        });

        // CLEANUP: handle dragend (mouse) and touchend (mobile) to remove lingering classes and reset state
        document.addEventListener('dragend', (e) => {
            // reset state
            state.draggedPlayerId = null;
            state.sourceSlotId = null;
            state.sourceBenchIndex = null;
            state.sourceBenchArray = null;

            // hide popup and bench UI
            this.hidePopup();

            // remove any lingering drop-zone visuals
            document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'));

            // remove "dragging" class from any element left with it
            document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        });

        // touchend cleanup for touch devices
        document.addEventListener('touchend', (e) => {
            state.draggedPlayerId = null;
            state.sourceSlotId = null;
            state.sourceBenchIndex = null;
            state.sourceBenchArray = null;
            this.hidePopup();
            document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'));
            document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
        });
    },

    createPopup() {
        let existing = document.getElementById('drag-popup');
        if (existing) { this.popup = existing; return; }
        const popup = document.createElement('div');
        popup.id = 'drag-popup';
        popup.style.position = 'fixed';
        popup.style.padding = '6px 10px';
        popup.style.background = 'rgba(0,0,0,0.8)';
        popup.style.color = '#fff';
        popup.style.borderRadius = '6px';
        popup.style.fontSize = '12px';
        popup.style.pointerEvents = 'none';
        popup.style.display = 'none';
        popup.style.zIndex = 9999;
        popup.style.whiteSpace = 'nowrap';
        document.body.appendChild(popup);
        this.popup = popup;
    },

    showPopup(msg, e) {
        if (!this.popup) return;
        this.popup.innerText = msg;
        const offsetX = 12, offsetY = 12;
        const pageX = (e && (e.pageX || e.clientX)) ? (e.pageX || e.clientX) : (window.innerWidth / 2);
        const pageY = (e && (e.pageY || e.clientY)) ? (e.pageY || e.clientY) : (window.innerHeight / 2);
        const maxLeft = window.innerWidth - 200;
        const left = Math.min(pageX + offsetX, maxLeft);
        const top = Math.min(pageY + offsetY, window.innerHeight - 40);
        this.popup.style.left = left + 'px';
        this.popup.style.top = top + 'px';
        this.popup.style.display = 'block';
    },

    hidePopup() { if (!this.popup) return; this.popup.style.display = 'none'; },

    initFormationOptions() {
        const chooser = document.getElementById("formation-chooser");
        if (!chooser) return;
        chooser.innerHTML = '';
        Object.keys(formations).forEach(key => {
            let op = document.createElement("option");
            op.value = key;
            op.selected = key === state.squad.formation;
            op.innerText = `FORMATION: ${key}`;
            chooser.appendChild(op);
        });
    },

    resizeCanvas() {
        if (!canvas || !pitch) return;
        canvas.width = pitch.clientWidth;
        canvas.height = pitch.clientHeight;
        this.drawLines();
    },

    bindEvents() {
        const chooser = document.getElementById('formation-chooser');
        if (chooser) chooser.onchange = (e) => { state.squad.formation = e.target.value; this.saveAndRefresh(); };

        const autoBtn = document.getElementById('auto-build-btn');
        if (autoBtn) autoBtn.onclick = () => this.autoBuildSquad();

        if (benchBtn && bench) benchBtn.onclick = () => bench.classList.toggle('active');

        if (bench) {
            bench.ondragover = (e) => { e.preventDefault(); this.showPopup("Drop to add to bench", e); };
            bench.ondrop = (e) => {
                e.preventDefault(); this.hidePopup();

                // default drop to reserves if generic bench area drop
                if (state.sourceSlotId && state.sourceSlotId !== "bench") {
                    // pitch -> reserves (append)
                    const player = state.squad[state.sourceSlotId];
                    if (player) {
                        delete state.squad[state.sourceSlotId];
                        state.squad.reserves.push(player);
                    }
                } else if (state.draggedPlayerId && !state.sourceSlotId) {
                    // player list -> reserves
                    if (!state.squad.reserves.some(p => p.id === state.draggedPlayerId)) {
                        const player = playersData.find(p => p.id === state.draggedPlayerId);
                        if (player) state.squad.reserves.push(player);
                    }
                }
                if (bench) bench.classList.remove('active');
                this.saveAndRefresh();
            };
        }
    },

    saveAndRefresh() {
        state.gameplanes[state.currentgameplane] = state.squad;
        localStorage.setItem('gameplanes', JSON.stringify(state.gameplanes));
        localStorage.setItem('currentgameplane', state.currentgameplane);
        this.render();
    },

    render() {
        this.renderPitch();
        this.renderBench();
        this.updateStats();
    },

    renderPitch() {
        if (!pitch) return;
        pitch.querySelectorAll('.slot').forEach(s => s.remove());
        const formation = formations[state.squad.formation];
        if (!formation) return;
        const self = this;

        formation.forEach(pos => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.style.top = pos.top;
            slot.style.left = pos.left;
            slot.dataset.slotId = pos.id;

            slot.ondragover = function (e) {
                e.preventDefault();
                slot.classList.add('drop-zone');
                if (state.squad[pos.id]) self.showPopup("Player will be swapped!", e);
                else self.showPopup("Player can be placed here", e);
            };
            slot.ondragleave = () => { slot.classList.remove('drop-zone'); self.hidePopup(); };
            slot.ondrop = (e) => { e.preventDefault(); slot.classList.remove('drop-zone'); self.hidePopup(); self.handleDrop(pos.id); };

            const player = state.squad[pos.id];
            if (player) {
                slot.innerHTML = this.getPlayerHTML(player, pos.role);
                const card = slot.querySelector('.player');
                if (card) {
                    card.ondragstart = (e) => {
                        state.draggedPlayerId = player.id;
                        state.sourceSlotId = pos.id;
                        state.sourceBenchIndex = null;
                        state.sourceBenchArray = null;
                        e.target.classList.add('dragging');
                        try { e.dataTransfer.setData('text/plain', player.id); } catch (err) {}
                    };
                    card.ondragend = () => {
                        // Clean up on dragend of the specific card too
                        state.draggedPlayerId = null;
                        state.sourceSlotId = null;
                        state.sourceBenchIndex = null;
                        state.sourceBenchArray = null;
                        if (bench) bench.classList.remove('active');
                        self.hidePopup();
                        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
                        document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'));
                    };
                }
            } else {
                slot.innerHTML = `<div class="empty-placeholder">${pos.role}</div>`;
            }
            pitch.appendChild(slot);
        });
        this.drawLines();
    },

    getPlayerHTML(player, role) {
        let displayOvr = player.pos && player.pos.includes && player.pos.includes(role) ? player.ovr : (Number(player.ovr || 0) - 50);
        let cc = player.pos && player.pos.includes && player.pos.includes(role) ? "#fff" : "yellow";
        const config = hagag[player.type] || {};
        const imgSrc = (player.img && player.img.startsWith && player.img.startsWith("data")) ? player.img : `players/${player.img || 'placeholder.png'}`;
        const item = config.item || { pos: { top: '0', left: '0' }, ovr: { top: '0', left: '0' }, team: { top: '0', left: '0' }, nation: { top: '0', left: '0' } };

        return `
            <div draggable="true" class="player" style="--c: #${config.color || '666'}; --s: ${config.size || '1'}; --s2: ${config.size2 || '1'};">
                <div class="hos" style="width:${config.width || '40px'}; height:${config.height || '40px'}; top:${config.top || '0'}; left:${config.left || '0'};">
                    <img src="${player.type || 'unknown'}hos.png" onerror="this.style.display='none'"/>
                </div>
                <img class="type" src="styles/${player.type || 'default'}.png" onerror="this.style.display='none'"/>
                <p class="name">${player.name || 'Unknown'}</p>
                <div class="pos" style="top:${item.pos.top}; left:${item.pos.left};"><p>${role}</p></div>
                <p class="ovr" style="top:${item.ovr.top}; left:${item.ovr.left}; color: ${cc};">${displayOvr}</p>
                <img class="team" src="teams/${player.team || 'default'}.png" style="top:${item.team.top}; left:${item.team.left};" onerror="this.style.display='none'"/>
                <img class="nation" src="nations/${player.nation || 'default'}.png" style="top:${item.nation.top}; left:${item.nation.left};" onerror="this.style.display='none'"/>
                <img class="pimg" src="${imgSrc}" onerror="this.src='players/placeholder.png'"/>
            </div>`;
    },

    renderBench() {
        if (!bench) return;
        const self = this;
        const MAX_SUBS = 12;
        const subs = state.squad.subs;
        const reserves = state.squad.reserves;

        bench.innerHTML = `
            <h2 class="bench-title">BENCH</h2>

            <div class="bench-section">
                <h3>SUBSTITUTES <span class="bench-count">${subs.length}/${MAX_SUBS}</span></h3>
                <div class="players-grid" id="bench-subs-grid"></div>
            </div>

            <div class="bench-section">
                <h3>RESERVES <span class="bench-count">${reserves.length}</span></h3>
                <div class="players-grid" id="bench-reserves-grid"></div>
            </div>
        `;

        const subsGrid = document.getElementById('bench-subs-grid');
        const reservesGrid = document.getElementById('bench-reserves-grid');

        // SUBS slots (always render MAX_SUBS slots)
        for (let i = 0; i < MAX_SUBS; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'player-card-mini';
            wrapper.dataset.benchIndex = i;
            wrapper.dataset.benchArray = 'subs';

            const player = subs[i];

            wrapper.ondragover = (e) => {
                e.preventDefault(); wrapper.classList.add('drop-zone');
                if (subs[i]) self.showPopup("Player will replace this substitute!", e);
                else self.showPopup("Player can be placed here", e);
            };
            wrapper.ondragleave = () => { wrapper.classList.remove('drop-zone'); self.hidePopup(); };
            wrapper.ondrop = (e) => { e.preventDefault(); wrapper.classList.remove('drop-zone'); self.hidePopup(); self.handleBenchDrop(i, 'subs'); };

            if (player) {
                wrapper.innerHTML = this.getPlayerHTML(player, player.pos && player.pos[0] ? player.pos[0] : 'SUB');
                const card = wrapper.querySelector('.player');
                if (card) {
                    card.ondragstart = (e) => {
                        state.draggedPlayerId = player.id;
                        state.sourceSlotId = "bench";
                        state.sourceBenchIndex = i;
                        state.sourceBenchArray = 'subs';
                        e.target.classList.add('dragging');
                        try { e.dataTransfer.setData('text/plain', player.id); } catch (err) {}
                    };
                    card.ondragend = () => {
                        state.draggedPlayerId = null;
                        state.sourceSlotId = null;
                        state.sourceBenchIndex = null;
                        state.sourceBenchArray = null;
                        wrapper.classList.remove('drop-zone');
                        self.hidePopup();
                        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
                        document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'));
                    };
                }
            } else {
                wrapper.innerHTML = `<div class="empty-placeholder bench-empty" data-bench-index="${i}" data-bench-type="sub">SUB ${i + 1}</div>`;
            }
            if (subsGrid) subsGrid.appendChild(wrapper);
        }

        // RESERVES
        reserves.forEach((player, index) => {
            const globalIndex = index;
            const wrapper = document.createElement('div');
            wrapper.className = 'bench-card-container';
            wrapper.dataset.benchIndex = globalIndex;
            wrapper.dataset.benchArray = 'reserves';

            wrapper.ondragover = (e) => {
                e.preventDefault(); wrapper.classList.add('drop-zone');
                if (state.squad.reserves[globalIndex]) self.showPopup("Player will replace this reserve player!", e);
                else self.showPopup("Player can be placed here", e);
            };
            wrapper.ondragleave = () => { wrapper.classList.remove('drop-zone'); self.hidePopup(); };
            wrapper.ondrop = (e) => { e.preventDefault(); wrapper.classList.remove('drop-zone'); self.hidePopup(); self.handleBenchDrop(globalIndex, 'reserves'); };

            wrapper.innerHTML = this.getPlayerHTML(player, player.pos && player.pos[0] ? player.pos[0] : 'RES');

            const card = wrapper.querySelector('.player');
            if (card) {
                card.ondragstart = (e) => {
                    state.draggedPlayerId = player.id;
                    state.sourceSlotId = "bench";
                    state.sourceBenchIndex = globalIndex;
                    state.sourceBenchArray = 'reserves';
                    e.target.classList.add('dragging');
                    try { e.dataTransfer.setData('text/plain', player.id); } catch (err) {}
                };
                card.ondragend = () => {
                    state.draggedPlayerId = null;
                    state.sourceSlotId = null;
                    state.sourceBenchIndex = null;
                    state.sourceBenchArray = null;
                    wrapper.classList.remove('drop-zone');
                    self.hidePopup();
                    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
                    document.querySelectorAll('.drop-zone').forEach(el => el.classList.remove('drop-zone'));
                };
            }
            if (reservesGrid) reservesGrid.appendChild(wrapper);
        });
    },

    /**
     * handleBenchDrop(targetIndex, targetArray)
     * targetArray is 'subs' or 'reserves'
     */
    handleBenchDrop(targetIndex, targetArray) {
        const subs = state.squad.subs;
        const reserves = state.squad.reserves;
        const targetArr = (targetArray === 'subs') ? subs : reserves;

        // 1) FROM pitch -> bench (sourceSlotId is pitch slot id)
        if (state.sourceSlotId && state.sourceSlotId !== "bench") {
            const sourcePlayer = state.squad[state.sourceSlotId];
            if (!sourcePlayer) return;

            // remove from pitch
            delete state.squad[state.sourceSlotId];

            if (targetArray === 'subs') {
                if (targetIndex < subs.length && subs[targetIndex]) {
                    const displaced = subs[targetIndex];
                    subs[targetIndex] = sourcePlayer;
                    // put displaced back to the pitch source slot
                    state.squad[state.sourceSlotId] = displaced;
                } else {
                    if (targetIndex <= subs.length) subs.splice(targetIndex, 0, sourcePlayer);
                    else subs.push(sourcePlayer);
                }
            } else {
                if (targetIndex < reserves.length && reserves[targetIndex]) {
                    const displaced = reserves[targetIndex];
                    reserves[targetIndex] = sourcePlayer;
                    state.squad[state.sourceSlotId] = displaced;
                } else {
                    if (targetIndex <= reserves.length) reserves.splice(targetIndex, 0, sourcePlayer);
                    else reserves.push(sourcePlayer);
                }
            }
        }

        // 2) FROM player list -> bench
        else if (state.draggedPlayerId && !state.sourceSlotId) {
            const dragged = playersData.find(p => p.id === state.draggedPlayerId);
            if (!dragged) return;

            // remove if already present in any bench array
            let idx = state.squad.subs.findIndex(p => p.id === dragged.id);
            if (idx !== -1) state.squad.subs.splice(idx, 1);
            idx = state.squad.reserves.findIndex(p => p.id === dragged.id);
            if (idx !== -1) state.squad.reserves.splice(idx, 1);

            if (targetArray === 'subs') {
                const insertAt = Math.min(targetIndex, state.squad.subs.length);
                state.squad.subs.splice(insertAt, 0, dragged);
            } else {
                const insertAt = Math.min(targetIndex, state.squad.reserves.length);
                state.squad.reserves.splice(insertAt, 0, dragged);
            }
        }

        // 3) FROM bench -> bench (reorder or move between arrays)
        else if (state.sourceSlotId === "bench" && state.sourceBenchIndex !== null && state.sourceBenchArray) {
            const srcArray = (state.sourceBenchArray === 'subs') ? state.squad.subs : state.squad.reserves;
            const srcIndex = state.sourceBenchIndex;
            const movingPlayer = srcArray[srcIndex];
            if (!movingPlayer) return;

            // Remove from source array
            srcArray.splice(srcIndex, 1);

            // If moving within same array (reorder)
            if (state.sourceBenchArray === targetArray) {
                let adjusted = targetIndex;
                if (srcIndex < targetIndex) adjusted--;
                adjusted = Math.max(0, Math.min(adjusted, targetArr.length));
                targetArr.splice(adjusted, 0, movingPlayer);
            } else {
                // moving between arrays
                if (targetIndex < targetArr.length && targetArr[targetIndex]) {
                    const displaced = targetArr[targetIndex];
                    targetArr.splice(targetIndex, 0, movingPlayer);
                    const displacedIndexAfterInsert = targetArr.indexOf(displaced);
                    if (displacedIndexAfterInsert !== -1) targetArr.splice(displacedIndexAfterInsert, 1);
                    const insertAt = Math.min(srcIndex, srcArray.length);
                    srcArray.splice(insertAt, 0, displaced);
                } else {
                    const insertAt = Math.min(targetIndex, targetArr.length);
                    targetArr.splice(insertAt, 0, movingPlayer);
                }
            }
        }

        // clean up drag state
        state.sourceBenchIndex = null;
        state.sourceBenchArray = null;
        state.sourceSlotId = null;
        state.draggedPlayerId = null;

        if (bench) bench.classList.remove('active');
        this.saveAndRefresh();
    },

    /**
     * handleDrop for pitch target
     */
    handleDrop(targetSlotId) {
        // bench -> pitch
        if (state.sourceSlotId === "bench" && state.sourceBenchIndex !== null && state.sourceBenchArray) {
            const arrayName = state.sourceBenchArray;
            const benchArr = (arrayName === 'subs') ? state.squad.subs : state.squad.reserves;
            const benchIndex = state.sourceBenchIndex;
            const benchPlayer = benchArr[benchIndex];
            if (!benchPlayer) return;

            if (state.squad[targetSlotId]) {
                // swap: pitch player goes into bench at same array/index
                const pitchPlayer = state.squad[targetSlotId];
                state.squad[targetSlotId] = benchPlayer;
                if (benchIndex < benchArr.length) benchArr.splice(benchIndex, 1, pitchPlayer);
                else benchArr.push(pitchPlayer);
            } else {
                // empty pitch: move bench player to pitch and remove from bench array
                state.squad[targetSlotId] = benchPlayer;
                benchArr.splice(benchIndex, 1);
            }

            // cleanup
            state.sourceBenchIndex = null;
            state.sourceBenchArray = null;
            state.sourceSlotId = null;
        }

        // pitch -> pitch
        else if (state.sourceSlotId && state.sourceSlotId !== "bench") {
            const sourcePlayer = state.squad[state.sourceSlotId];
            if (!sourcePlayer) return;

            if (state.squad[targetSlotId]) {
                const targetPlayer = state.squad[targetSlotId];
                state.squad[targetSlotId] = sourcePlayer;
                state.squad[state.sourceSlotId] = targetPlayer;
            } else {
                delete state.squad[state.sourceSlotId];
                state.squad[targetSlotId] = sourcePlayer;
            }
            state.sourceSlotId = null;
        }

        // player list -> pitch
        else if (state.draggedPlayerId && !state.sourceSlotId) {
            const benchIdx1 = state.squad.subs.findIndex(p => p.id === state.draggedPlayerId);
            if (benchIdx1 !== -1) state.squad.subs.splice(benchIdx1, 1);
            const benchIdx2 = state.squad.reserves.findIndex(p => p.id === state.draggedPlayerId);
            if (benchIdx2 !== -1) state.squad.reserves.splice(benchIdx2, 1);

            if (state.squad[targetSlotId]) {
                const pitchPlayer = state.squad[targetSlotId];
                state.squad.reserves.push(pitchPlayer);
            }

            const newPlayer = playersData.find(p => p.id === state.draggedPlayerId);
            if (newPlayer) state.squad[targetSlotId] = newPlayer;
            state.draggedPlayerId = null;
        }

        if (bench) bench.classList.remove('active');
        this.saveAndRefresh();
    },

    drawLines() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const formation = formations[state.squad.formation];
        if (!formation) return;

        for (let i = 0; i < formation.length; i++) {
            for (let j = i + 1; j < formation.length; j++) {
                const p1 = state.squad[formation[i].id];
                const p2 = state.squad[formation[j].id];

                if (p1 && p2) {
                    let color = (p1.team === p2.team || p1.nation === p2.nation) ? '#39ff14' : null;
                    let c2 = p1.team === p2.team;
                    let c3 = p1.nation === p2.nation;
                    let cp = null;
                 
                    if (color) {
                        if(c2) cp="#ff0099";
                       else  {cp = "#00ff66";}
                        ctx.beginPath();
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = cp;
                        const x1 = (parseFloat(formation[i].left) / 100) * canvas.width;
                        const y1 = (parseFloat(formation[i].top) / 100) * canvas.height;
                        const x2 = (parseFloat(formation[j].left) / 100) * canvas.width;
                        const y2 = (parseFloat(formation[j].top) / 100) * canvas.height;
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                }
            }
        }
    },

    autoBuildSquad() {
        const currentFormation = state.squad.formation;
        state.squad = { formation: currentFormation, subs: [], reserves: [] };

        let availablePlayers = [...playersData].sort((a, b) => b.ovr - a.ovr);
        const formationSlots = formations[currentFormation];

        formationSlots.forEach(slot => {
            let bestMatchIndex = availablePlayers.findIndex(p => p.pos.includes(slot.role));
            if (bestMatchIndex === -1) bestMatchIndex = 0;
            if (availablePlayers.length > 0) {
                state.squad[slot.id] = availablePlayers[bestMatchIndex];
                availablePlayers.splice(bestMatchIndex, 1);
            }
        });

        // fill subs up to 12
        state.squad.subs = availablePlayers.splice(0, 12);
        state.squad.reserves = availablePlayers;
        this.saveAndRefresh();
    },

    updateStats() {
        let totalOvr = 0, playerCount = 0, totalChemPoints = 0, connectionCount = 0;
        const formation = formations[state.squad.formation];
        if (!formation) return;

        formation.forEach(pos => {
            const player = state.squad[pos.id];
            if (player) {
                let effectiveOvr = player.pos && player.pos.includes(pos.role) ? Number(player.ovr) : Math.floor(Number(player.ovr || 0) / 2);
                totalOvr += effectiveOvr;
                playerCount++;
            }
        });

        const avgOvr = playerCount > 0 ? Math.round(totalOvr / (playerCount || 1)) : 0;
        const ovrEl = document.getElementById('team-ovr');
        if (ovrEl) {
            ovrEl.innerText = avgOvr;
            if (avgOvr >= 100) { ovrEl.style.color = "#39ff14"; ovrEl.style.textShadow = "0 0 15px #39ff14"; }
            else if (avgOvr >= 90) { ovrEl.style.color = "#ffd700"; ovrEl.style.textShadow = "0 0 10px #ffd700"; }
            else { ovrEl.style.color = "#ffffff"; ovrEl.style.textShadow = "none"; }
        }

        for (let i = 0; i < formation.length; i++) {
            for (let j = i + 1; j < formation.length; j++) {
                const p1 = state.squad[formation[i].id];
                const p2 = state.squad[formation[j].id];
                if (p1 && p2) {
                    connectionCount++;
                    let linkStrength = 0;
                    if (p1.team === p2.team) linkStrength += 3;
                    if (p1.nation === p2.nation) linkStrength += 1;
                    totalChemPoints += Math.min(linkStrength, 3);
                }
            }
        }

        const finalChem = connectionCount > 0 ? Math.min(Math.round((totalChemPoints / 33) * 100), 100) : 0;
        const chemEl = document.getElementById('team-chem');
        if (chemEl) { chemEl.innerText = finalChem; chemEl.style.color = finalChem > 80 ? "#39ff14" : (finalChem > 40 ? "#ffea00" : "#ff4d4d"); }

        state.squad.ovr = avgOvr;
        state.squad.chemistry = finalChem;
        state.gameplanes[state.currentgameplane] = state.squad;
        localStorage.setItem('gameplanes', JSON.stringify(state.gameplanes));
    }

};

App.init();