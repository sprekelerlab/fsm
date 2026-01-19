var FSM_VERSIONS_KEY = 'fsm:versions';
var FSM_CURRENT_KEY = 'fsm:current';
var FSM_NEXT_ID_KEY = 'fsm:nextId';
var LEGACY_BACKUP_KEY = 'fsm';

function hasLocalStorage() {
	return !!(localStorage && JSON);
}

function createBackup() {
	var backup = {
		'nodes': [],
		'links': [],
	};
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var backupNode = {
			'x': node.x,
			'y': node.y,
			'text': node.text,
			'isAcceptState': node.isAcceptState,
		};
		backup.nodes.push(backupNode);
	}
	for(var i = 0; i < links.length; i++) {
		var link = links[i];
		var backupLink = null;
		if(link instanceof SelfLink) {
			backupLink = {
				'type': 'SelfLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'anchorAngle': link.anchorAngle,
			};
		} else if(link instanceof StartLink) {
			backupLink = {
				'type': 'StartLink',
				'node': nodes.indexOf(link.node),
				'text': link.text,
				'deltaX': link.deltaX,
				'deltaY': link.deltaY,
			};
		} else if(link instanceof Link) {
			backupLink = {
				'type': 'Link',
				'nodeA': nodes.indexOf(link.nodeA),
				'nodeB': nodes.indexOf(link.nodeB),
				'text': link.text,
				'lineAngleAdjust': link.lineAngleAdjust,
				'parallelPart': link.parallelPart,
				'perpendicularPart': link.perpendicularPart,
			};
		}
		if(backupLink != null) {
			backup.links.push(backupLink);
		}
	}

	return backup;
}

function emptyBackup() {
	return {
		'nodes': [],
		'links': [],
	};
}

function cloneBackup(backup) {
	return JSON.parse(JSON.stringify(backup));
}

function applyBackup(backup) {
	nodes.length = 0;
	links.length = 0;
	selectedObject = null;
	currentLink = null;
	movingObject = false;

	if(!backup || !backup.nodes || !backup.links) {
		return;
	}

	for(var i = 0; i < backup.nodes.length; i++) {
		var backupNode = backup.nodes[i];
		var node = new Node(backupNode.x, backupNode.y);
		node.isAcceptState = backupNode.isAcceptState;
		node.text = backupNode.text;
		nodes.push(node);
	}
	for(var i = 0; i < backup.links.length; i++) {
		var backupLink = backup.links[i];
		var link = null;
		if(backupLink.type == 'SelfLink') {
			link = new SelfLink(nodes[backupLink.node]);
			link.anchorAngle = backupLink.anchorAngle;
			link.text = backupLink.text;
		} else if(backupLink.type == 'StartLink') {
			link = new StartLink(nodes[backupLink.node]);
			link.deltaX = backupLink.deltaX;
			link.deltaY = backupLink.deltaY;
			link.text = backupLink.text;
		} else if(backupLink.type == 'Link') {
			link = new Link(nodes[backupLink.nodeA], nodes[backupLink.nodeB]);
			link.parallelPart = backupLink.parallelPart;
			link.perpendicularPart = backupLink.perpendicularPart;
			link.text = backupLink.text;
			link.lineAngleAdjust = backupLink.lineAngleAdjust;
		}
		if(link != null) {
			links.push(link);
		}
	}
}

function pad2(value) {
	return value < 10 ? '0' + value : '' + value;
}

function formatTimestamp(ms) {
	var date = new Date(ms);
	return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) + ' ' +
		pad2(date.getHours()) + ':' + pad2(date.getMinutes());
}

function getSavedVersions() {
	if(!hasLocalStorage()) {
		return [];
	}
	var raw = localStorage[FSM_VERSIONS_KEY];
	if(!raw) {
		return [];
	}
	try {
		var versions = JSON.parse(raw);
		return Array.isArray(versions) ? versions : [];
	} catch(e) {
		localStorage[FSM_VERSIONS_KEY] = '';
		return [];
	}
}

function setSavedVersions(versions) {
	if(!hasLocalStorage()) {
		return;
	}
	localStorage[FSM_VERSIONS_KEY] = JSON.stringify(versions);
}

function getCurrentVersionId() {
	if(!hasLocalStorage()) {
		return null;
	}
	return localStorage[FSM_CURRENT_KEY] || null;
}

function setCurrentVersionId(id) {
	if(!hasLocalStorage()) {
		return;
	}
	localStorage[FSM_CURRENT_KEY] = id;
}

function generateId() {
	return String(Date.now()) + '-' + Math.floor(Math.random() * 1000000);
}

function findLatestVersion(versions) {
	var latest = null;
	for(var i = 0; i < versions.length; i++) {
		if(!latest || (versions[i].createdAt || 0) > (latest.createdAt || 0)) {
			latest = versions[i];
		}
	}
	return latest;
}

function getNextAutomatNumber(versions) {
	if(!hasLocalStorage()) {
		return 1;
	}
	var raw = parseInt(localStorage[FSM_NEXT_ID_KEY], 10);
	if(!isNaN(raw) && raw > 0) {
		return raw;
	}
	var max = 0;
	for(var i = 0; i < versions.length; i++) {
		var match = /^Automat\s+(\d+)$/.exec(versions[i].name || '');
		if(match) {
			max = Math.max(max, parseInt(match[1], 10));
		}
	}
	max = Math.max(max, versions.length);
	return max + 1;
}

function consumeDefaultName(versions) {
	var next = getNextAutomatNumber(versions);
	if(hasLocalStorage()) {
		localStorage[FSM_NEXT_ID_KEY] = String(next + 1);
	}
	return 'Automat ' + next;
}

function createVersionEntry(name, backup, createdAt) {
	return {
		'id': generateId(),
		'name': name,
		'createdAt': createdAt || Date.now(),
		'backup': backup,
	};
}

function readLegacyBackup() {
	if(!hasLocalStorage()) {
		return null;
	}
	var raw = localStorage[LEGACY_BACKUP_KEY];
	if(!raw) {
		return null;
	}
	try {
		var backup = JSON.parse(raw);
		if(backup && backup.nodes && backup.links) {
			return backup;
		}
	} catch(e) {
	}
	return null;
}

function ensureCurrentVersion() {
	if(!hasLocalStorage()) {
		return null;
	}
	var versions = getSavedVersions();
	var currentId = getCurrentVersionId();
	for(var i = 0; i < versions.length; i++) {
		if(versions[i].id === currentId) {
			return versions[i];
		}
	}
	if(versions.length === 0) {
		var legacy = readLegacyBackup();
		var name = consumeDefaultName(versions);
		var entry = createVersionEntry(name, legacy || emptyBackup());
		versions.push(entry);
		setSavedVersions(versions);
		setCurrentVersionId(entry.id);
		if(legacy) {
			localStorage[LEGACY_BACKUP_KEY] = '';
		}
		return entry;
	}
	var latest = findLatestVersion(versions);
	if(latest) {
		setCurrentVersionId(latest.id);
	}
	return latest;
}

function saveBackup() {
	if(!hasLocalStorage()) {
		return;
	}
	var current = ensureCurrentVersion();
	if(!current) {
		return;
	}
	var versions = getSavedVersions();
	var backup = createBackup();
	var updated = false;
	for(var i = 0; i < versions.length; i++) {
		if(versions[i].id === current.id) {
			versions[i].backup = backup;
			updated = true;
			break;
		}
	}
	if(!updated) {
		current.backup = backup;
		versions.push(current);
		setCurrentVersionId(current.id);
	}
	setSavedVersions(versions);
}

function restoreBackup() {
	if(!hasLocalStorage()) {
		return;
	}
	var current = ensureCurrentVersion();
	if(current) {
		applyBackup(current.backup);
	}
}

function createNewAutomaton() {
	if(!hasLocalStorage()) {
		return null;
	}
	var versions = getSavedVersions();
	var entry = createVersionEntry(consumeDefaultName(versions), emptyBackup());
	versions.push(entry);
	setSavedVersions(versions);
	setCurrentVersionId(entry.id);
	return entry;
}

function renameSavedVersion(id, name) {
	if(!name || !name.trim()) {
		return null;
	}
	var versions = getSavedVersions();
	for(var i = 0; i < versions.length; i++) {
		if(versions[i].id === id) {
			versions[i].name = name.trim();
			setSavedVersions(versions);
			return versions[i];
		}
	}
	return null;
}

function getCopyName(baseName, versions) {
	var names = {};
	for(var i = 0; i < versions.length; i++) {
		names[versions[i].name] = true;
	}
	var candidate = baseName + ' (copy)';
	if(!names[candidate]) {
		return candidate;
	}
	var index = 2;
	while(names[baseName + ' (copy ' + index + ')']) {
		index += 1;
	}
	return baseName + ' (copy ' + index + ')';
}

function duplicateSavedVersion(id) {
	var versions = getSavedVersions();
	for(var i = 0; i < versions.length; i++) {
		if(versions[i].id === id) {
			var name = getCopyName(versions[i].name, versions);
			var entry = createVersionEntry(name, cloneBackup(versions[i].backup));
			versions.push(entry);
			setSavedVersions(versions);
			return entry;
		}
	}
	return null;
}

function deleteSavedVersion(id) {
	var versions = getSavedVersions();
	var filtered = [];
	var wasCurrent = id === getCurrentVersionId();
	for(var i = 0; i < versions.length; i++) {
		if(versions[i].id !== id) {
			filtered.push(versions[i]);
		}
	}
	setSavedVersions(filtered);
	if(!wasCurrent) {
		return null;
	}
	if(filtered.length === 0) {
		var entry = createNewAutomaton();
		applyBackup(entry.backup);
		return entry;
	}
	var next = findLatestVersion(filtered);
	if(next) {
		setCurrentVersionId(next.id);
		applyBackup(next.backup);
	}
	return next;
}

function loadSavedVersion(id) {
	var versions = getSavedVersions();
	for(var i = 0; i < versions.length; i++) {
		if(versions[i].id === id) {
			setCurrentVersionId(id);
			applyBackup(versions[i].backup);
			return versions[i];
		}
	}
	return null;
}
